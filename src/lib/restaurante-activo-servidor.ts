import { cookies } from "next/headers";
import { RESTAURANTE_SLUG } from "@/lib/supabase/config";
import { COOKIE_RESTAURANTE, slugDeCookie } from "@/lib/restaurante-activo";

/**
 * Lado servidor del restaurante activo (ver `restaurante-activo.ts`).
 *
 * Va en un archivo aparte porque `next/headers` solo existe en el servidor: si
 * este import viviera junto a los ayudantes del navegador, cualquier componente
 * de cliente que importara una de esas funciones rompería la compilación.
 */

/**
 * Slug que debe administrar esta petición.
 *
 * Orden: cookie de selección primero, variable de entorno como respaldo. Así una
 * instalación de un solo restaurante sigue funcionando exactamente igual que
 * antes sin tocar nada.
 */
export function slugActivoServidor(): string {
  return slugDeCookie(cookies().get(COOKIE_RESTAURANTE)?.value) ?? RESTAURANTE_SLUG;
}
