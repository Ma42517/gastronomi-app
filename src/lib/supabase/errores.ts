/**
 * Traduce cualquier error a un mensaje legible.
 *
 * POR QUÉ EXISTE
 * Los errores de Supabase (`PostgrestError`) son objetos planos, NO instancias
 * de `Error`. Un `error instanceof Error ? error.message : "Error desconocido"`
 * los descarta y muestra "Error desconocido", ocultando justo la información
 * que hace falta para arreglar el problema. Eso fue exactamente lo que pasó al
 * sembrar el menú: el panel decía "Error desconocido" mientras Postgres estaba
 * explicando el motivo real.
 *
 * Además de `message`, se aprovechan `details`, `hint` y `code`: PostgREST suele
 * poner ahí lo verdaderamente útil (qué columna, qué restricción, qué falta).
 */
export function mensajeDeError(error: unknown): string {
  if (!error) return "Error sin detalle.";

  if (error instanceof Error) return error.message;

  if (typeof error === "string") return error;

  if (typeof error === "object") {
    const e = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

    const partes = [
      e.message,
      e.details && e.details !== e.message ? `Detalle: ${e.details}` : null,
      e.hint ? `Pista: ${e.hint}` : null,
      e.code ? `(código ${e.code})` : null,
    ].filter(Boolean);

    if (partes.length > 0) return partes.join(" · ");

    // Último recurso: serializar en lugar de perder la información.
    try {
      return JSON.stringify(error);
    } catch {
      return "Error no serializable.";
    }
  }

  return String(error);
}
