import { createAdminClient } from "@/lib/supabase/admin";
import { verificarSuperAdmin } from "@/lib/dev-auth";
import { mensajeDeError } from "@/lib/supabase/errores";
import { platilloAUpsert } from "@/lib/restaurante-repo";
import { MEDIA_PLATILLO, guardarTolerando } from "@/lib/columnas-pendientes";
import { CATEGORIAS_TASCA, MENU_TASCA } from "@/lib/menus/tasca-espanola";

/**
 * SIEMBRA DEL MENÚ DE LA TASCA ESPAÑOLA — POST /api/dev/sembrar-tasca
 *
 * Crea (o actualiza) el restaurante `tasca-espanola` con su carta completa:
 * cuatro secciones, doce platillos y los grupos de opciones de tamaño y extras.
 *
 * ⚠️ POR QUÉ UNA RUTA Y NO UNA MIGRACIÓN SQL
 * Los grupos de opciones viven en una columna `jsonb`, y escribirlos a mano en SQL
 * significa pegar JSON dentro de un `insert` sin que nada compruebe su forma: un
 * campo mal escrito no da error, simplemente hace que el modal del platillo salga
 * vacío en el menú del comensal. Aquí los datos pasan por los MISMOS tipos y la
 * MISMA función de escritura (`platilloAUpsert`) que usa el panel, así que si la
 * forma no cuadra, no compila.
 *
 * ES IDEMPOTENTE: el upsert se resuelve por (restaurante_id, slug), así que
 * ejecutarla dos veces actualiza en lugar de duplicar. Se puede volver a llamar
 * después de tocar el menú a mano para dejarlo como estaba.
 *
 * SOLO SUPER ADMIN: crea un restaurante entero, que es una operación de
 * plataforma.
 */

export const dynamic = "force-dynamic";

const SLUG = "tasca-espanola";

/** Identidad del restaurante, para la cabecera del menú y el directorio. */
const RESTAURANTE = {
  slug: SLUG,
  nombre: "La Tasca Española",
  eslogan: "Cocina española de siempre",
  color_primario: "#C8102E", // rojo de la bandera
  iniciales: "TE",
  moneda: "MXN",
  activo: true,
  sellos_para_recompensa: 5,
  descripcion_recompensa: "Tapa de la casa gratis",
  portada_url:
    "https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=1200&q=80",
};

export async function POST() {
  const auth = await verificarSuperAdmin();
  if (!auth.ok) return auth.respuesta;

  try {
    const supabase = createAdminClient();

    // --- 1) El restaurante ---
    // Se busca antes de escribir para no pisar lo que el dueño haya cambiado
    // (nombre, portada, color) si vuelve a sembrarse el menú más adelante.
    const { data: existente, error: errorBusca } = await supabase
      .from("restaurantes")
      .select("id")
      .eq("slug", SLUG)
      .maybeSingle();

    if (errorBusca) throw errorBusca;

    let restauranteId: string;
    let creado = false;

    if (existente) {
      restauranteId = (existente as { id: string }).id;
    } else {
      const { data, error } = await supabase
        .from("restaurantes")
        .insert(RESTAURANTE as never)
        .select("id")
        .single();

      if (error) throw error;
      restauranteId = (data as { id: string }).id;
      creado = true;
    }

    // --- 2) Las secciones y su orden ---
    // Va con tolerancia: si falta la migración 011 el menú se siembra igual y las
    // categorías se deducirán de los platillos, solo se pierde el orden elegido.
    const { aviso: avisoCategorias } = await guardarTolerando(
      { campos: ["categorias"], aviso: "orden de las secciones" },
      (fila) =>
        supabase
          .from("restaurantes")
          .update(fila as never)
          .eq("id", restauranteId),
      { categorias: CATEGORIAS_TASCA },
    );

    // --- 3) Los platillos, con sus grupos de opciones ---
    const filas = MENU_TASCA.map((item, i) => ({
      ...platilloAUpsert(item),
      restaurante_id: restauranteId,
      // El orden del array es el que decide cómo se lee la carta.
      orden: i,
    }));

    const { error: errorMenu, aviso: avisoMedia } = await guardarTolerando(
      MEDIA_PLATILLO,
      (lote) =>
        supabase
          .from("menu_items")
          .upsert(lote as never, { onConflict: "restaurante_id,slug" }),
      filas as unknown as Record<string, unknown>[],
    );

    if (errorMenu) throw errorMenu;

    const conOpciones = MENU_TASCA.filter((m) => (m.modifiers?.length ?? 0) > 0);

    return Response.json({
      ok: true,
      creado,
      slug: SLUG,
      restaurante: RESTAURANTE.nombre,
      categorias: CATEGORIAS_TASCA,
      platillos: filas.length,
      conGruposDeOpciones: conOpciones.map((m) => ({
        platillo: m.nombre,
        precioBase: m.precio,
        grupos: (m.modifiers ?? []).map((g) => ({
          titulo: g.titulo,
          obligatorio: Boolean(g.requerido),
          seleccion: g.tipo === "multi" ? "varias" : "única",
          opciones: g.opciones.map(
            (o) => `${o.nombre} (+$${o.precio_extra ?? 0})`,
          ),
        })),
      })),
      // Los avisos se acumulan: pueden faltar varias migraciones a la vez.
      avisos: [avisoCategorias, avisoMedia].filter(Boolean),
      siguiente: `Abre /mesa/${SLUG}/1 para verlo, o selecciónalo en el panel de plataforma para editarlo.`,
    });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[dev/sembrar-tasca] POST:", mensaje);
    return Response.json({ error: mensaje }, { status: 500 });
  }
}
