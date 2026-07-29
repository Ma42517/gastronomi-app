import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarSuperAdmin } from "@/lib/dev-auth";
import { mensajeDeError } from "@/lib/supabase/errores";
import { RESTAURANTE_SLUG } from "@/lib/supabase/config";
import {
  COOKIE_RESTAURANTE,
  COOKIE_RESTAURANTE_MAX_AGE,
  normalizarSlug,
} from "@/lib/restaurante-activo";
import { slugActivoServidor } from "@/lib/restaurante-activo-servidor";

/**
 * QUÉ RESTAURANTE ADMINISTRA EL PANEL — solo super admin.
 *
 *   GET    /api/dev/restaurante-activo   -> cuál está seleccionado
 *   POST   /api/dev/restaurante-activo   -> seleccionar { slug }
 *   DELETE /api/dev/restaurante-activo   -> volver al de por defecto
 *
 * Cambiar de restaurante es una operación de plataforma, no del dueño: por eso
 * pasa por `verificarSuperAdmin()`. Un dueño normal no necesita esto — solo
 * administra el suyo.
 *
 * Aun así, esta ruta NO es lo que autoriza los cambios de menú. Fijar la cookie
 * solo dice "quiero trabajar sobre este restaurante"; cada escritura posterior
 * vuelve a comprobar en `verificarDueno()` que el usuario sea dueño de ese
 * restaurante o super admin. Ver el comentario largo en `restaurante-activo.ts`.
 */

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET — qué hay seleccionado ahora
// ---------------------------------------------------------------------------
export async function GET() {
  const auth = await verificarSuperAdmin();
  if (!auth.ok) return auth.respuesta;

  const slug = slugActivoServidor();

  return Response.json({
    slug,
    // Distinguir "elegido a mano" de "el de por defecto" permite que la interfaz
    // muestre el estado real en lugar de fingir una selección que nadie hizo.
    porDefecto: slug === RESTAURANTE_SLUG,
    slugPorDefecto: RESTAURANTE_SLUG,
  });
}

// ---------------------------------------------------------------------------
// POST — seleccionar
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  const auth = await verificarSuperAdmin();
  if (!auth.ok) return auth.respuesta;

  try {
    const { slug } = (await req.json()) as { slug?: string };
    const limpio = normalizarSlug(slug ?? "");

    if (!limpio) {
      return Response.json(
        { error: "Falta el identificador del restaurante." },
        { status: 400 },
      );
    }

    // Se comprueba que exista ANTES de fijar la cookie. Si no, el panel se
    // quedaría apuntando a un restaurante fantasma y el dueño vería un
    // "no existe" sin entender por qué: el error debe salir aquí, donde la
    // persona acaba de pulsar el botón.
    const supabase = createAdminClient();
    const { data: restaurante, error } = await supabase
      .from("restaurantes")
      .select("id, slug, nombre")
      .eq("slug", limpio)
      .maybeSingle();

    if (error) throw error;

    if (!restaurante) {
      return Response.json(
        { error: `No existe ningún restaurante con el identificador "${limpio}".` },
        { status: 404 },
      );
    }

    cookies().set(COOKIE_RESTAURANTE, limpio, {
      // Legible por el navegador a propósito: el panel la necesita para hidratar
      // el menú correcto sin una petición extra. No hay secreto que ocultar.
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_RESTAURANTE_MAX_AGE,
    });

    const fila = restaurante as { slug: string; nombre: string };
    return Response.json({ ok: true, slug: fila.slug, nombre: fila.nombre });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[dev/restaurante-activo] POST:", mensaje);
    return Response.json({ error: mensaje }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE — volver al de por defecto
// ---------------------------------------------------------------------------
export async function DELETE() {
  const auth = await verificarSuperAdmin();
  if (!auth.ok) return auth.respuesta;

  cookies().delete(COOKIE_RESTAURANTE);
  return Response.json({ ok: true, slug: RESTAURANTE_SLUG });
}
