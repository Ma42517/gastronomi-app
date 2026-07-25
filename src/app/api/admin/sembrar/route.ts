import { createAdminClient } from "@/lib/supabase/admin";
import {
  RESTAURANTE_SLUG,
  servicioConfigurado,
  supabaseConfigurado,
} from "@/lib/supabase/config";
import { platilloAUpsert } from "@/lib/restaurante-repo";
import { mensajeDeError } from "@/lib/supabase/errores";
import { TAQUERIA_EL_PRIMO } from "@/lib/mock-data";
import type { MenuItemMock } from "@/lib/mock-data";
import type { LealtadEditable } from "@/lib/restaurante-store";

/**
 * SIEMBRA / PUBLICACIÓN DEL MENÚ EN SUPABASE — solo servidor.
 *
 *   POST /api/admin/sembrar   { menu, lealtad }
 *
 * Resuelve el arranque en frío: una base recién creada está vacía, y sin esto
 * el dueño tendría que teclear los 15 platillos a mano o correr un SQL de seed.
 * Esta ruta crea la fila del restaurante si no existe y sube el menú completo
 * de un tirón.
 *
 * Es idempotente: el upsert se resuelve por (restaurante_id, slug), así que
 * volver a publicar actualiza en lugar de duplicar.
 */

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!supabaseConfigurado() || !servicioConfigurado()) {
    return Response.json(
      {
        error:
          "Supabase no está configurado en el servidor. Revisa NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.",
        configurado: false,
      },
      { status: 503 },
    );
  }

  try {
    const { menu, lealtad } = (await req.json()) as {
      menu: MenuItemMock[];
      lealtad: LealtadEditable;
    };

    if (!Array.isArray(menu) || menu.length === 0) {
      return Response.json({ error: "El menú va vacío." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const tema = TAQUERIA_EL_PRIMO.tema;

    // 1) Restaurante (crear o actualizar su configuración).
    const { data: restaurante, error: errorRest } = await supabase
      .from("restaurantes")
      .upsert(
        {
          slug: RESTAURANTE_SLUG,
          nombre: tema.nombre_restaurante,
          eslogan: tema.eslogan,
          logo_url: tema.logo_url,
          portada_url: tema.portada_url,
          color_primario: tema.color_primario,
          iniciales: tema.iniciales,
          moneda: "MXN",
          activo: true,
          sellos_para_recompensa: lealtad.sellos_para_recompensa,
          descripcion_recompensa: lealtad.descripcion_recompensa,
          imagen_premio: lealtad.imagen_premio ?? null,
        } as never,
        { onConflict: "slug" },
      )
      .select("id")
      .single();

    if (errorRest) throw errorRest;

    // 2) Menú completo. `orden` conserva la posición del array, que es la que
    //    define el orden de las secciones y del carrusel en la vista cliente.
    const filas = menu.map((item, i) => ({
      ...platilloAUpsert(item),
      restaurante_id: restaurante.id,
      orden: i,
    }));

    const { error: errorMenu } = await supabase
      .from("menu_items")
      .upsert(filas as never, { onConflict: "restaurante_id,slug" });

    if (errorMenu) throw errorMenu;

    return Response.json({ ok: true, platillos: filas.length });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[Supabase][admin/sembrar] POST:", mensaje);
    return Response.json({ error: mensaje }, { status: 500 });
  }
}
