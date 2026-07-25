import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * DESBLOQUEO DEL MODO PLATAFORMA — solo servidor.
 *
 * Es un código que ACTIVA el menú de super admin. NO sustituye al login: después
 * de introducirlo hay que entrar igualmente con el correo y la contraseña reales
 * de Supabase. Son dos factores distintos y hacen falta los dos:
 *
 *   código correcto  ->  "esta persona conoce el secreto de la plataforma"
 *   sesión de Supabase -> "y además es esta cuenta concreta"
 *
 * Esto es deliberadamente más fuerte que un acceso por clave suelta: si el
 * código se filtrara, no serviría de nada sin una cuenta válida; y si alguien
 * robara una cuenta, no vería el panel de plataforma sin el código.
 *
 * ⚠️ POR QUÉ EL CÓDIGO NO ESTÁ ESCRITO EN EL CÓDIGO FUENTE
 * Quien cruza esta puerta puede crear, editar y BORRAR restaurantes completos.
 * Si el código viviera en un archivo del repositorio, quedaría para siempre en
 * el historial de Git y a la vista de cualquiera con acceso al proyecto. Se lee
 * de la variable de entorno `SUPER_ADMIN_CLAVE`; si no está definida, el modo
 * queda APAGADO. Es preferible que no funcione a que funcione con un secreto
 * público.
 *
 * CÓMO SE SOSTIENE EL DESBLOQUEO
 * No basta con guardar "desbloqueado" en una cookie: cualquiera la escribiría a
 * mano desde la consola del navegador. La cookie lleva una FIRMA HMAC hecha con
 * el código, así que solo el servidor puede producirla, y la fecha de caducidad
 * va DENTRO de lo firmado para que no se pueda extender manipulándola.
 */

/** Nombre de la cookie que marca el modo plataforma como desbloqueado. */
export const COOKIE_DEV = "nom_modo_plataforma";

/** Duración del desbloqueo. Corta a propósito: es el privilegio más alto. */
const HORAS_VALIDEZ = 12;

/** Usuario esperado para el desbloqueo. Configurable, "admin" por defecto. */
export function usuarioDev(): string {
  return (process.env.SUPER_ADMIN_USUARIO || "admin").trim().toLowerCase();
}

/** Código configurado, o null si el modo está apagado. */
function claveDev(): string | null {
  const clave = process.env.SUPER_ADMIN_CLAVE?.trim();
  return clave && clave.length > 0 ? clave : null;
}

/** ¿Está disponible el desbloqueo en esta instalación? */
export function accesoDevDisponible(): boolean {
  return claveDev() !== null;
}

/** Firma HMAC de un contenido, con el código como secreto. */
function firmar(contenido: string, clave: string): string {
  return createHmac("sha256", clave).update(contenido).digest("hex");
}

/**
 * Comparación en tiempo constante.
 *
 * Un `===` normal termina en el primer carácter distinto, y esa diferencia de
 * tiempo permite adivinar el código carácter a carácter (ataque de canal lateral
 * por temporización).
 */
function igualesSeguro(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // `timingSafeEqual` exige longitudes iguales; distinta longitud ya es distinto.
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Valida el usuario y el código del desbloqueo. */
export function credencialesValidas(usuario: string, clave: string): boolean {
  const esperada = claveDev();
  if (!esperada) return false;

  const usuarioOk = igualesSeguro(usuario.trim().toLowerCase(), usuarioDev());
  const claveOk = igualesSeguro(clave.trim(), esperada);

  // Se evalúan las dos SIEMPRE (sin cortocircuito) para no revelar por el tiempo
  // de respuesta si el usuario era correcto pero el código no.
  return usuarioOk && claveOk;
}

/** Genera el valor firmado de la cookie: `<caducidad>.<firma>`. */
export function crearTokenDev(): { token: string; maxAge: number } | null {
  const clave = claveDev();
  if (!clave) return null;

  const maxAge = HORAS_VALIDEZ * 60 * 60;
  const caducidad = String(Date.now() + maxAge * 1000);

  return { token: `${caducidad}.${firmar(caducidad, clave)}`, maxAge };
}

/** Comprueba que la cookie sea auténtica y no haya caducado. */
export function tokenDevValido(token: string | undefined): boolean {
  const clave = claveDev();
  if (!clave || !token) return false;

  const [caducidad, firma] = token.split(".");
  if (!caducidad || !firma) return false;

  // Primero la firma: si no es nuestra, el contenido no merece ni leerse.
  if (!igualesSeguro(firma, firmar(caducidad, clave))) return false;

  const vence = Number(caducidad);
  return Number.isFinite(vence) && vence > Date.now();
}
