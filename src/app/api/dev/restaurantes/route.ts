import { createAdminClient } from "@/lib/supabase/admin";
import { verificarSuperAdmin } from "@/lib/dev-auth";
import { mensajeDeError } from "@/lib/supabase/errores";

/**
 * GESTIÓN DE RESTAURANTES DE LA PLATAFORMA — solo super admin.
 *
 *   GET    /api/dev/restaurantes                  -> lista con conteos
 *   POST   /api/dev/restaurantes                  -> crear
 *   PATCH  /api/dev/restaurantes                  -> editar
 *   DELETE /api/dev/restaurantes?id=…&confirmar=slug -> borrar
 *
 * Toda petición pasa por `verificarSuperAdmin()`. Estas operaciones son de otro
 * orden que las del panel del dueño: aquí se puede borrar un restaurante con su
 * menú y su historial completo.
 */

export const dynamic = "force-dynamic";

/** Campos que el super admin puede escribir. */
interface RestaurantePayload {
  id?: string;
  slug: string;
  nombre: string;
  eslogan?: string | null;
  color_primario?: string;
  iniciales?: string | null;
  portada_url?: string | null;
  logo_url?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  moneda?: string;
  activo?: boolean;
  sellos_para_recompensa?: number;
  descripcion_recompensa?: string | null;
  imagen_premio?: string | null;
}

/**
 * El slug vive en la URL pública (`/mesa/<slug>/4`), así que se normaliza en
 * lugar de confiar en lo que se teclee: sin acentos, sin espacios y en
 * minúsculas. Un slug con una "ñ" o un espacio produciría enlaces roebles.
 */
function normalizarSlug(valor: string): string {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function validar(p: RestaurantePayload): string | null {
  if (!p.nombre?.trim()) return "El nombre es obligatorio.";
  if (!normalizarSlug(p.slug ?? "")) {
    return "El identificador (slug) es obligatorio y debe tener letras o números.";
  }
  if (
    p.sellos_para_recompensa !== undefined &&
    (!Number.isInteger(p.sellos_para_recompensa) ||
      p.sellos_para_recompensa < 1)
  ) {
    return "Las visitas para la recompensa deben ser un entero mayor a 0.";
  }
  if (p.color_primario && !/^#[0-9a-fA-F]{6}$/.test(p.color_primario)) {
    return "El color debe ir en formato hexadecimal, por ejemplo #DC2626.";
  }
  return null;
}

/** Convierte el payload en fila de base de datos, con valores por defecto. */
function aFila(p: RestaurantePayload) {
  return {
    slug: normalizarSlug(p.slug),
    nombre: p.nombre.trim(),
    eslogan: p.eslogan?.trim() || null,
    color_primario: p.color_primario || "#DC2626",
    // Iniciales de respaldo cuando no hay logo: se derivan del nombre.
    iniciales:
      p.iniciales?.trim().slice(0, 3).toUpperCase() ||
      p.nombre
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((palabra) => palabra[0]?.toUpperCase() ?? "")
        .join(""),
    portada_url: p.portada_url?.trim() || null,
    logo_url: p.logo_url?.trim() || null,
    direccion: p.direccion?.trim() || null,
    telefono: p.telefono?.trim() || null,
    moneda: p.moneda?.trim() || "MXN",
    activo: p.activo ?? true,
    sellos_para_recompensa: p.sellos_para_recompensa ?? 5,
    descripcion_recompensa: p.descripcion_recompensa?.trim() || "Premio sorpresa",
    imagen_premio: p.imagen_premio || null,
  };
}

// ---------------------------------------------------------------------------
// GET — listado
// ---------------------------------------------------------------------------
export async function GET() {
  const auth = await verificarSuperAdmin();
  if (!auth.ok) return auth.respuesta;

  try {
    const supabase = createAdminClient();

    const { data: restaurantes, error } = await supabase
      .from("restaurantes")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Los conteos se agregan en memoria en lugar de con subconsultas anidadas:
    // son dos consultas planas y evita depender de que las relaciones estén
    // declaradas en los tipos generados.
    const [{ data: platillos }, { data: duenos }] = await Promise.all([
      supabase.from("menu_items").select("restaurante_id, disponible"),
      supabase.from("restaurante_usuarios").select("restaurante_id"),
    ]);

    const lista = (restaurantes ?? []).map((r) => {
      const fila = r as { id: string } & Record<string, unknown>;
      const propios = (platillos ?? []).filter(
        (p) => (p as { restaurante_id: string }).restaurante_id === fila.id,
      );
      return {
        ...fila,
        total_platillos: propios.length,
        total_agotados: propios.filter(
          (p) => (p as { disponible: boolean }).disponible === false,
        ).length,
        total_duenos: (duenos ?? []).filter(
          (d) => (d as { restaurante_id: string }).restaurante_id === fila.id,
        ).length,
      };
    });

    return Response.json({ restaurantes: lista, via: auth.via });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[dev/restaurantes] GET:", mensaje);
    return Response.json({ error: mensaje }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — crear
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  const auth = await verificarSuperAdmin();
  if (!auth.ok) return auth.respuesta;

  try {
    const payload = (await req.json()) as RestaurantePayload;
    const fallo = validar(payload);
    if (fallo) return Response.json({ error: fallo }, { status: 400 });

    const supabase = createAdminClient();
    const fila = aFila(payload);

    // Se comprueba el slug antes de insertar para poder dar un mensaje claro:
    // el error de restricción única de Postgres no le dice nada a nadie.
    const { data: existente } = await supabase
      .from("restaurantes")
      .select("id")
      .eq("slug", fila.slug)
      .maybeSingle();

    if (existente) {
      return Response.json(
        { error: `Ya existe un restaurante con el identificador "${fila.slug}".` },
        { status: 409 },
      );
    }

    const { data, error } = await supabase
      .from("restaurantes")
      .insert(fila as never)
      .select("id, slug")
      .single();

    if (error) throw error;

    return Response.json({ ok: true, restaurante: data });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[dev/restaurantes] POST:", mensaje);
    return Response.json({ error: mensaje }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH — editar
// ---------------------------------------------------------------------------
export async function PATCH(req: Request) {
  const auth = await verificarSuperAdmin();
  if (!auth.ok) return auth.respuesta;

  try {
    const payload = (await req.json()) as RestaurantePayload;
    if (!payload.id) {
      return Response.json({ error: "Falta el id del restaurante." }, { status: 400 });
    }
    const fallo = validar(payload);
    if (fallo) return Response.json({ error: fallo }, { status: 400 });

    const supabase = createAdminClient();
    const fila = aFila(payload);

    // El slug no puede chocar con OTRO restaurante.
    const { data: choque } = await supabase
      .from("restaurantes")
      .select("id")
      .eq("slug", fila.slug)
      .neq("id", payload.id)
      .maybeSingle();

    if (choque) {
      return Response.json(
        { error: `Otro restaurante ya usa el identificador "${fila.slug}".` },
        { status: 409 },
      );
    }

    const { error } = await supabase
      .from("restaurantes")
      .update(fila as never)
      .eq("id", payload.id);

    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[dev/restaurantes] PATCH:", mensaje);
    return Response.json({ error: mensaje }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE — borrar
// ---------------------------------------------------------------------------
export async function DELETE(req: Request) {
  const auth = await verificarSuperAdmin();
  if (!auth.ok) return auth.respuesta;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const confirmar = url.searchParams.get("confirmar");

    if (!id) {
      return Response.json({ error: "Falta el id." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: restaurante, error: errorLectura } = await supabase
      .from("restaurantes")
      .select("id, slug, nombre")
      .eq("id", id)
      .maybeSingle();

    if (errorLectura) throw errorLectura;
    if (!restaurante) {
      return Response.json({ error: "Ese restaurante no existe." }, { status: 404 });
    }

    const objetivo = restaurante as { slug: string; nombre: string };

    // DOBLE CONFIRMACIÓN: el cliente debe reenviar el slug exacto. Un `id` en la
    // URL es fácil de disparar por accidente (o de repetir desde el historial);
    // teclear el identificador obliga a un acto deliberado. El borrado arrastra
    // en cascada el menú, las sesiones y el historial de lealtad.
    if (confirmar !== objetivo.slug) {
      return Response.json(
        {
          error: `Para borrar "${objetivo.nombre}" hay que confirmar con su identificador exacto: ${objetivo.slug}`,
        },
        { status: 428 },
      );
    }

    const { error } = await supabase.from("restaurantes").delete().eq("id", id);
    if (error) throw error;

    return Response.json({ ok: true, borrado: objetivo.slug });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[dev/restaurantes] DELETE:", mensaje);
    return Response.json({ error: mensaje }, { status: 500 });
  }
}
