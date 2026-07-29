import { RESTAURANTE_SLUG } from "@/lib/supabase/config";

/**
 * RESTAURANTE ACTIVO — qué restaurante está administrando el panel.
 *
 * EL PROBLEMA QUE RESUELVE
 * Hasta ahora `/admin` editaba siempre el restaurante de la variable de entorno
 * `NEXT_PUBLIC_RESTAURANTE_SLUG`, que Next.js incrusta AL COMPILAR. Con un solo
 * restaurante funcionaba; para administrar varios habría que volver a desplegar
 * la aplicación cada vez que se quiera cambiar de uno a otro, lo cual no es una
 * opción. Este módulo mueve esa decisión de tiempo de compilación a tiempo de
 * ejecución, guardándola en una cookie.
 *
 * POR QUÉ UNA COOKIE Y NO LA URL
 * El panel del dueño vive en `/admin` y así se queda: es la dirección que la
 * gente tiene guardada. Meter el slug en la ruta (`/admin/<slug>`) obligaría a
 * reescribir el enrutado y rompería los enlaces existentes. La cookie viaja sola
 * en cada petición, que es justo lo que necesitan las rutas de escritura.
 *
 * ⚠️ ESTA COOKIE NO ES UNA CREDENCIAL — Y POR ESO NO VA FIRMADA
 * A diferencia de `nom_modo_plataforma` (que sí lleva HMAC porque CONCEDE un
 * privilegio), aquí solo se guarda el nombre corto de un restaurante. Es una
 * PREFERENCIA, no un permiso. Falsificarla no da acceso a nada: `verificarDueno`
 * comprueba después, contra la base de datos, que quien pide el cambio sea dueño
 * de ESE restaurante o super admin de la plataforma. Si alguien escribe a mano
 * la cookie con el slug de un restaurante ajeno, la respuesta es un 403.
 *
 * Tampoco es `httpOnly`, a propósito: el navegador necesita leerla para saber
 * qué menú hidratar. Ocultarla no aportaría seguridad (no hay secreto que
 * proteger) y obligaría a una petición extra en cada carga del panel.
 */

/** Nombre de la cookie que guarda el slug del restaurante en administración. */
export const COOKIE_RESTAURANTE = "nom_restaurante_activo";

/**
 * Duración: 30 días. Es una preferencia de trabajo, no un privilegio, así que
 * no tiene por qué caducar rápido. El privilegio que permite cambiarla sí
 * caduca (12 h), y ahí está el control real.
 */
export const COOKIE_RESTAURANTE_MAX_AGE = 30 * 24 * 60 * 60;

/**
 * Normaliza igual que la API de restaurantes: el slug vive en URLs públicas
 * (`/mesa/<slug>/4`), así que nunca se confía en lo que llegue tal cual.
 */
export function normalizarSlug(valor: string): string {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * Saca un slug utilizable del valor crudo de la cookie.
 *
 * Devuelve `null` en lugar de lanzar: una cookie corrupta o manipulada debe
 * hacer que el panel caiga al restaurante por defecto, no que la página falle.
 */
export function slugDeCookie(valor: string | undefined | null): string | null {
  if (!valor) return null;
  const limpio = normalizarSlug(valor);
  return limpio.length > 0 ? limpio : null;
}

/**
 * Slug activo según el navegador. Solo tiene sentido en el cliente.
 *
 * Se lee de `document.cookie` en vez de pedirlo al servidor para que el panel
 * pueda empezar a hidratar el menú correcto en el primer efecto, sin esperar un
 * viaje de red que dejaría ver el menú de otro restaurante mientras tanto.
 */
export function slugActivoCliente(): string {
  if (typeof document === "undefined") return RESTAURANTE_SLUG;

  const encontrada = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${COOKIE_RESTAURANTE}=`));

  const valor = encontrada?.slice(COOKIE_RESTAURANTE.length + 1);
  return slugDeCookie(valor && decodeURIComponent(valor)) ?? RESTAURANTE_SLUG;
}
