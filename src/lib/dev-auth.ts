import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { COOKIE_DEV, tokenDevValido } from "@/lib/acceso-dev";
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
 * SIEMPRE se exige sesión de Supabase válida. Sobre esa base, hay tres vías de
 * elevación al privilegio de plataforma:
 *   1. Código de desbloqueo (`SUPER_ADMIN_CLAVE`) introducido en el login. Es un
 *      SEGUNDO factor: sin cuenta válida no sirve de nada.
 *   2. Estar en la variable `SUPER_ADMIN_EMAILS` (lista separada por comas).
 *   3. Estar en la tabla `plataforma_admins` (la vía persistente).
 *
 * Las variables NO llevan prefijo NEXT_PUBLIC_: se leen solo en el servidor, así
 * ni el código ni la lista de correos privilegiados viajan al navegador.
 */

export interface SuperAdmin {
  ok: true;
  userId: string;
  email: string | null;
  /** Cómo se concedió el acceso, útil para depurar. */
  via: "tabla" | "variable-de-entorno" | "codigo-plataforma";
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

    // --- Vía 3: código de desbloqueo del modo plataforma ---
    // Ya hay sesión válida comprobada arriba, así que esto es un SEGUNDO factor,
    // no un atajo: el código por sí solo no autentica a nadie.
    if (tokenDevValido(cookies().get(COOKIE_DEV)?.value)) {
      return { ok: true, userId: user.id, email, via: "codigo-plataforma" };
    }

    // --- Vía 2: lista de correos en variable de entorno ---
    // Se comprueba antes de la tabla porque es una operación en memoria.
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
