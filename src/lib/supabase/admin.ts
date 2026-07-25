import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * CLIENTE ADMINISTRATIVO — SOLO SERVIDOR.
 *
 * Usa `SUPABASE_SERVICE_ROLE_KEY`, que salta Row Level Security. Es lo que
 * permite que el panel escriba en el menú sin abrir permisos de escritura al
 * rol público.
 *
 * ⚠️ NUNCA importar este módulo desde un componente de cliente ni desde un
 * archivo con "use client": la llave acabaría en el bundle del navegador y
 * cualquiera podría reescribir la base de datos completa.
 *
 * `persistSession: false` porque no hay usuario: cada petición es una operación
 * de servicio puntual y no debe arrastrar estado de sesión entre llamadas.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
