import { createAdminClient } from "@/lib/supabase/admin";
import { mensajeDeError } from "@/lib/supabase/errores";

/**
 * BUCKETS DE MULTIMEDIA — creación automática (solo servidor).
 *
 * POR QUÉ EXISTE
 * La primera subida fallaba con "No se encontró el bucket de almacenamiento" y
 * la única salida era ir al SQL Editor a correr una migración a mano. Eso es un
 * mal reparto de trabajo: el bucket es una dependencia técnica de la aplicación,
 * no una decisión del dueño de un restaurante, y la llave de servicio ya tiene
 * permiso para crearlo. Pedirle a alguien que ejecute SQL para poder subir una
 * foto es trasladarle un problema nuestro.
 *
 * La migración 010 sigue creándolos, para que la infraestructura quede
 * versionada en el repositorio y no dependa de que alguien pulse un botón. Pero
 * ya no es un requisito previo: lo que ocurra primero, gana.
 *
 * ⚠️ ESTO NO SE PUEDE HACER DESDE EL NAVEGADOR
 * Crear un bucket exige la llave de servicio. Si el cliente pudiera hacerlo,
 * cualquiera podría llenar el proyecto de buckets basura.
 */

/** Tipos que se aceptan en los dos buckets. */
const TIPOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

/**
 * Configuración de cada bucket. Es la MISMA que declara la migración 010: si
 * cambia una, hay que cambiar la otra, y por eso los números llevan comentario en
 * los dos sitios.
 */
export const CONFIGURACION_BUCKETS = {
  "dish-media": {
    public: true,
    fileSizeLimit: 52428800, // 50 MB
    allowedMimeTypes: TIPOS_PERMITIDOS,
  },
  "restaurant-media": {
    public: true,
    fileSizeLimit: 26214400, // 25 MB
    allowedMimeTypes: TIPOS_PERMITIDOS,
  },
} as const;

export type BucketConocido = keyof typeof CONFIGURACION_BUCKETS;

/**
 * ¿El error de Storage significa "ese bucket no existe"?
 *
 * ⚠️ ESTE ES EL ÚNICO SITIO DONDE SE DECIDE
 * Hubo un fallo real por tener dos detectores: este, que exige "bucket" Y "not
 * found", y una expresión más suelta en el manejador de errores de la subida que
 * disparaba con solo ver la palabra "bucket". Por ese hueco salía el mensaje de
 * "falta el bucket" SIN haber intentado crearlo, y encima con un texto idéntico
 * al de "no se pudo crear", así que era imposible distinguirlos. Cualquier sitio
 * que necesite esta pregunta debe llamar aquí.
 */
export function esBucketInexistente(error: unknown): boolean {
  const mensaje = mensajeDeError(error).toLowerCase();
  return (
    mensaje.includes("bucket not found") ||
    (mensaje.includes("bucket") &&
      (mensaje.includes("not found") ||
        mensaje.includes("does not exist") ||
        mensaje.includes("no existe")))
  );
}

/** Resultado de preparar un bucket, para poder informar de cada uno. */
export interface EstadoBucket {
  bucket: BucketConocido;
  existe: boolean;
  creadoAhora: boolean;
  error?: string;
}

/**
 * Se asegura de que EXISTAN los dos buckets y devuelve qué pasó con cada uno.
 *
 * Existe para poder ofrecer un botón de "preparar el almacenamiento" en el mismo
 * sitio donde falla la subida. Dejar al dueño de un restaurante ante un mensaje
 * que le manda al SQL Editor es un callejón sin salida: aquí puede resolverlo con
 * un toque, y si de verdad no se puede, ver el motivo exacto.
 */
export async function asegurarTodosLosBuckets(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<EstadoBucket[]> {
  const nombres = Object.keys(CONFIGURACION_BUCKETS) as BucketConocido[];

  return Promise.all(
    nombres.map(async (bucket) => {
      const res = await asegurarBucket(supabase, bucket);
      return res.ok
        ? { bucket, existe: true, creadoAhora: res.creado }
        : { bucket, existe: false, creadoAhora: false, error: res.error };
    }),
  );
}

/** Lee el estado de los buckets sin modificar nada. */
export async function estadoBuckets(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<EstadoBucket[]> {
  const nombres = Object.keys(CONFIGURACION_BUCKETS) as BucketConocido[];

  return Promise.all(
    nombres.map(async (bucket) => {
      const { error } = await supabase.storage.getBucket(bucket);
      return {
        bucket,
        existe: !error,
        creadoAhora: false,
        error: error ? mensajeDeError(error) : undefined,
      };
    }),
  );
}

/**
 * Crea el bucket si no existe. Idempotente.
 *
 * Un "ya existe" se considera ÉXITO y no error: dos subidas simultáneas en una
 * instalación nueva pueden intentar crearlo a la vez, y la que llegue segunda no
 * debe fallar por haber perdido la carrera.
 */
export async function asegurarBucket(
  supabase: ReturnType<typeof createAdminClient>,
  bucket: BucketConocido,
): Promise<{ ok: true; creado: boolean } | { ok: false; error: string }> {
  const configuracion = CONFIGURACION_BUCKETS[bucket];
  if (!configuracion) {
    return { ok: false, error: `Bucket desconocido: ${bucket}.` };
  }

  const { error } = await supabase.storage.createBucket(bucket, configuracion);

  if (!error) {
    console.info(`[buckets] Creado el bucket "${bucket}".`);
    return { ok: true, creado: true };
  }

  const mensaje = mensajeDeError(error);
  if (/already exists|duplicate/i.test(mensaje)) {
    return { ok: true, creado: false };
  }

  console.error(`[buckets] No se pudo crear "${bucket}": ${mensaje}`);
  return { ok: false, error: mensaje };
}
