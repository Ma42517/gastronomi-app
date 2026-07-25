import { createAdminClient } from "@/lib/supabase/admin";
import {
  RESTAURANTE_SLUG,
  servicioConfigurado,
  supabaseConfigurado,
} from "@/lib/supabase/config";
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
 * ⚠️ PENDIENTE DE AUTENTICACIÓN: hoy la ruta no comprueba quién llama, así que
 * cualquiera que conozca la URL puede editar el menú. Antes de exponer esto a
 * producción hay que añadir login de dueños (Supabase Auth) y validar la sesión
 * aquí. Está anotado en el README.
 */

export const dynamic = "force-dynamic";

/** Respuesta uniforme para que el cliente distinga "no configurado" de "error". */
function sinConfiguracion() {
  return Response.json(
    {
      error:
        "Supabase no está configurado en el servidor. Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.",
      configurado: false,
    },
    { status: 503 },
  );
}

/** Localiza el restaurante de esta instancia por su slug. */
async function obtenerRestauranteId(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<string> {
  const { data, error } = await supabase
    .from("restaurantes")
    .select("id")
    .eq("slug", RESTAURANTE_SLUG)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error(
      `No existe el restaurante "${RESTAURANTE_SLUG}". Usa "Publicar en Supabase" para sembrarlo.`,
    );
  }
  return data.id;
}

export async function POST(req: Request) {
  if (!supabaseConfigurado() || !servicioConfigurado()) return sinConfiguracion();

  try {
    const { platillo } = (await req.json()) as { platillo: MenuItemMock };

    if (!platillo?.id || !platillo.nombre?.trim()) {
      return Response.json(
        { error: "El platillo necesita id y nombre." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const restauranteId = await obtenerRestauranteId(supabase);

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
  if (!supabaseConfigurado() || !servicioConfigurado()) return sinConfiguracion();

  try {
    const slug = new URL(req.url).searchParams.get("slug");
    if (!slug) {
      return Response.json({ error: "Falta el parámetro slug." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const restauranteId = await obtenerRestauranteId(supabase);

    const { error } = await supabase
      .from("menu_items")
      .delete()
      .eq("restaurante_id", restauranteId)
      .eq("slug", slug);

    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[Supabase][admin/menu] DELETE:", mensaje);
    return Response.json({ error: mensaje }, { status: 500 });
  }
}
