import { createAdminClient } from "@/lib/supabase/admin";
import {
  RESTAURANTE_SLUG,
  servicioConfigurado,
  supabaseConfigurado,
} from "@/lib/supabase/config";
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
  if (!supabaseConfigurado() || !servicioConfigurado()) {
    return Response.json(
      {
        error:
          "Supabase no está configurado en el servidor. Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.",
        configurado: false,
      },
      { status: 503 },
    );
  }

  try {
    const { lealtad } = (await req.json()) as { lealtad: LealtadEditable };

    const sellos = Number(lealtad?.sellos_para_recompensa);
    if (!Number.isInteger(sellos) || sellos < 1) {
      return Response.json(
        { error: "Los sellos para recompensa deben ser un entero mayor a 0." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("restaurantes")
      .update({
        sellos_para_recompensa: sellos,
        descripcion_recompensa: lealtad.descripcion_recompensa,
        imagen_premio: lealtad.imagen_premio ?? null,
      } as never)
      .eq("slug", RESTAURANTE_SLUG);

    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[Supabase][admin/lealtad] PUT:", mensaje);
    return Response.json({ error: mensaje }, { status: 500 });
  }
}
