import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Forma de cada cookie que Supabase pide escribir en `setAll`. */
type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * MIDDLEWARE — refresco de sesión y puerta del panel.
 *
 * Hace dos cosas:
 *
 *  1. REFRESCA la sesión de Supabase en cada petición. Los tokens de acceso
 *     caducan a los pocos minutos; sin este refresco el dueño se quedaría fuera
 *     a mitad de trabajo. Los Server Components no pueden escribir cookies, así
 *     que el refresco tiene que ocurrir aquí.
 *
 *  2. PROTEGE /admin: sin sesión, redirige a /admin/login guardando el destino
 *     en `redirigir` para volver ahí después de entrar.
 *
 * La comprobación de si el usuario es DUEÑO no se hace aquí, sino en el servidor
 * (`lib/admin-auth.ts`). El middleware solo verifica que haya sesión: consultar
 * la tabla de propiedad en cada petición, incluidas las de recursos estáticos,
 * sería un coste innecesario.
 */

/** ¿Hay configuración de Supabase? Sin ella el panel corre en modo local. */
function configurado() {
  return Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL) &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
        process.env.SUPABASE_ANON_KEY),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // La propia pantalla de login no puede exigir sesión: sería un bucle.
  if (pathname.startsWith("/admin/login")) return NextResponse.next();

  // Sin Supabase configurado el panel funciona en modo local (solo este
  // navegador) y no hay nada que autenticar. Bloquear aquí dejaría el panel
  // inaccesible en demos y previews sin base de datos.
  if (!configurado()) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL)!,
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.SUPABASE_ANON_KEY)!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          // Se escriben en la petición Y en la respuesta: lo primero para que el
          // resto del render vea la sesión ya refrescada, lo segundo para que el
          // navegador se quede con las cookies nuevas.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // `getUser()` valida el token contra Supabase (a diferencia de `getSession()`,
  // que se limita a leer la cookie y por tanto es falsificable).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = request.nextUrl.clone();
    login.pathname = "/admin/login";
    login.searchParams.set("redirigir", pathname);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  // Solo el panel. La vista del cliente es pública y no debe pagar el coste de
  // validar sesión en cada navegación.
  matcher: ["/admin", "/admin/:path*"],
};
