import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { servicioConfigurado, supabaseConfigurado } from "@/lib/supabase/config";
import { mensajeDeError } from "@/lib/supabase/errores";

/**
 * GUARDIA DE SUPER ADMIN — solo servidor.
 *
 * Protege /api/dev/*, que puede crear y BORRAR restaurantes completos. Es un
 * privilegio mayor que el de dueño, así que se comprueba por separado: ser dueño
 * de una taquería no debe dar acceso a los datos de las demás.
 *
 * Dos vías de autorización, en este orden:
 *   1. Estar en la tabla `plataforma_admins` (la vía normal).
 *   2. Estar en la variable de entorno `SUPER_ADMIN_EMAILS` (lista separada por
 *      comas). Sirve de arranque y de rescate: si la tabla no existe todavía o
 *      alguien se queda fuera por error, se recupera el acceso sin SQL.
 *
 * La variable NO lleva prefijo NEXT_PUBLIC_: se lee solo en el servidor, así la
 * lista de correos privilegiados no viaja al navegador.
 */

export interface SuperAdmin {
  ok: true;
  userId: string;
  email: string | null;
  /** Cómo se concedió el acceso, útil para depurar. */
  via: "tabla" | "variable-de-entorno";
}

export interface DevDenegado {
  ok: false;
  respuesta: Response;
}

export type ResultadoDev = SuperAdmin | DevDenegado;

function denegar(status: number, error: string, extra = {}): DevDenegado {
  return { ok: false, respuesta: Response.json({ error, ...extra }, { status }) };
}

/** Correos autorizados por variable de entorno, normalizados. */
function correosDeEntorno(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
}

export async function verificarSuperAdmin(): Promise<ResultadoDev> {
  if (!supabaseConfigurado() || !servicioConfigurado()) {
    return denegar(503, "Supabase no está configurado en el servidor.", {
      configurado: false,
    });
  }

  try {
    // `getUser()` valida el token contra Supabase; `getSession()` solo leería la
    // cookie y sería falsificable.
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return denegar(401, "Necesitas iniciar sesión.", { noAutenticado: true });
    }

    const email = user.email?.toLowerCase() ?? null;

    // --- Vía 2 primero: es una comprobación en memoria, sin ir a la base ---
    if (email && correosDeEntorno().includes(email)) {
      return { ok: true, userId: user.id, email, via: "variable-de-entorno" };
    }

    // --- Vía 1: la tabla ---
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("plataforma_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      const mensaje = mensajeDeError(error);
      if (/does not exist|schema cache/i.test(mensaje)) {
        return denegar(
          503,
          "Falta la tabla de super admins. Corre supabase/migrations/006_super_admin.sql en el SQL Editor.",
        );
      }
      throw error;
    }

    if (!data) {
      return denegar(
        403,
        `Tu cuenta (${user.email ?? "sin correo"}) no es super administradora. Regístrala con la migración 006 o añádela a SUPER_ADMIN_EMAILS.`,
        { noAutorizado: true },
      );
    }

    return { ok: true, userId: user.id, email, via: "tabla" };
  } catch (error) {
    return denegar(500, mensajeDeError(error));
  }
}

/**
 * Versión para Server Components: devuelve un booleano en lugar de una
 * `Response`, para decidir si se muestra la pantalla o el acceso a ella.
 */
export async function esSuperAdmin(): Promise<boolean> {
  const r = await verificarSuperAdmin();
  return r.ok;
}
