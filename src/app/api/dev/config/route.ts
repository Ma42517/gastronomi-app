import { createAdminClient } from "@/lib/supabase/admin";
import { verificarSuperAdmin } from "@/lib/dev-auth";
import { mensajeDeError } from "@/lib/supabase/errores";
import {
  CONFIG_POR_DEFECTO,
  FUENTES,
  METODOS_PAGO,
  filaAConfig,
  type ConfigPlataforma,
  type MetodoPago,
} from "@/lib/config-plataforma";

/**
 * AJUSTES GLOBALES DE LA PLATAFORMA — lectura y escritura del super admin.
 *
 *   GET /api/dev/config  -> ajustes actuales
 *   PUT /api/dev/config   -> guardar
 *
 * La LECTURA para la app pública no pasa por aquí: la hace el navegador directo
 * a Supabase con la publishable key (hay política de lectura pública). Esta ruta
 * existe para el panel, que necesita además saber si tiene permiso de escritura.
 */

export const dynamic = "force-dynamic";

const IDS_FUENTE = new Set(FUENTES.map((f) => f.id));
const IDS_PAGO = new Set(METODOS_PAGO.map((m) => m.id));

/** Se valida contra los catálogos, no se confía en lo que llegue del cliente. */
function validar(c: Partial<ConfigPlataforma>): string | null {
  if (c.fuente !== undefined && !IDS_FUENTE.has(c.fuente)) {
    return `Tipografía desconocida: ${c.fuente}`;
  }

  if (c.pagos_habilitados !== undefined) {
    if (!Array.isArray(c.pagos_habilitados)) {
      return "Las formas de pago deben ser una lista.";
    }
    const invalido = c.pagos_habilitados.find((p) => !IDS_PAGO.has(p));
    if (invalido) return `Forma de pago desconocida: ${invalido}`;
    // Dejar la app sin ninguna forma de pago la volvería inservible.
    if (c.pagos_habilitados.length === 0) {
      return "Debe quedar al menos una forma de pago habilitada.";
    }
  }

  if (
    c.comision_pct !== undefined &&
    (!Number.isFinite(c.comision_pct) ||
      c.comision_pct < 0 ||
      c.comision_pct > 100)
  ) {
    return "La comisión debe estar entre 0 y 100.";
  }

  if (c.promo_color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(c.promo_color)) {
    return "El color de la promoción debe ir en hexadecimal, por ejemplo #7C3AED.";
  }

  // Una promoción activa sin texto sería un banner vacío en la app del cliente.
  if (c.promo_activa && !c.promo_titulo?.trim()) {
    return "Una promoción activa necesita un título.";
  }

  return null;
}

export async function GET() {
  const auth = await verificarSuperAdmin();
  if (!auth.ok) return auth.respuesta;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("plataforma_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      const mensaje = mensajeDeError(error);
      if (/does not exist|schema cache/i.test(mensaje)) {
        return Response.json(
          {
            error:
              "Falta la tabla de ajustes. Corre supabase/migrations/007_config_plataforma.sql en el SQL Editor.",
            config: CONFIG_POR_DEFECTO,
          },
          { status: 503 },
        );
      }
      throw error;
    }

    return Response.json({
      config: data
        ? filaAConfig(data as Record<string, unknown>)
        : CONFIG_POR_DEFECTO,
    });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[dev/config] GET:", mensaje);
    return Response.json({ error: mensaje }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await verificarSuperAdmin();
  if (!auth.ok) return auth.respuesta;

  try {
    const cuerpo = (await req.json()) as Partial<ConfigPlataforma>;
    const fallo = validar(cuerpo);
    if (fallo) return Response.json({ error: fallo }, { status: 400 });

    const supabase = createAdminClient();

    // `upsert` en lugar de `update`: si la fila única no existiera (base a medio
    // migrar), un update no afectaría a nada y el guardado fallaría en silencio.
    const { error } = await supabase.from("plataforma_config").upsert(
      {
        id: 1,
        fuente: cuerpo.fuente ?? CONFIG_POR_DEFECTO.fuente,
        pagos_habilitados: (cuerpo.pagos_habilitados ??
          CONFIG_POR_DEFECTO.pagos_habilitados) as MetodoPago[],
        promo_activa: cuerpo.promo_activa ?? false,
        promo_titulo: cuerpo.promo_titulo?.trim() || null,
        promo_mensaje: cuerpo.promo_mensaje?.trim() || null,
        promo_color: cuerpo.promo_color ?? CONFIG_POR_DEFECTO.promo_color,
        comision_pct: cuerpo.comision_pct ?? 0,
        dueno_puede_editar_precios: cuerpo.dueno_puede_editar_precios ?? true,
        dueno_puede_crear_platillos: cuerpo.dueno_puede_crear_platillos ?? true,
        dueno_puede_borrar_platillos: cuerpo.dueno_puede_borrar_platillos ?? true,
        dueno_puede_editar_recompensas:
          cuerpo.dueno_puede_editar_recompensas ?? true,
      } as never,
      { onConflict: "id" },
    );

    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[dev/config] PUT:", mensaje);
    return Response.json({ error: mensaje }, { status: 500 });
  }
}
