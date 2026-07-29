"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, Video } from "lucide-react";

interface CampoVideoProps {
  valor?: string;
  onCambiar: (video: string | undefined) => void;
  /** Foto del platillo: se usa como `poster` en la vista previa. */
  poster?: string;
}

/**
 * VIDEO DEL PLATILLO — campo de URL con vista previa.
 *
 * ⚠️ POR QUÉ AQUÍ SE PIDE UNA URL Y NO UN ARCHIVO
 * El campo de la foto sí sube archivos, porque se comprimen a ~80 KB y caben en
 * la base. Un video no: incluso uno de 5 segundos pesa varios megabytes, y
 * guardarlo en base64 dentro de una columna de texto significaría que CADA
 * lectura del menú arrastra esos megabytes por platillo. El menú del comensal
 * tardaría segundos en aparecer.
 *
 * Lo correcto es subir el archivo a Supabase Storage (o a un CDN) y guardar aquí
 * el enlace. Cuando exista ese bucket, este campo se puede ampliar con un botón
 * de subida sin tocar nada más: el contrato sigue siendo una URL.
 */

/** Extensiones que un `<video>` de HTML5 reproduce de forma fiable. */
const FORMATOS_OK = [".mp4", ".webm", ".mov", ".m4v"];

/** Dominios que NO sirven un archivo de video directo (son reproductores web). */
const PLATAFORMAS = ["youtube.com", "youtu.be", "vimeo.com", "tiktok.com"];

export function CampoVideo({ valor, onCambiar, poster }: CampoVideoProps) {
  const [errorCarga, setErrorCarga] = useState(false);

  const url = valor?.trim() ?? "";
  const enMinusculas = url.toLowerCase();

  // Se avisa, pero NO se bloquea: puede haber URLs válidas sin extensión (por
  // ejemplo detrás de un CDN con parámetros), y no conviene impedir guardarlas.
  const esPlataforma = PLATAFORMAS.some((d) => enMinusculas.includes(d));
  const sinFormatoConocido =
    url.length > 0 &&
    !esPlataforma &&
    !FORMATOS_OK.some((ext) => enMinusculas.split("?")[0].endsWith(ext));

  return (
    <div>
      <label
        htmlFor="video-url"
        className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-white/50"
      >
        <Video className="h-3.5 w-3.5" />
        Video del platillo
        <span className="font-normal normal-case text-white/30">(opcional)</span>
      </label>

      <div className="flex gap-2">
        <input
          id="video-url"
          type="url"
          value={valor ?? ""}
          onChange={(e) => {
            setErrorCarga(false);
            // Cadena vacía -> undefined, para que el repositorio lo guarde como
            // null y el video quede realmente borrado.
            onCambiar(e.target.value.trim() || undefined);
          }}
          placeholder="https://…/mi-taco.mp4"
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-400/60"
        />

        {url && (
          <button
            type="button"
            onClick={() => {
              setErrorCarga(false);
              onCambiar(undefined);
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/40 transition hover:bg-rose-500/20 hover:text-rose-400"
            aria-label="Quitar video"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* --- Avisos --- */}
      {esPlataforma && (
        <p className="mt-2 flex gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Los enlaces de YouTube, Vimeo o TikTok no funcionan aquí: son páginas
            de reproductor, no archivos de video. Hace falta un enlace directo a
            un <strong>.mp4</strong>.
          </span>
        </p>
      )}

      {!esPlataforma && sinFormatoConocido && (
        <p className="mt-2 text-[11px] leading-relaxed text-amber-300/80">
          El enlace no termina en .mp4, .webm o .mov. Puede funcionar igual, pero
          revisa la vista previa antes de guardar.
        </p>
      )}

      {errorCarga && (
        <p className="mt-2 flex gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] leading-relaxed text-rose-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            El video no se pudo cargar. Comprueba que el enlace sea público y
            directo al archivo. En el menú se mostrará la foto.
          </span>
        </p>
      )}

      {/* --- Vista previa: la única forma de saber que el enlace sirve --- */}
      {url && !esPlataforma && (
        <div className="mt-2.5 overflow-hidden rounded-xl border border-white/10 bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            key={url}
            src={url}
            poster={poster}
            autoPlay
            loop
            muted
            playsInline
            onError={() => setErrorCarga(true)}
            className="aspect-video w-full object-cover"
          />
        </div>
      )}

      <p className="mt-1.5 text-[11px] leading-snug text-white/35">
        Un video corto (3-6 s) en bucle y sin sonido. Si lo dejas vacío se usa la
        foto.
      </p>
    </div>
  );
}
