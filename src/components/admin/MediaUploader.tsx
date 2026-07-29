"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Film,
  ImagePlus,
  Link2,
  Loader2,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { archivoAImagen } from "@/lib/restaurante-store";
import {
  IMAGENES_OK,
  VIDEOS_OK,
  subirMedia,
  type BucketMedia,
} from "@/lib/subir-media";
import { puedeReproducirse } from "@/lib/verificar-media";

/**
 * SUBIDA DE MULTIMEDIA CON ARRASTRAR Y SOLTAR.
 *
 * Sustituye a los dos campos que había antes (el de foto, que comprimía a base64,
 * y el de video, que solo aceptaba una URL pegada a mano) por una sola pieza que
 * sube el archivo a Supabase Storage y guarda su enlace público.
 *
 * SOBRE EL ASPECTO
 * No introduce ni un color nuevo: el borde, el fondo y el radio son los mismos
 * que los `<input>` del panel (`rounded-xl border-white/10 bg-white/[0.04]`), y
 * el resalte al arrastrar usa el violeta que ya identifica esta zona. La única
 * diferencia deliberada es el borde discontinuo, porque es la convención que
 * indica "aquí se puede soltar algo".
 *
 * SE CONSERVA LA OPCIÓN DE PEGAR UN ENLACE
 * Plegada, pero presente: si el restaurante ya tiene sus videos en un CDN, subir
 * copias a Storage sería duplicar el gasto sin motivo.
 */

interface MediaUploaderProps {
  /** URL actual (o data URL heredada de la versión anterior). */
  valor?: string;
  onCambiar: (url: string | undefined) => void;
  tipo: "imagen" | "video";
  bucket: BucketMedia;
  etiqueta: string;
  /** Se marca como opcional en la etiqueta. */
  opcional?: boolean;
  /** Foto que sirve de `poster` en la vista previa del video. */
  poster?: string;
  /** Emoji de respaldo cuando todavía no hay imagen (platillos). */
  emoji?: string;
  ayuda?: string;
  /**
   * Restringe los tipos MIME por encima de lo que permite `tipo`. Lo usa el
   * modo GIF, que es una imagen pero NO admite JPG ni PNG: un PNG estático en el
   * lugar del video dejaría la tarjeta sin movimiento y sin explicación.
   */
  tiposAceptados?: string[];
  /** Oculta el campo de enlace manual (lo aporta el selector de pestañas). */
  sinEnlaceManual?: boolean;
  /** Texto de la invitación a soltar, cuando "imagen"/"video" no describe bien. */
  descripcion?: string;
}

/** Extensiones que un `<video>` de HTML5 reproduce de forma fiable. */
const FORMATOS_VIDEO = [".mp4", ".webm", ".mov", ".m4v"];

/** Dominios que NO sirven un archivo directo (son páginas de reproductor). */
const PLATAFORMAS = ["youtube.com", "youtu.be", "vimeo.com", "tiktok.com"];

export function MediaUploader({
  valor,
  onCambiar,
  tipo,
  bucket,
  etiqueta,
  opcional = false,
  poster,
  emoji = "🍽️",
  ayuda,
  tiposAceptados,
  sinEnlaceManual = false,
  descripcion,
}: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [mostrarUrl, setMostrarUrl] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);

  /**
   * Vista previa del archivo LOCAL, antes de que exista en Storage.
   *
   * Se pinta desde un `blob:` de `URL.createObjectURL`, así que aparece al
   * instante y sin gastar red. Cumple dos funciones: el dueño ve de inmediato lo
   * que eligió, y si el archivo está dañado se nota antes de subir nada.
   */
  const [previaLocal, setPreviaLocal] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);

  /**
   * Los `blob:` hay que revocarlos a mano: el navegador los mantiene vivos —con
   * su memoria— hasta que se cierra la pestaña. Sin esto, probar diez videos en
   * una sesión de edición deja diez archivos retenidos.
   */
  const liberarPrevia = (url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  };
  useEffect(() => () => liberarPrevia(previaLocal), [previaLocal]);

  /**
   * Contador de eventos de arrastre.
   *
   * `dragleave` se dispara también al pasar por encima de los hijos del área, así
   * que con un simple booleano el resalte parpadearía al mover el ratón por
   * dentro. Contando entradas y salidas solo se apaga cuando de verdad se sale.
   */
  const profundidad = useRef(0);

  const esImagen = tipo === "imagen";
  const aceptados = tiposAceptados ?? (esImagen ? IMAGENES_OK : VIDEOS_OK);

  /**
   * Qué se pinta en la miniatura. La previa local tiene prioridad sobre el valor
   * guardado: mientras sube, lo que el dueño acaba de elegir es más informativo
   * que lo que había antes.
   */
  const mostrado = previaLocal ?? valor;
  const esPrevia = previaLocal !== null;

  const procesar = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setAviso(null);
    setErrorCarga(false);

    // Se comprueba contra los tipos de ESTE campo: quien suelta un video en el
    // hueco de la foto debe saber por qué no funcionó.
    if (!aceptados.includes(file.type)) {
      setError(
        `Formato no admitido aquí (${file.type || "tipo desconocido"}). Se aceptan: ${aceptados
          .map((t) => t.split("/")[1].toUpperCase())
          .join(", ")}.`,
      );
      return;
    }

    // --- 1) VISTA PREVIA INMEDIATA Y VERIFICACIÓN LOCAL ---
    // Se comprueba que el navegador pueda reproducirlo ANTES de subir. Un archivo
    // dañado o con un códec exótico se detecta aquí, sin gastar la subida ni
    // dejar basura en el almacenamiento.
    liberarPrevia(previaLocal);
    const blobUrl = URL.createObjectURL(file);
    setPreviaLocal(blobUrl);
    setVerificando(true);

    const reproducible = await puedeReproducirse(
      blobUrl,
      esImagen ? "imagen" : "video",
    );
    setVerificando(false);

    if (!reproducible) {
      liberarPrevia(blobUrl);
      setPreviaLocal(null);
      setError(
        esImagen
          ? "El archivo no se pudo abrir como imagen. Puede estar dañado o no ser realmente una imagen."
          : "El archivo no se pudo reproducir. Puede estar dañado o usar un códec que el navegador no entiende (prueba a exportarlo como MP4 H.264).",
      );
      return;
    }

    // --- 2) SUBIDA ---
    setSubiendo(true);
    try {
      const res = await subirMedia(file, bucket);

      if (res.ok) {
        onCambiar(res.url);
        // Ya hay URL definitiva: la previa local sobra y su memoria se devuelve.
        liberarPrevia(blobUrl);
        setPreviaLocal(null);
        return;
      }

      // RESPALDO SOLO PARA IMÁGENES.
      // Si Storage no está instalado todavía, la foto se comprime y se guarda
      // como antes: el dueño puede seguir trabajando. Con un video no se hace lo
      // mismo a propósito — meter megabytes en una columna de texto haría que
      // cada lectura del menú los arrastrase, que es justo lo que se evitó.
      if (res.sinStorage && esImagen && file.type !== "image/gif") {
        onCambiar(await archivoAImagen(file));
        liberarPrevia(blobUrl);
        setPreviaLocal(null);
        setAviso(
          "El almacenamiento no está disponible, así que la foto se guardó comprimida en la base de datos.",
        );
        return;
      }

      // Sin respaldo posible: se descarta la previa para no aparentar que quedó
      // guardado algo que no se subió.
      liberarPrevia(blobUrl);
      setPreviaLocal(null);
      setError(res.error);
    } catch {
      liberarPrevia(blobUrl);
      setPreviaLocal(null);
      setError("No se pudo procesar el archivo. Intenta con otro.");
    } finally {
      setSubiendo(false);
    }
  };

  // --- Avisos sobre una URL pegada a mano ---
  const url = valor?.trim() ?? "";
  const enMinusculas = url.toLowerCase();
  const esPlataforma =
    !esImagen && PLATAFORMAS.some((d) => enMinusculas.includes(d));
  const sinFormatoConocido =
    !esImagen &&
    url.length > 0 &&
    !esPlataforma &&
    !url.startsWith("data:") &&
    !FORMATOS_VIDEO.some((ext) => enMinusculas.split("?")[0].endsWith(ext));

  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-white/50">
        {esImagen ? (
          <ImagePlus className="h-3.5 w-3.5" />
        ) : (
          <Film className="h-3.5 w-3.5" />
        )}
        {etiqueta}
        {opcional && (
          <span className="font-normal normal-case text-white/30">(opcional)</span>
        )}
      </label>

      {/* ===== ÁREA DE ARRASTRE ===== */}
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          profundidad.current += 1;
          setArrastrando(true);
        }}
        onDragOver={(e) => {
          // Sin esto el navegador abre el archivo en una pestaña nueva en lugar
          // de dejarlo soltar.
          e.preventDefault();
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          profundidad.current -= 1;
          if (profundidad.current <= 0) {
            profundidad.current = 0;
            setArrastrando(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          profundidad.current = 0;
          setArrastrando(false);
          void procesar(e.dataTransfer.files?.[0]);
        }}
        // Identifica la zona y su tipo. Sirve de anclaje estable para las
        // pruebas automatizadas, que de otro modo tendrían que apoyarse en
        // clases de Tailwind y se romperían con cualquier ajuste visual.
        data-zona-media={tipo}
        className={`relative overflow-hidden rounded-xl border border-dashed transition ${
          arrastrando
            ? "border-violet-400/60 bg-violet-500/10"
            : "border-white/20 bg-white/[0.04]"
        }`}
      >
        {mostrado ? (
          /* --- CON CONTENIDO: miniatura + acciones --- */
          <div className="flex items-stretch gap-3 p-3">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black">
              {esImagen ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mostrado}
                  alt="Vista previa"
                  onError={() => setErrorCarga(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                /* eslint-disable-next-line jsx-a11y/media-has-caption */
                <video
                  key={mostrado}
                  src={mostrado}
                  poster={poster}
                  autoPlay
                  loop
                  muted
                  playsInline
                  onError={() => setErrorCarga(true)}
                  className="h-full w-full object-cover"
                />
              )}

              {/* Distingue lo que ya está guardado de lo que solo se está
                  viendo en local, para que nadie cierre el modal creyendo que
                  la subida terminó. */}
              {esPrevia && (
                <span className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-white/70">
                  sin subir
                </span>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={subiendo}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/[0.12] disabled:opacity-50"
              >
                <UploadCloud className="h-4 w-4" />
                Reemplazar
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setErrorCarga(false);
                    setAviso(null);
                    onCambiar(undefined);
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white/40 transition hover:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Quitar
                </button>

                <button
                  type="button"
                  onClick={() => setMostrarUrl((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white/40 transition hover:text-white/70"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Enlace
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* --- VACÍO: invitación a soltar --- */
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
            className="flex w-full flex-col items-center justify-center gap-1.5 px-4 py-7 text-center transition disabled:opacity-50"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.06] text-white/40">
              {esImagen ? (
                <ImagePlus className="h-5 w-5" />
              ) : (
                <Film className="h-5 w-5" />
              )}
            </span>
            <span className="text-sm font-semibold text-white/80">
              Arrastra {descripcion ?? (esImagen ? "una imagen" : "un video")} o
              toca para elegir
            </span>
            <span className="text-[11px] text-white/35">
              {aceptados.map((t) => t.split("/")[1].toUpperCase()).join(", ")} ·
              hasta {bucket === "dish-media" ? "50" : "25"} MB
            </span>
          </button>
        )}

        {/* Emoji de respaldo del platillo, para que el hueco no se vea muerto */}
        {!mostrado && esImagen && emoji && (
          <span className="pointer-events-none absolute right-3 top-3 text-2xl opacity-30">
            {emoji}
          </span>
        )}

        {/* --- Indicador de carga: cubre el área entera ---
            Se distinguen las dos fases porque tardan cosas distintas y el dueño
            merece saber si está esperando a su disco o a la red. */}
        {(verificando || subiendo) && (
          <div className="absolute inset-0 grid place-items-center gap-2 bg-black/70">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-violet-300" />
              <p className="text-xs font-semibold text-white/70">
                {verificando ? "Comprobando el archivo…" : "Subiendo…"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ===== ENLACE MANUAL (plegado) ===== */}
      {!sinEnlaceManual && !valor && (
        <button
          type="button"
          onClick={() => setMostrarUrl((v) => !v)}
          className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-white/35 transition hover:text-white/60"
        >
          <Link2 className="h-3 w-3" />
          {mostrarUrl ? "Ocultar" : "o pega un enlace"}
        </button>
      )}

      {!sinEnlaceManual && mostrarUrl && (
        <input
          type="url"
          value={valor ?? ""}
          onChange={(e) => {
            setErrorCarga(false);
            setError(null);
            // Cadena vacía -> undefined, para que se guarde como null y el
            // contenido quede realmente borrado.
            onCambiar(e.target.value.trim() || undefined);
          }}
          placeholder={esImagen ? "https://…/foto.jpg" : "https://…/video.mp4"}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-400/60"
        />
      )}

      {/* ===== MENSAJES ===== */}
      {error && (
        <p className="mt-2 flex gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] leading-relaxed text-rose-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {aviso && (
        <p className="mt-2 flex gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{aviso}</span>
        </p>
      )}

      {esPlataforma && (
        <p className="mt-2 flex gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Los enlaces de YouTube, Vimeo o TikTok no funcionan aquí: son páginas
            de reproductor, no archivos de video. Sube el archivo o usa un enlace
            directo a un <strong>.mp4</strong>.
          </span>
        </p>
      )}

      {sinFormatoConocido && (
        <p className="mt-2 text-[11px] leading-relaxed text-amber-300/80">
          El enlace no termina en .mp4, .webm o .mov. Puede funcionar igual, pero
          revisa la vista previa antes de guardar.
        </p>
      )}

      {errorCarga && (
        <p className="mt-2 flex gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] leading-relaxed text-rose-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {esImagen
              ? "La imagen no se pudo cargar. Comprueba que el enlace sea público."
              : "El video no se pudo cargar. Comprueba que el enlace sea público y directo al archivo. En el menú se mostrará la foto."}
          </span>
        </p>
      )}

      {ayuda && (
        <p className="mt-1.5 text-[11px] leading-snug text-white/35">{ayuda}</p>
      )}

      {/* Control nativo oculto: el área de arriba es el disparador. */}
      <input
        ref={inputRef}
        type="file"
        accept={aceptados.join(",")}
        className="hidden"
        onChange={(e) => {
          void procesar(e.target.files?.[0]);
          // Se limpia para poder volver a elegir el MISMO archivo después.
          e.target.value = "";
        }}
      />
    </div>
  );
}
