/**
 * Detección de la configuración de Supabase.
 *
 * La app tiene que seguir funcionando sin base de datos (demos, previews, un
 * clon recién bajado sin `.env.local`). Estos helpers permiten que cada capa
 * decida si habla con Supabase o se queda con los datos locales, en lugar de
 * reventar con "supabaseUrl is required".
 */

/** Slug del restaurante que sirve esta instancia. */
export const RESTAURANTE_SLUG =
  process.env.NEXT_PUBLIC_RESTAURANTE_SLUG?.trim() || "el-primo";

/** ¿Están las dos variables públicas necesarias para LEER de Supabase? */
export function supabaseConfigurado(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return Boolean(
    url &&
      key &&
      // El .env.local.example trae marcadores de posición; si alguien copia el
      // archivo sin rellenarlo, esto evita intentos de conexión inútiles.
      !url.includes("TU-PROYECTO") &&
      !key.startsWith("tu-"),
  );
}

/** ¿Está la llave de servicio, necesaria para ESCRIBIR? (solo servidor) */
export function servicioConfigurado(): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(key && !key.startsWith("tu-"));
}
