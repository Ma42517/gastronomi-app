"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Film, Globe, Loader2, Trash2 } from "lucide-react";
import type { TipoMedia } from "@/types/database";
import { BUCKET_PLATILLOS } from "@/lib/subir-media";
import { claseDeMedia } from "@/lib/media-tipo";
import { verificarUrlMedia, type ResultadoVerificacion } from "@/lib/verificar-media";
import { MediaUploader } from "./MediaUploader";

/**
 * SELECTOR DE MULTIMEDIA DEL PLATILLO — video, GIF o enlace externo.
 *
 * Las tres opciones escriben en el MISMO campo (`video_url`) y se distinguen por
 * `media_type`. Tener un campo por origen habría multiplicado los estados
 * imposibles: ¿qué se pinta si hay un video subido Y un enlace externo a la vez?
 * Con un solo campo, elegir una opción sustituye a la anterior y no hay
 * ambigüedad que resolver después.
 *
 * SOBRE EL ASPECTO
 * Las pestañas usan el mismo vocabulario visual que las del panel
 * (`rounded-full`, borde violeta cuando están activas) y el campo de enlace las
 * mismas clases que cualquier `<input>` del modal. No se introduce ningún color
 * nuevo.
 */

interface SelectorMediaProps {
  /** Enlace actual (subido o externo). */
  valor?: string;
  mediaType?: TipoMedia;
  onCambiar: (cambio: { url?: string; mediaType?: TipoMedia }) => void;
  /** Foto del platillo: `poster` de la vista previa del video. */
  poster?: string;
}

type Pestana = TipoMedia;

const PESTANAS: { id: Pestana; icono: string; texto: string }[] = [
  { id: "video_file", icono: "🎬", texto: "Subir video" },
  { id: "gif_file", icono: "🖼️", texto: "Subir GIF" },
  { id: "media_url", icono: "🌐", texto: "URL externa" },
];

export function SelectorMedia({
  valor,
  mediaType,
  onCambiar,
  poster,
}: SelectorMediaProps) {
  /**
   * Pestaña inicial. Si el platillo ya trae multimedia se abre en la que le
   * corresponde: encontrarse el selector en "Subir video" cuando lo que hay es un
   * enlace externo haría pensar que se ha perdido.
   */
  const [pestana, setPestana] = useState<Pestana>(() => {
    if (mediaType) return mediaType;
    if (!valor) return "video_file";
    return claseDeMedia(valor, undefined) === "imagen" ? "gif_file" : "media_url";
  });

  // --- Verificación del enlace externo ---
  const [urlEnCurso, setUrlEnCurso] = useState(valor ?? "");
  const [verificacion, setVerificacion] = useState<
    ResultadoVerificacion | { estado: "verificando" } | null
  >(null);

  /**
   * Identificador de la comprobación en vuelo. Al teclear se lanzan varias y
   * pueden terminar desordenadas; sin este contador, el veredicto de una URL
   * antigua podría sobreescribir el de la actual y marcar como válido un enlace
   * que ya se cambió.
   */
  const generacion = useRef(0);

  useEffect(() => {
    if (pestana !== "media_url") return;

    const url = urlEnCurso.trim();
    if (!url) {
      setVerificacion(null);
      return;
    }

    const mia = ++generacion.current;
    setVerificacion({ estado: "verificando" });

    // Espera antes de comprobar: verificar en cada pulsación dispararía una
    // descarga por letra tecleada.
    const espera = window.setTimeout(async () => {
      const resultado = await verificarUrlMedia(url);
      if (generacion.current !== mia) return;

      setVerificacion(resultado);

      // El enlace solo se guarda en el borrador si de verdad se reproduce. Así
      // "Guardar" nunca deja en el menú una URL que ya se sabe que falla.
      onCambiar(
        resultado.estado === "ok"
          ? { url, mediaType: "media_url" }
          : { url: undefined, mediaType: undefined },
      );
    }, 600);

    return () => window.clearTimeout(espera);
    // `onCambiar` fuera de las dependencias: llega como función nueva en cada
    // render del padre y reiniciaría la comprobación sin parar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlEnCurso, pestana]);

  /** Al cambiar de pestaña se limpia lo que había: son orígenes excluyentes. */
  const cambiarPestana = (nueva: Pestana) => {
    if (nueva === pestana) return;
    setPestana(nueva);
    setVerificacion(null);
    generacion.current++;
    if (nueva !== "media_url") setUrlEnCurso("");
    onCambiar({ url: undefined, mediaType: undefined });
  };

  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-white/50">
        <Film className="h-3.5 w-3.5" />
        Multimedia del platillo
        <span className="font-normal normal-case text-white/30">(opcional)</span>
      </label>

      {/* ===== PESTAÑAS ===== */}
      <div className="mb-3 flex flex-wrap gap-2">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => cambiarPestana(p.id)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              pestana === p.id
                ? "border-violet-400/50 bg-violet-500/20 text-white"
                : "border-white/10 bg-white/[0.04] text-white/55 hover:bg-white/[0.08]"
            }`}
          >
            <span aria-hidden>{p.icono}</span>
            {p.texto}
          </button>
        ))}
      </div>

      {/* ===== SUBIDA DE VIDEO ===== */}
      {pestana === "video_file" && (
        <MediaUploader
          tipo="video"
          bucket={BUCKET_PLATILLOS}
          etiqueta="Archivo de video"
          tiposAceptados={["video/mp4", "video/webm"]}
          descripcion="un video"
          sinEnlaceManual
          valor={valor}
          poster={poster}
          onCambiar={(url) =>
            onCambiar({ url, mediaType: url ? "video_file" : undefined })
          }
          ayuda="Corto (3-6 s), en bucle y sin sonido. MP4 con H.264 es lo que mejor funciona en todos los teléfonos."
        />
      )}

      {/* ===== SUBIDA DE GIF ===== */}
      {pestana === "gif_file" && (
        <MediaUploader
          tipo="imagen"
          bucket={BUCKET_PLATILLOS}
          etiqueta="Archivo GIF"
          tiposAceptados={["image/gif"]}
          descripcion="un GIF"
          sinEnlaceManual
          emoji=""
          valor={valor}
          onCambiar={(url) =>
            onCambiar({ url, mediaType: url ? "gif_file" : undefined })
          }
          ayuda="Solo GIF. Un JPG o PNG dejaría la tarjeta quieta, así que aquí se rechazan: para una foto fija está el campo de Fotografía."
        />
      )}

      {/* ===== ENLACE EXTERNO ===== */}
      {pestana === "media_url" && (
        <div>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlEnCurso}
              onChange={(e) => setUrlEnCurso(e.target.value)}
              placeholder="https://…/mi-taco.mp4 o .gif"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-400/60"
            />

            {urlEnCurso && (
              <button
                type="button"
                onClick={() => {
                  setUrlEnCurso("");
                  setVerificacion(null);
                  generacion.current++;
                  onCambiar({ url: undefined, mediaType: undefined });
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/40 transition hover:bg-rose-500/20 hover:text-rose-400"
                aria-label="Quitar enlace"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* --- Veredicto --- */}
          {verificacion?.estado === "verificando" && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-white/50">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Comprobando el enlace…
            </p>
          )}

          {verificacion?.estado === "ok" && (
            <p className="mt-2 flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-300">
              <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />
              Enlace válido · se mostrará como{" "}
              {verificacion.tipo === "video" ? "video" : "imagen animada"}
            </p>
          )}

          {verificacion?.estado === "error" && (
            <p className="mt-2 flex gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] leading-relaxed text-rose-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{verificacion.motivo}</span>
            </p>
          )}

          {/* --- Vista previa real --- */}
          {verificacion?.estado === "ok" && (
            <div className="mt-2.5 overflow-hidden rounded-xl border border-white/10 bg-black">
              {verificacion.tipo === "video" ? (
                /* eslint-disable-next-line jsx-a11y/media-has-caption */
                <video
                  key={urlEnCurso}
                  src={urlEnCurso}
                  poster={poster}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="aspect-video w-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={urlEnCurso}
                  alt="Vista previa del enlace"
                  className="aspect-video w-full object-cover"
                />
              )}
            </div>
          )}

          <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-white/35">
            <Globe className="mt-0.5 h-3 w-3 shrink-0" />
            Enlace directo al archivo. Las páginas de YouTube, Vimeo o TikTok no
            sirven: no son archivos, son reproductores.
          </p>
        </div>
      )}
    </div>
  );
}
