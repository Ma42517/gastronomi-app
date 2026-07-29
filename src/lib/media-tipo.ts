import type { TipoMedia } from "@/types/database";

/**
 * DEDUCIR SI UN ENLACE ES VIDEO O IMAGEN.
 *
 * Hace falta porque `video_url` guarda las dos cosas: un MP4 subido, un GIF
 * subido o un enlace externo a cualquiera de los dos. La etiqueta HTML no es la
 * misma —`<video>` no reproduce un GIF y `<img>` no reproduce un MP4—, así que
 * antes de pintar hay que saber qué se tiene entre manos.
 *
 * Módulo sin "use client" y sin dependencias del DOM: lo usan tanto el servidor
 * (al validar) como el navegador (al pintar), y una sola definición evita que
 * cada lado deduzca de forma distinta.
 */

/** Extensiones que van en un `<img>`. El GIF animado es el caso que importa. */
const EXTENSIONES_IMAGEN = [
  ".gif",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".avif",
  ".svg",
];

/** Extensiones que van en un `<video>`. */
const EXTENSIONES_VIDEO = [".mp4", ".webm", ".mov", ".m4v", ".ogv"];

export type ClaseMedia = "video" | "imagen";

/** Quita la query y el fragmento para poder mirar la extensión. */
function rutaLimpia(url: string): string {
  return url.toLowerCase().split("?")[0].split("#")[0];
}

/** ¿La extensión del enlace es de imagen? */
export function pareceImagen(url: string): boolean {
  const ruta = rutaLimpia(url);
  return EXTENSIONES_IMAGEN.some((ext) => ruta.endsWith(ext));
}

/** ¿La extensión del enlace es de video? */
export function pareceVideo(url: string): boolean {
  const ruta = rutaLimpia(url);
  return EXTENSIONES_VIDEO.some((ext) => ruta.endsWith(ext));
}

/**
 * Con qué etiqueta hay que pintar este enlace.
 *
 * El `media_type` declarado MANDA cuando existe: lo eligió una persona y es más
 * fiable que cualquier heurística. Solo se deduce en dos casos: cuando es un
 * enlace externo (`media_url`, donde el tipo no se declaró) y cuando falta —los
 * platillos guardados antes de que existiera la columna.
 *
 * Ante la duda se elige `video`, porque es el uso principal de este campo y
 * porque `MediaPlatillo` reintenta como imagen si el video falla. Elegir
 * `imagen` por defecto no tendría esa red: un `<img>` con un MP4 no falla de
 * forma útil, simplemente no muestra nada.
 */
export function claseDeMedia(
  url: string | undefined,
  tipo: TipoMedia | undefined,
): ClaseMedia | null {
  if (!url) return null;

  if (tipo === "gif_file") return "imagen";
  if (tipo === "video_file") return "video";

  // 'media_url' o sin declarar: se mira la extensión.
  if (pareceImagen(url)) return "imagen";
  if (pareceVideo(url)) return "video";

  // Sin extensión reconocible (típico de un CDN con parámetros).
  return "video";
}
