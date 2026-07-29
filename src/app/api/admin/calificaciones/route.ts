import { createAdminClient } from "@/lib/supabase/admin";
import { verificarDueno } from "@/lib/admin-auth";
import { mensajeDeError } from "@/lib/supabase/errores";

/**
 * CALIFICACIONES DEL RESTAURANTE — GET /api/admin/calificaciones
 *
 * Solo para el dueño (o un super admin). Los comentarios pueden ser duros y no
 * son información pública: un comensal no tiene por qué leer lo que escribieron
 * los demás.
 *
 * Devuelve el resumen agregado y las últimas valoraciones. El promedio y el
 * reparto por estrellas se calculan en Postgres, no en el navegador: traer miles
 * de filas para promediarlas en el cliente no escala.
 */

export const dynamic = "force-dynamic";

/** Cuántas valoraciones recientes se muestran en el panel. */
const LIMITE = 30;

export async function GET() {
  const auth = await verificarDueno();
  if (!auth.ok) return auth.respuesta;

  try {
    const supabase = createAdminClient();

    const [resumenRes, listaRes] = await Promise.all([
      supabase.rpc("resumen_calificaciones", {
        p_restaurante: auth.restauranteId,
      }),
      supabase
        .from("calificaciones")
        .select("id, mesa, estrellas, etiquetas, comentario, propina, created_at")
        .eq("restaurante_id", auth.restauranteId)
        .order("created_at", { ascending: false })
        .limit(LIMITE),
    ]);

    if (resumenRes.error) throw resumenRes.error;
    if (listaRes.error) throw listaRes.error;

    // La función devuelve una tabla de una sola fila.
    const resumen = Array.isArray(resumenRes.data)
      ? resumenRes.data[0]
      : resumenRes.data;

    return Response.json({
      resumen: resumen ?? {
        total: 0,
        promedio: 0,
        cinco: 0,
        cuatro: 0,
        tres: 0,
        dos: 0,
        una: 0,
        propina_media: 0,
      },
      calificaciones: listaRes.data ?? [],
    });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[admin/calificaciones] GET:", mensaje);

    if (/does not exist|schema cache|could not find the function/i.test(mensaje)) {
      return Response.json(
        {
          error:
            "Falta la tabla de calificaciones. Corre supabase/migrations/008_calificaciones.sql en el SQL Editor.",
        },
        { status: 503 },
      );
    }

    return Response.json({ error: mensaje }, { status: 500 });
  }
}
