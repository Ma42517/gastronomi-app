import { createAdminClient } from "@/lib/supabase/admin";
import {
  servicioConfigurado,
  supabaseConfigurado,
} from "@/lib/supabase/config";
import { mensajeDeError } from "@/lib/supabase/errores";

/**
 * LOS MÁS PEDIDOS DE UN RESTAURANTE — GET /api/populares?slug=…
 *
 * Devuelve los identificadores de dominio de los platillos más pedidos, para que
 * el menú del comensal pinte su sección "Más Populares".
 *
 * ⚠️ POR QUÉ ESTO ES UNA RUTA DE SERVIDOR Y NO UNA CONSULTA DEL CLIENTE
 * `orden_items` NO tiene política de lectura pública, y hace bien: contiene lo que
 * pidió cada comensal y con qué identificador, así que abrirla al navegador
 * expondría el historial de consumo de la clientela. Aquí se lee con la llave de
 * servicio y solo sale de vuelta una lista de platillos populares — nunca quién
 * pidió qué.
 *
 * NO REQUIERE AUTENTICACIÓN: es información del menú, la misma que ve cualquiera
 * que se siente en una mesa.
 *
 * CASCADA DE TRES NIVELES
 *   1. Pedidos reales (`orden_items`), que es la señal de verdad.
 *   2. `is_popular`, la marca manual del dueño, mientras no haya pedidos.
 *   3. Los primeros del menú, para que la sección no salga vacía en un
 *      restaurante recién abierto.
 */

export const dynamic = "force-dynamic";

/** Cuántos se muestran. Cuatro caben en dos filas de la cuadrícula. */
const CUANTOS = 4;

export type OrigenPopulares = "pedidos" | "marcados" | "primeros" | "sin-datos";

interface FilaMenu {
  id: string;
  slug: string | null;
  is_popular: boolean | null;
  orden: number | null;
}

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug")?.trim();

  if (!slug) {
    return Response.json({ error: "Falta el parámetro slug." }, { status: 400 });
  }

  // Sin llaves no hay nada que calcular: el menú usará su propia marca local.
  if (!supabaseConfigurado() || !servicioConfigurado()) {
    return Response.json({ populares: [], origen: "sin-datos" });
  }

  try {
    const supabase = createAdminClient();

    const { data: restaurante, error: errorRest } = await supabase
      .from("restaurantes")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (errorRest) throw errorRest;
    if (!restaurante) {
      return Response.json({ populares: [], origen: "sin-datos" });
    }

    const restauranteId = (restaurante as { id: string }).id;

    const { data: filas, error: errorMenu } = await supabase
      .from("menu_items")
      .select("id, slug, is_popular, orden")
      .eq("restaurante_id", restauranteId)
      .eq("disponible", true);

    if (errorMenu) throw errorMenu;

    const platillos = (filas ?? []) as unknown as FilaMenu[];
    if (platillos.length === 0) {
      return Response.json({ populares: [], origen: "sin-datos" });
    }

    // --- Nivel 1: pedidos reales ---
    const porPedidos = await masPedidos(supabase, platillos);
    if (porPedidos.length > 0) {
      return Response.json({ populares: porPedidos, origen: "pedidos" });
    }

    // --- Nivel 2: los que el dueño marcó a mano ---
    const marcados = platillos
      .filter((p) => p.is_popular)
      .slice(0, CUANTOS)
      .map(idDeDominio);

    if (marcados.length > 0) {
      return Response.json({ populares: marcados, origen: "marcados" });
    }

    // --- Nivel 3: los primeros del menú ---
    const primeros = [...platillos]
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
      .slice(0, 3)
      .map(idDeDominio);

    return Response.json({ populares: primeros, origen: "primeros" });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[populares] GET:", mensaje);
    // Un fallo aquí NO debe tumbar el menú: la sección simplemente no aparece.
    return Response.json({ populares: [], origen: "sin-datos", error: mensaje });
  }
}

/**
 * Suma las cantidades pedidas de cada platillo y devuelve los más vendidos.
 *
 * Se agrega en memoria porque PostgREST no hace `group by`: haría falta una vista
 * o una función SQL, y eso son más migraciones que correr a mano. Con el volumen
 * de un restaurante la diferencia es imperceptible, y cuando lo sea, este es el
 * único sitio que hay que cambiar.
 */
async function masPedidos(
  supabase: ReturnType<typeof createAdminClient>,
  platillos: FilaMenu[],
): Promise<string[]> {
  const ids = platillos.map((p) => p.id);

  const { data, error } = await supabase
    .from("orden_items")
    .select("menu_item_id, cantidad")
    .in("menu_item_id", ids);

  if (error || !data || data.length === 0) return [];

  const conteo = new Map<string, number>();
  for (const fila of data as unknown as {
    menu_item_id: string;
    cantidad: number | null;
  }[]) {
    const suma = conteo.get(fila.menu_item_id) ?? 0;
    conteo.set(fila.menu_item_id, suma + (fila.cantidad ?? 1));
  }

  const porUuid = new Map(platillos.map((p) => [p.id, p]));

  return [...conteo.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, CUANTOS)
    .map(([uuid]) => porUuid.get(uuid))
    .filter((p): p is FilaMenu => Boolean(p))
    .map(idDeDominio);
}

/**
 * El id que usa la aplicación es el `slug` ("t-pastor"), no el uuid. Se cae al
 * uuid solo si faltara, para no perder el platillo.
 */
function idDeDominio(p: FilaMenu): string {
  return p.slug ?? p.id;
}
