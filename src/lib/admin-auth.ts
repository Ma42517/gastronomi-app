import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  RESTAURANTE_SLUG,
  servicioConfigurado,
  supabaseConfigurado,
} from "@/lib/supabase/config";
import { mensajeDeError } from "@/lib/supabase/errores";
import { verificarSuperAdmin } from "@/lib/dev-auth";

/**
 * GUARDIA DE AUTORIZACIÓN DEL PANEL — solo servidor.
 *
 * Toda ruta que escriba en el menú debe pasar por aquí antes de tocar la base de
 * datos. Comprueba dos cosas distintas, y ambas hacen falta:
 *
 *   1. AUTENTICACIÓN: ¿hay una sesión válida? Se usa `getUser()`, que valida el
 *      token contra Supabase. `getSession()` solo lee la cookie y sería
 *      falsificable.
 *   2. AUTORIZACIÓN: ¿ese usuario es dueño DE ESTE restaurante? Tener cuenta no
 *      basta: un comensal registrado también está autenticado. Sin esta segunda
 *      comprobación, cualquiera podría crearse una cuenta y editar el menú.
 *
 * La consulta de propiedad se hace con la Secret key a propósito: así funciona
 * igual aunque las políticas RLS de `restaurante_usuarios` cambien, y no depende
 * de los permisos del rol del visitante.
 */

export interface DuenoAutorizado {
  ok: true;
  userId: string;
  email: string | null;
  /**
   * uuid del restaurante que administra (ya resuelto desde el slug).
   * `null` solo en el arranque en frío: el restaurante todavía no existe y se
   * va a crear en esta misma petición (ver `permitirSinRestaurante`).
   */
  restauranteId: string | null;
}

export interface AccesoDenegado {
  ok: false;
  /** Respuesta lista para devolver desde el route handler. */
  respuesta: Response;
}

/** Caso normal: el restaurante existe, así que su id está garantizado. */
export type DuenoConRestaurante = DuenoAutorizado & { restauranteId: string };

export type ResultadoAuth = DuenoAutorizado | AccesoDenegado;

function denegar(
  status: number,
  error: string,
  extra: Record<string, unknown> = {},
): AccesoDenegado {
  return {
    ok: false,
    respuesta: Response.json({ error, ...extra }, { status }),
  };
}

export interface OpcionesAuth {
  /**
   * Permite continuar si el restaurante AÚN NO EXISTE en la base de datos.
   *
   * Resuelve un bloqueo mutuo del arranque en frío: "Publicar en Supabase" es lo
   * que CREA la fila del restaurante, pero comprobar la propiedad exige que esa
   * fila ya exista. Sin esta puerta, una instalación nueva no podría sembrarse
   * nunca desde el panel.
   *
   * Solo la usa /api/admin/sembrar, y sigue exigiendo sesión válida: el primer
   * usuario autenticado que publique queda registrado como dueño (ver
   * `restauranteId: null` en el resultado).
   */
  permitirSinRestaurante?: boolean;
}

/**
 * Sobrecargas para que TypeScript sepa cuándo `restauranteId` puede ser nulo.
 * Sin ellas, las rutas normales tendrían que comprobar un `null` que por
 * construcción nunca les llega.
 */
export async function verificarDueno(): Promise<
  DuenoConRestaurante | AccesoDenegado
>;
export async function verificarDueno(
  opciones: OpcionesAuth,
): Promise<ResultadoAuth>;
export async function verificarDueno(
  opciones: OpcionesAuth = {},
): Promise<ResultadoAuth> {
  if (!supabaseConfigurado() || !servicioConfigurado()) {
    return denegar(
      503,
      "Supabase no está configurado en el servidor.",
      { configurado: false },
    );
  }

  try {
    // --- 1. ¿Hay sesión? ---
    const supabase = createClient();
    const {
      data: { user },
      error: errorAuth,
    } = await supabase.auth.getUser();

    if (errorAuth || !user) {
      return denegar(401, "Necesitas iniciar sesión para hacer cambios.", {
        noAutenticado: true,
      });
    }

    // --- 2. ¿Es dueño de ESTE restaurante? ---
    const admin = createAdminClient();

    const { data: restaurante, error: errorRest } = await admin
      .from("restaurantes")
      .select("id")
      .eq("slug", RESTAURANTE_SLUG)
      .maybeSingle();

    if (errorRest) throw errorRest;

    if (!restaurante) {
      // Arranque en frío: el restaurante se creará en esta misma petición.
      if (opciones.permitirSinRestaurante) {
        return {
          ok: true,
          userId: user.id,
          email: user.email ?? null,
          restauranteId: null,
        };
      }
      return denegar(
        404,
        `No existe el restaurante "${RESTAURANTE_SLUG}". Publícalo primero desde el panel.`,
      );
    }

    const restauranteId = (restaurante as { id: string }).id;

    const { data: membresia, error: errorMembresia } = await admin
      .from("restaurante_usuarios")
      .select("rol")
      .eq("restaurante_id", restauranteId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (errorMembresia) {
      // Si la tabla no existe todavía, el mensaje genérico no ayudaría nada.
      const mensaje = mensajeDeError(errorMembresia);
      if (/does not exist|schema cache/i.test(mensaje)) {
        return denegar(
          503,
          "Falta la tabla de dueños. Corre supabase/migrations/005_duenos_auth.sql en el SQL Editor.",
        );
      }
      throw errorMembresia;
    }

    if (!membresia) {
      // Un super admin de la plataforma puede administrar CUALQUIER restaurante
      // sin figurar como su dueño: si no, el operador no podría arreglar el menú
      // de un cliente que lo pide por teléfono.
      const plataforma = await verificarSuperAdmin();
      if (plataforma.ok) {
        return {
          ok: true,
          userId: user.id,
          email: user.email ?? null,
          restauranteId,
        };
      }

      return denegar(
        403,
        `Tu cuenta (${user.email ?? "sin correo"}) no está registrada como dueña de este restaurante. Añádela con el bloque final de la migración 005.`,
        { noAutorizado: true },
      );
    }

    return {
      ok: true,
      userId: user.id,
      email: user.email ?? null,
      restauranteId,
    };
  } catch (error) {
    return denegar(500, mensajeDeError(error));
  }
}
