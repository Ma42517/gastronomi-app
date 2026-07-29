import { createAdminClient } from "@/lib/supabase/admin";
import { verificarDueno } from "@/lib/admin-auth";
import { verificarSuperAdmin } from "@/lib/dev-auth";
import { bloqueado, leerConfigServidor } from "@/lib/candados";
import { mensajeDeError } from "@/lib/supabase/errores";
import type { LealtadEditable } from "@/lib/restaurante-store";

/**
 * ESCRITURA DEL PROGRAMA DE LEALTAD — solo servidor.
 *
 *   PUT /api/admin/lealtad   { lealtad }
 *
 * Guarda la META y el PREMIO en la fila del restaurante. El progreso de cada
 * comensal NO se toca aquí: vive en `transacciones_lealtad`, porque es por
 * cliente y no por restaurante.
 */

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  try {
    // El cuerpo se lee antes de autorizar: trae el restaurante objetivo, que
    // desde el editor en vivo es el de la URL y no el de la cookie.
    const { lealtad, restauranteSlug } = (await req.json()) as {
      lealtad: LealtadEditable;
      restauranteSlug?: string;
    };

    const auth = await verificarDueno({ slug: restauranteSlug });
    if (!auth.ok) return auth.respuesta;

    const sellos = Number(lealtad?.sellos_para_recompensa);
    if (!Number.isInteger(sellos) || sellos < 1) {
      return Response.json(
        { error: "Los sellos para recompensa deben ser un entero mayor a 0." },
        { status: 400 },
      );
    }

    // El super admin está exento: los candados son suyos.
    const plataforma = await verificarSuperAdmin();
    if (!plataforma.ok) {
      const config = await leerConfigServidor();
      if (!config.dueno_puede_editar_recompensas) {
        return bloqueado("No puedes cambiar el programa de recompensas.");
      }
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("restaurantes")
      .update({
        sellos_para_recompensa: sellos,
        descripcion_recompensa: lealtad.descripcion_recompensa,
        imagen_premio: lealtad.imagen_premio ?? null,
      } as never)
      .eq("id", auth.restauranteId);

    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[Supabase][admin/lealtad] PUT:", mensaje);
    return Response.json({ error: mensaje }, { status: 500 });
  }
}
