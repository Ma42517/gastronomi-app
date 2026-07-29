/**
 * TOLERANCIA A MIGRACIONES PENDIENTES.
 *
 * EL PROBLEMA
 * Cuando una migración añade columnas y todavía no se ha corrido en la base,
 * PostgREST rechaza la escritura COMPLETA con el código PGRST204:
 *
 *   Could not find the 'header_style' column of 'restaurantes' in the schema cache
 *
 * El efecto es desproporcionado. Cambiar el nombre de un restaurante o el precio
 * de un taco no tiene nada que ver con el color de la cabecera, pero dejaba de
 * funcionar por una función nueva que el usuario ni había empezado a usar. Un
 * despliegue de código que se adelanta a su migración —lo normal, porque el SQL
 * se corre a mano— tumbaba el panel entero.
 *
 * LA DECISIÓN: DEGRADAR, NUNCA EN SILENCIO
 * Si el ÚNICO motivo del fallo son esas columnas, se reintenta sin ellas y se
 * devuelve un aviso que la interfaz muestra en ámbar. Se guarda lo que se puede
 * y se dice con precisión qué se quedó fuera y qué SQL falta.
 *
 * La alternativa era exigir la migración antes de poder volver a guardar nada.
 * Se descartó: castiga una tarea cotidiana por un descuido del despliegue.
 * La otra alternativa —guardar sin avisar— era peor todavía: el dueño subiría un
 * video, lo vería desaparecer y no tendría forma de saber por qué.
 */

export interface GrupoColumnas {
  /** Columnas que aporta la migración. */
  campos: readonly string[];
  /** Qué se le dice al usuario cuando se guardó sin ellas. */
  aviso: string;
}

/** Migración 010 — personalización del restaurante. */
export const PERSONALIZACION: GrupoColumnas = {
  campos: ["header_style", "menu_layout", "whatsapp_number", "instagram_url"],
  aviso:
    "Los datos generales se guardaron, pero la personalización (cabecera, disposición del menú, WhatsApp e Instagram) no: falta correr supabase/migrations/010_media_y_personalizacion.sql en el SQL Editor de Supabase.",
};

/** Migración 009 — video por platillo. */
export const VIDEO_PLATILLO: GrupoColumnas = {
  campos: ["video_url"],
  aviso:
    "El platillo se guardó, pero su video no: falta correr supabase/migrations/009_video_platillos.sql en el SQL Editor de Supabase.",
};

/**
 * ¿El error es "falta ESTA migración" y no otra cosa?
 *
 * Se exige el código PGRST204 **y** que la columna que menciona el mensaje sea
 * una de las del grupo. Sin la segunda comprobación, cualquier otro desajuste de
 * esquema se tomaría por migración pendiente: se reintentaría en vano y el aviso
 * apuntaría al SQL equivocado, mandando a la persona a buscar donde no está.
 */
export function faltaColumnaDe(grupo: GrupoColumnas, error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null | undefined;
  if (e?.code !== "PGRST204") return false;
  const mensaje = e.message ?? "";
  return grupo.campos.some((campo) => mensaje.includes(campo));
}

/** Una fila o un lote de filas: el menú completo se sube de un tirón. */
export type Payload = Record<string, unknown> | Record<string, unknown>[];

/**
 * Copia del payload sin las columnas del grupo. No muta el original.
 *
 * Acepta una fila o un array porque los dos casos existen: guardar un platillo
 * manda una fila, y publicar el menú entero manda el lote completo.
 */
export function sinColumnasDe<P extends Payload>(
  grupo: GrupoColumnas,
  payload: P,
): P {
  const limpiarFila = (fila: Record<string, unknown>) => {
    const copia = { ...fila };
    for (const campo of grupo.campos) delete copia[campo];
    return copia;
  };

  return (
    Array.isArray(payload) ? payload.map(limpiarFila) : limpiarFila(payload)
  ) as P;
}

/**
 * Ejecuta una escritura y, si falla SOLO por las columnas del grupo, la repite
 * sin ellas.
 *
 * `escribir` se recibe como FUNCIÓN y no como promesa ya lanzada: es lo que
 * permite invocarla dos veces con contenidos distintos.
 */
export async function guardarTolerando<T, P extends Payload>(
  grupo: GrupoColumnas,
  escribir: (payload: P) => PromiseLike<{
    data: T;
    error: unknown;
  }>,
  payload: P,
): Promise<{ data: T; error: unknown; aviso?: string }> {
  const primero = await escribir(payload);
  if (!faltaColumnaDe(grupo, primero.error)) return primero;

  console.warn(
    `[columnas-pendientes] Faltan ${grupo.campos.join(", ")}; se guarda sin ellas.`,
  );

  const segundo = await escribir(sinColumnasDe(grupo, payload));

  // El aviso solo tiene sentido si el reintento funcionó. Si también falló, el
  // problema es otro y quien llama debe ver ese error tal cual.
  return segundo.error ? segundo : { ...segundo, aviso: grupo.aviso };
}
