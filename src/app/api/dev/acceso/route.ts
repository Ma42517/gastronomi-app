import { cookies } from "next/headers";
import {
  COOKIE_DEV,
  accesoDevDisponible,
  credencialesValidas,
  crearTokenDev,
  usuarioDev,
} from "@/lib/acceso-dev";

/**
 * DESBLOQUEO DEL MODO PLATAFORMA.
 *
 *   POST   /api/dev/acceso   { usuario, clave }  -> desbloquea
 *   DELETE /api/dev/acceso                       -> vuelve a bloquear
 *   GET    /api/dev/acceso                       -> ¿está disponible el modo?
 *
 * IMPORTANTE: esto NO inicia sesión. Solo marca el navegador como "conoce el
 * código de la plataforma". Después hay que entrar con el correo y la contraseña
 * reales; el privilegio de super admin exige las dos cosas.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  // Solo informa si el modo existe, para que el login sepa si ofrecerlo.
  // Nunca revela el usuario ni la clave.
  return Response.json({ disponible: accesoDevDisponible() });
}

export async function POST(req: Request) {
  if (!accesoDevDisponible()) {
    return Response.json(
      {
        error:
          "El acceso directo no está configurado. Define SUPER_ADMIN_CLAVE en Vercel y vuelve a desplegar.",
      },
      { status: 503 },
    );
  }

  try {
    const { usuario, clave } = (await req.json()) as {
      usuario?: string;
      clave?: string;
    };

    if (!usuario || !clave) {
      return Response.json(
        { error: "Faltan el usuario y la clave." },
        { status: 400 },
      );
    }

    if (!credencialesValidas(usuario, clave)) {
      // Mensaje deliberadamente ambiguo: decir "el usuario existe pero la clave
      // no" confirmaría cuál de los dos datos acertó quien lo intenta.
      return Response.json(
        { error: "Usuario o clave incorrectos." },
        { status: 401 },
      );
    }

    const token = crearTokenDev();
    if (!token) {
      return Response.json(
        { error: "No se pudo desbloquear el modo plataforma." },
        { status: 500 },
      );
    }

    cookies().set(COOKIE_DEV, token.token, {
      // `httpOnly`: JavaScript de la página no puede leerla, así que un script
      // inyectado no podría robar la sesión.
      httpOnly: true,
      // `secure` solo en producción: en local se sirve por HTTP y la cookie se
      // descartaría, dejando el modo inutilizable al desarrollar.
      secure: process.env.NODE_ENV === "production",
      // `lax` corta el envío en peticiones de otros sitios (CSRF) sin romper la
      // navegación normal.
      sameSite: "lax",
      path: "/",
      maxAge: token.maxAge,
    });

    return Response.json({ ok: true, usuario: usuarioDev() });
  } catch {
    return Response.json({ error: "Petición inválida." }, { status: 400 });
  }
}

export async function DELETE() {
  cookies().delete(COOKIE_DEV);
  return Response.json({ ok: true });
}
