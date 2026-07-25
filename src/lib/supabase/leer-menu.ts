"use client";

import { createClient } from "@/lib/supabase/client";
import { RESTAURANTE_SLUG, supabaseConfigurado } from "@/lib/supabase/config";
import {
  filaALealtad,
  filaAPlatillo,
  type MenuItemRow,
  type RestauranteRow,
} from "@/lib/restaurante-repo";
import type { MenuItemMock } from "@/lib/mock-data";
import type { LealtadEditable } from "@/lib/restaurante-store";

export interface DatosRemotos {
  menu: MenuItemMock[];
  lealtad: LealtadEditable;
}

/**
 * Lee el menú y la configuración de lealtad desde Supabase (lectura pública,
 * anon key + RLS de solo lectura).
 *
 * Devuelve `null` en tres casos, y en los tres la app se queda con sus datos
 * locales en lugar de mostrar un menú vacío:
 *   - Supabase no está configurado (sin `.env.local`).
 *   - El restaurante no existe todavía en la base (falta sembrar).
 *   - Error de red o de permisos.
 */
export async function leerRestauranteRemoto(): Promise<DatosRemotos | null> {
  if (!supabaseConfigurado()) return null;

  try {
    const supabase = createClient();

    const { data: filaRest, error: errorRest } = await supabase
      .from("restaurantes")
      .select("*")
      .eq("slug", RESTAURANTE_SLUG)
      .maybeSingle();

    if (errorRest) throw errorRest;
    // Base aún sin sembrar: no se sobreescribe el menú local con nada.
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
    };
  } catch (error) {
    console.warn(
      "[Supabase] No se pudo leer el menú remoto; se usan los datos locales.",
      error,
    );
    return null;
  }
}
