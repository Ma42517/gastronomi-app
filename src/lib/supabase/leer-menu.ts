"use client";

import { createClient } from "@/lib/supabase/client";
import { RESTAURANTE_SLUG, supabaseConfigurado } from "@/lib/supabase/config";
import {
  filaALealtad,
  filaAPlatillo,
  filaATema,
  type MenuItemRow,
  type RestauranteRow,
} from "@/lib/restaurante-repo";
import type { MenuItemMock, TemaRestaurante } from "@/lib/mock-data";
import type { LealtadEditable } from "@/lib/restaurante-store";

export interface DatosRemotos {
  /**
   * Platillos del restaurante. PUEDE IR VACÍO: un restaurante recién creado
   * existe pero todavía no tiene carta, y eso es un resultado legítimo, no un
   * fallo.
   */
  menu: MenuItemMock[];
  lealtad: LealtadEditable;
  /** Nombre, color, logo y portada del restaurante que sirve esta URL. */
  tema: TemaRestaurante;
  /** false si el dueño lo tiene oculto: se avisa en lugar de servir el menú. */
  activo: boolean;
}

/**
 * Resultado de la lectura, con el MOTIVO explícito cuando no hay datos.
 *
 * ⚠️ POR QUÉ ESTO NO ES UN `DatosRemotos | null`
 * Antes esta función devolvía `null` en cuatro situaciones muy distintas: sin
 * Supabase, error de red, restaurante inexistente y restaurante sin platillos.
 * Quien la llamaba no podía distinguirlas, así que aplicaba la misma regla a
 * todas —conservar los datos locales— y de ahí salía el cruce de menús: al
 * abrir un restaurante nuevo, sin platillos aún, se seguía mostrando la carta
 * completa del anterior. Aquí ya no se pierde esa información.
 */
export type ResultadoRemoto =
  /** Supabase no está configurado: la app funciona en modo demostración. */
  | { estado: "sin-supabase" }
  /** Falló la red o la consulta. Se conservan los datos locales. */
  | { estado: "error" }
  /** El slug de la URL no corresponde a ningún restaurante activo. */
  | { estado: "no-existe" }
  /** Restaurante encontrado. `datos.menu` puede estar vacío. */
  | { estado: "ok"; datos: DatosRemotos };

/**
 * Lee un restaurante completo desde Supabase (lectura pública: publishable key
 * + RLS de solo lectura).
 *
 * El `slug` llega desde la URL (`/mesa/<slug>/<mesa>`), no de una variable de
 * entorno: es lo que permite que la misma instancia sirva a varios restaurantes.
 *
 * AISLAMIENTO ENTRE RESTAURANTES
 * Las dos consultas están encadenadas por identificador y no hay ninguna lectura
 * sin filtrar: primero se resuelve el restaurante por su `slug`, y los platillos
 * se piden por el `restaurante_id` de ESA fila. Un platillo de otro negocio no
 * puede aparecer en el resultado porque nunca se pide. La RLS de Supabase añade
 * una segunda barrera del lado del servidor.
 */
export async function leerRestauranteRemoto(
  slug: string = RESTAURANTE_SLUG,
): Promise<ResultadoRemoto> {
  if (!supabaseConfigurado()) return { estado: "sin-supabase" };

  try {
    const supabase = createClient();

    const { data: filaRest, error: errorRest } = await supabase
      .from("restaurantes")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (errorRest) throw errorRest;

    // El slug no existe (o el restaurante está oculto y la RLS no lo devuelve).
    // Se informa como tal: mostrar aquí el menú de otro sería el peor resultado
    // posible, porque el comensal pediría de una carta que no es la suya.
    if (!filaRest) return { estado: "no-existe" };

    const restaurante = filaRest as RestauranteRow;

    const { data: filas, error: errorMenu } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurante_id", restaurante.id)
      .order("orden", { ascending: true })
      .order("created_at", { ascending: true });

    if (errorMenu) throw errorMenu;

    return {
      estado: "ok",
      datos: {
        // Sin platillos se devuelve una lista vacía, NO un fallo: el restaurante
        // existe y su carta está vacía de verdad.
        menu: (filas ?? []).map((f) => filaAPlatillo(f as MenuItemRow)),
        lealtad: filaALealtad(restaurante),
        tema: filaATema(restaurante),
        activo: restaurante.activo,
      },
    };
  } catch (error) {
    console.warn(
      `[Supabase] No se pudo leer el restaurante "${slug}"; se usan los datos locales.`,
      error,
    );
    return { estado: "error" };
  }
}
