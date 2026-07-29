"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * SUBIDA DE ARCHIVOS A SUPABASE STORAGE (lado navegador).
 *
 * Dos pasos:
 *   1. Se pide permiso a `/api/admin/subir`, que comprueba la sesión y devuelve
 *      una URL firmada con caducidad.
 *   2. El archivo se sube DIRECTAMENTE a Storage con esa URL.
 *
 * El porqué de este baile está explicado en la propia ruta: el tope de 4,5 MB de
 * las funciones de Vercel hace inviable pasar un video por nuestro servidor.
 */

export const BUCKET_PLATILLOS = "dish-media";
export const BUCKET_RESTAURANTE = "restaurant-media";

export type BucketMedia = typeof BUCKET_PLATILLOS | typeof BUCKET_RESTAURANTE;

/**
 * Topes por bucket, en bytes. Son los MISMOS que la migración 010 configura en
 * Storage. Se repiten aquí para poder avisar antes de empezar a subir: si solo
 * estuvieran en el servidor, el dueño esperaría a que subiera un archivo de
 * 80 MB para recibir un error al final.
 */
const TOPES: Record<BucketMedia, number> = {
  [BUCKET_PLATILLOS]: 50 * 1024 * 1024,
  [BUCKET_RESTAURANTE]: 25 * 1024 * 1024,
};

/** Tipos que aceptan tanto esta función como el bucket. */
export const IMAGENES_OK = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];
export const VIDEOS_OK = ["video/mp4", "video/webm", "video/quicktime"];

export type ResultadoSubida =
  | { ok: true; url: string }
  | { ok: false; error: string; /** true si Storage no está instalado. */ sinStorage?: boolean };

interface Permiso {
  url?: string;
  token?: string;
  path?: string;
  publicUrl?: string;
  error?: string;
}

export async function subirMedia(
  file: File,
  bucket: BucketMedia,
): Promise<ResultadoSubida> {
  // --- Validación local, solo para dar un mensaje decente ---
  const tope = TOPES[bucket];
  if (file.size > tope) {
    return {
      ok: false,
      error: `El archivo pesa ${megas(file.size)} y el máximo es ${megas(tope)}. Comprímelo o recórtalo.`,
    };
  }

  const permitidos = [...IMAGENES_OK, ...VIDEOS_OK];
  if (!permitidos.includes(file.type)) {
    return {
      ok: false,
      error: `Formato no admitido (${file.type || "desconocido"}). Usa JPG, PNG, WebP o GIF para imágenes, y MP4, WebM o MOV para video.`,
    };
  }

  try {
    // --- 1) Permiso firmado ---
    const res = await fetch("/api/admin/subir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bucket,
        nombre: file.name,
        tipoMime: file.type,
      }),
    });

    const permiso = (await res.json()) as Permiso;

    if (!res.ok || !permiso.token || !permiso.path) {
      return {
        ok: false,
        error: permiso.error ?? `El servidor respondió ${res.status}.`,
        // 503 = Supabase o los buckets no están listos. Quien llama puede
        // ofrecer entonces una alternativa (por ejemplo guardar la imagen
        // comprimida en local) en lugar de dejar al dueño sin salida.
        sinStorage: res.status === 503,
      };
    }

    // --- 2) Subida directa a Storage ---
    const supabase = createClient();
    const { error } = await supabase.storage
      .from(bucket)
      .uploadToSignedUrl(permiso.path, permiso.token, file, {
        contentType: file.type,
      });

    if (error) {
      // Storage rechaza por tamaño o tipo según la configuración del bucket. Su
      // mensaje es correcto pero técnico, así que se traduce el caso frecuente.
      const crudo = error.message ?? "";
      if (/exceeded the maximum allowed size|payload too large/i.test(crudo)) {
        return {
          ok: false,
          error: `El archivo supera el límite del almacenamiento (${megas(tope)}).`,
        };
      }
      return { ok: false, error: crudo || "No se pudo subir el archivo." };
    }

    if (!permiso.publicUrl) {
      return { ok: false, error: "La subida terminó pero no se obtuvo la URL." };
    }

    return { ok: true, url: permiso.publicUrl };
  } catch {
    return {
      ok: false,
      error: "Sin conexión con el almacenamiento. Revisa tu red e inténtalo otra vez.",
    };
  }
}

/** Formatea bytes en MB con un decimal, para los mensajes de error. */
function megas(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
