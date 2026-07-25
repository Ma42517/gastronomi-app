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
  menu: MenuItemMock[];
  lealtad: LealtadEditable;
  /** Nombre, color, logo y portada del restaurante que sirve esta URL. */
  tema: TemaRestaurante;
  /** false si el dueño lo tiene oculto: se avisa en lugar de servir el menú. */
  activo: boolean;
}

/**
 * Lee un restaurante completo desde Supabase (lectura pública: publishable key
 * + RLS de solo lectura).
 *
 * El `slug` llega desde la URL (`/mesa/<slug>/<mesa>`), no de una variable de
 * entorno: es lo que permite que la misma instancia sirva a varios restaurantes.
 * Si no se pasa, se usa el configurado por defecto.
 *
 * Devuelve `null` cuando no hay nada que mostrar —sin Supabase, restaurante
 * inexistente, menú vacío o error de red—; en todos esos casos la app conserva
 * sus datos locales en lugar de dejar al comensal con una carta en blanco.
 */
export async function leerRestauranteRemoto(
  slug: string = RESTAURANTE_SLUG,
): Promise<DatosRemotos | null> {
  if (!supabaseConfigurado()) return null;

  try {
    const supabase = createClient();

    const { data: filaRest, error: errorRest } = await supabase
      .from("restaurantes")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (errorRest) throw errorRest;
    // Base aún sin sembrar (o slug que no existe): no se sobreescribe nada.
    if (!filaRest) return null;

    const restaurante = filaRest as RestauranteRow;

    const { data: filas, error: errorMenu } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurante_id", restaurante.id)
      .order("orden", { ascending: true })
      .order("created_at", { ascending: true });

    if (errorMenu) throw errorMenu;
    if (!filas || filas.length === 0) return null;

    return {
      menu: (filas as MenuItemRow[]).map(filaAPlatillo),
      lealtad: filaALealtad(restaurante),
      tema: filaATema(restaurante),
      activo: restaurante.activo,
    };
  } catch (error) {
    console.warn(
      `[Supabase] No se pudo leer el restaurante "${slug}"; se usan los datos locales.`,
      error,
    );
    return null;
  }
}
