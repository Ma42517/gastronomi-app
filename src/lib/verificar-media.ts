"use client";

import { pareceImagen, type ClaseMedia } from "@/lib/media-tipo";

/**
 * VERIFICACIÓN DE UN ENLACE MULTIMEDIA EN EL NAVEGADOR.
 *
 * POR QUÉ NO SE COMPRUEBA EN EL SERVIDOR
 * Un `fetch` desde el servidor diría si el archivo existe, pero no si el
 * NAVEGADOR DEL COMENSAL podrá reproducirlo, que es la única pregunta que
 * importa. Un enlace puede devolver 200 y aun así fallar en el cliente: códec no
 * soportado, cabeceras CORS ausentes, o un servidor que rechaza la petición sin
 * `Referer`. Se prueba donde va a ocurrir de verdad.
 *
 * CÓMO
 * Se crea un elemento suelto —nunca insertado en el documento, para no provocar
 * repintados— y se escucha su resultado. Primero se prueba con la etiqueta que
 * sugiere la extensión y, si falla, con la otra: así un GIF servido por un CDN
 * sin extensión también se reconoce.
 *
 * ⚠️ NO SE PONE `crossOrigin`. Ponerlo EXIGIRÍA cabeceras CORS y haría fallar
 * enlaces que en el menú funcionarían perfectamente, porque pintar multimedia de
 * otro dominio no requiere CORS (solo leer sus píxeles lo requiere).
 */

export type ResultadoVerificacion =
  | { estado: "ok"; tipo: ClaseMedia }
  | { estado: "error"; motivo: string };

/** Tope de espera. Pasado esto se considera que no sirve. */
const MS_TOPE = 9000;

/**
 * ¿Se puede reproducir este enlace? Devuelve además QUÉ es, para poder pintarlo
 * con la etiqueta correcta.
 */
export async function verificarUrlMedia(
  url: string,
  msTope = MS_TOPE,
): Promise<ResultadoVerificacion> {
  const limpio = url.trim();

  if (!limpio) return { estado: "error", motivo: "El enlace está vacío." };

  if (!/^https?:\/\//i.test(limpio)) {
    return {
      estado: "error",
      motivo: "El enlace debe empezar por http:// o https://.",
    };
  }

  // Las páginas de reproductor se descartan antes de probar: nunca funcionan en
  // un `<video>` y el error genérico no explicaría por qué.
  const plataforma = ["youtube.com", "youtu.be", "vimeo.com", "tiktok.com"].find(
    (dominio) => limpio.toLowerCase().includes(dominio),
  );
  if (plataforma) {
    return {
      estado: "error",
      motivo: `${plataforma} es una página de reproductor, no un archivo. Hace falta el enlace directo a un .mp4, .webm o .gif.`,
    };
  }

  // Se empieza por lo que sugiere la extensión, que acierta casi siempre y
  // ahorra la espera del primer intento fallido.
  const orden: ClaseMedia[] = pareceImagen(limpio)
    ? ["imagen", "video"]
    : ["video", "imagen"];

  for (const tipo of orden) {
    const sirve =
      tipo === "video"
        ? await probarVideo(limpio, msTope)
        : await probarImagen(limpio, msTope);

    if (sirve) return { estado: "ok", tipo };
  }

  return {
    estado: "error",
    motivo:
      "No se pudo reproducir. Puede ser que el enlace no sea público, que el servidor lo bloquee (CORS) o que el formato no sea compatible.",
  };
}

/**
 * Comprobación en crudo, sin validar protocolo ni dominio.
 *
 * Es la que sirve para un `blob:` de `URL.createObjectURL`, con el que se
 * verifica un archivo local ANTES de subirlo: si está dañado o el navegador no
 * entiende su códec, no tiene sentido gastar la subida ni el almacenamiento.
 */
export function puedeReproducirse(
  url: string,
  tipo: ClaseMedia,
  msTope = MS_TOPE,
): Promise<boolean> {
  return tipo === "video" ? probarVideo(url, msTope) : probarImagen(url, msTope);
}

/** Prueba el enlace como video. Resuelve `true` si llega a tener datos. */
function probarVideo(url: string, msTope: number): Promise<boolean> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    let terminado = false;

    const acabar = (sirve: boolean) => {
      if (terminado) return;
      terminado = true;
      window.clearTimeout(temporizador);
      video.removeAttribute("src");
      // `load()` aborta la descarga en curso: sin esto, un archivo grande
      // seguiría bajando en segundo plano después de dar el veredicto.
      video.load();
      resolve(sirve);
    };

    const temporizador = window.setTimeout(() => acabar(false), msTope);

    // `loadedmetadata` basta: significa que el navegador entendió el contenedor y
    // el códec. Esperar a `loadeddata` obligaría a descargar el primer fotograma
    // completo y haría la comprobación mucho más lenta con poco beneficio.
    video.addEventListener("loadedmetadata", () => acabar(true), { once: true });
    video.addEventListener("error", () => acabar(false), { once: true });

    video.muted = true;
    video.preload = "metadata";
    video.src = url;
  });
}

/** Prueba el enlace como imagen (el caso del GIF). */
function probarImagen(url: string, msTope: number): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    let terminado = false;

    const acabar = (sirve: boolean) => {
      if (terminado) return;
      terminado = true;
      window.clearTimeout(temporizador);
      img.src = "";
      resolve(sirve);
    };

    const temporizador = window.setTimeout(() => acabar(false), msTope);

    img.addEventListener("load", () => acabar(true), { once: true });
    img.addEventListener("error", () => acabar(false), { once: true });

    img.src = url;
  });
}
