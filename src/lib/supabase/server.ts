import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/** Forma de cada cookie que Supabase pide escribir en `setAll`. */
type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Cliente de Supabase para el servidor (Server Components, Route Handlers,
 * Server Actions). Gestiona la sesión vía cookies.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // El método `setAll` fue llamado desde un Server Component.
            // Se puede ignorar si hay middleware refrescando las sesiones.
          }
        },
      },
    },
  );
}
