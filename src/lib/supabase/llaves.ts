/**
 * CLASIFICACIÓN DE LLAVES DE SUPABASE — solo servidor.
 *
 * Vive en su propio módulo (y no en `config.ts`) porque usa `Buffer`, que es de
 * Node: si estuviera en un archivo que importa código de cliente, acabaría en el
 * bundle del navegador.
 *
 * Soporta los DOS sistemas de llaves que Supabase mantiene en paralelo:
 *   - Nuevo:  `sb_publishable_…` (navegador) y `sb_secret_…` (solo servidor).
 *   - Antiguo (legacy): JWT que empiezan por `eyJ`, con el rol en el payload.
 */

export type TipoLlave =
  | "publicable" // sb_publishable_… — segura en el navegador
  | "secreta" // sb_secret_…      — SOLO servidor
  | "jwt-anon" // eyJ… role=anon         (legacy)
  | "jwt-servicio" // eyJ… role=service_role (legacy, SOLO servidor)
  | "jwt-ilegible"
  | "desconocido";

/**
 * Identifica qué clase de llave es.
 *
 * Sirve para detectar el error más caro posible: poner la llave con acceso total
 * en una variable `NEXT_PUBLIC_*`, que Next.js incrusta en el bundle del
 * navegador. Cualquiera podría entonces leer y reescribir la base de datos
 * completa saltándose RLS.
 */
export function clasificarLlave(key: string | undefined): TipoLlave {
  if (!key) return "desconocido";
  if (key.startsWith("sb_publishable_")) return "publicable";
  if (key.startsWith("sb_secret_")) return "secreta";

  // Legacy: el rol viaja dentro del payload del JWT.
  if (key.startsWith("eyJ")) {
    try {
      const payload = key.split(".")[1];
      if (!payload) return "jwt-ilegible";
      const json = JSON.parse(
        Buffer.from(payload, "base64").toString("utf8"),
      ) as { role?: string };
      if (json.role === "service_role") return "jwt-servicio";
      if (json.role === "anon") return "jwt-anon";
      return "jwt-ilegible";
    } catch {
      return "jwt-ilegible";
    }
  }

  return "desconocido";
}

/** ¿Esta llave NUNCA debe salir del servidor? */
export function esLlavePrivilegiada(tipo: TipoLlave): boolean {
  return tipo === "secreta" || tipo === "jwt-servicio";
}

/** Nombre legible para mostrar en el diagnóstico. */
export function nombreLlave(tipo: TipoLlave): string {
  const nombres: Record<TipoLlave, string> = {
    publicable: "publishable (sb_publishable_…)",
    secreta: "SECRET (sb_secret_…)",
    "jwt-anon": "anon legacy (eyJ…)",
    "jwt-servicio": "SERVICE_ROLE legacy (eyJ…)",
    "jwt-ilegible": "JWT de rol no reconocido",
    desconocido: "formato no reconocido",
  };
  return nombres[tipo];
}
