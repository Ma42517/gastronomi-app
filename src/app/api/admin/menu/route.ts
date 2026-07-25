import { createAdminClient } from "@/lib/supabase/admin";
import { verificarDueno } from "@/lib/admin-auth";
import { platilloAUpsert } from "@/lib/restaurante-repo";
import { mensajeDeError } from "@/lib/supabase/errores";
import type { MenuItemMock } from "@/lib/mock-data";

/**
 * ESCRITURA DEL MENÚ — solo servidor.
 *
 * El panel del dueño manda aquí sus cambios en lugar de escribir directo a
 * Supabase, porque la anon key viaja en el bundle del navegador: si tuviera
 * permiso de escritura, cualquiera podría poner el menú a $0 desde la consola.
 * Esta ruta usa la service_role key, que nunca sale del servidor.
 *
 *   POST   /api/admin/menu   { platillo }  -> crea o actualiza (upsert por slug)
 *   DELETE /api/admin/menu?slug=t-pastor   -> elimina
 *
 * AUTORIZACIÓN: cada petición pasa por `verificarDueno()`, que exige sesión
 * válida Y que ese usuario esté registrado como dueño de ESTE restaurante. La
 * comprobación se repite en cada método aunque el middleware ya proteja /admin:
 * el middleware cubre las PÁGINAS, no las llamadas directas a la API.
 */

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await verificarDueno();
  if (!auth.ok) return auth.respuesta;

  try {
    const { platillo } = (await req.json()) as { platillo: MenuItemMock };

    if (!platillo?.id || !platillo.nombre?.trim()) {
      return Response.json(
        { error: "El platillo necesita id y nombre." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const restauranteId = auth.restauranteId;

    const { error } = await supabase.from("menu_items").upsert(
      {
        ...platilloAUpsert(platillo),
        restaurante_id: restauranteId,
      } as never,
      // El upsert se resuelve por (restaurante_id, slug), que es el índice único
      // que crea la migración 001. Sin esto, cada guardado insertaría un
      // duplicado en lugar de actualizar.
      { onConflict: "restaurante_id,slug" },
    );

    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[Supabase][admin/menu] POST:", mensaje);
    return Response.json({ error: mensaje }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await verificarDueno();
  if (!auth.ok) return auth.respuesta;

  try {
    const slug = new URL(req.url).searchParams.get("slug");
    if (!slug) {
      return Response.json({ error: "Falta el parámetro slug." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("menu_items")
      .delete()
      .eq("restaurante_id", auth.restauranteId)
      .eq("slug", slug);

    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[Supabase][admin/menu] DELETE:", mensaje);
    return Response.json({ error: mensaje }, { status: 500 });
  }
}
