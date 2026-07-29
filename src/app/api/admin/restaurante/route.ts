import { createAdminClient } from "@/lib/supabase/admin";
import { verificarDueno } from "@/lib/admin-auth";
import { verificarSuperAdmin } from "@/lib/dev-auth";
import { mensajeDeError } from "@/lib/supabase/errores";
import { PERSONALIZACION, guardarTolerando } from "@/lib/columnas-pendientes";
import {
  repartirCampos,
  type PayloadRestaurante,
} from "@/lib/permisos-restaurante";

/**
 * DATOS DEL RESTAURANTE DESDE EL EDITOR EN VIVO — PATCH /api/admin/restaurante
 *
 *   { slug, nombre?, eslogan?, color_primario?, header_style?, menu_layout?,
 *     portada_url?, logo_url? }
 *
 * Dos niveles de permiso, repartidos en `lib/permisos-restaurante.ts`: el dueño
 * cambia su información y el super admin además el diseño.
 *
 * Que el dueño no vea el lápiz sobre la cabecera es una cortesía de la interfaz.
 * Si construyera esta petición a mano, `repartirCampos` la rechaza igual con un
 * 403. Ocultar un botón nunca ha sido un permiso.
 */

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  try {
    const payload = (await req.json()) as PayloadRestaurante;
    const slug = payload.slug?.trim() || undefined;

    // El restaurante objetivo es el del slug recibido, NO el de la cookie de
    // selección: el editor en vivo trabaja sobre el restaurante de la URL.
    const dueno = await verificarDueno({ slug });
    if (!dueno.ok) return dueno.respuesta;

    const plataforma = await verificarSuperAdmin();

    const reparto = repartirCampos(payload, plataforma.ok);
    if (!reparto.ok) {
      return Response.json(
        {
          error: reparto.error,
          ...(reparto.estado === 403 ? { noAutorizado: true } : {}),
        },
        { status: reparto.estado },
      );
    }

    const supabase = createAdminClient();

    // Si falta la migración 010, se guarda lo que la base sí tenga y se avisa,
    // en lugar de rechazar el cambio entero.
    const { error, aviso } = await guardarTolerando(
      PERSONALIZACION,
      (fila) =>
        supabase
          .from("restaurantes")
          .update(fila as never)
          .eq("id", dueno.restauranteId),
      reparto.cambios,
    );

    if (error) throw error;
    return Response.json({ ok: true, aviso });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[admin/restaurante] PATCH:", mensaje);
    return Response.json({ error: mensaje }, { status: 500 });
  }
}
