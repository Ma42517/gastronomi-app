"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { archivoAImagen } from "@/lib/restaurante-store";

interface CampoImagenProps {
  /** Foto actual (URL remota o data URL). */
  valor?: string;
  onCambiar: (imagen: string | undefined) => void;
  /** Emoji de respaldo que se muestra si no hay foto. */
  emoji?: string;
  etiqueta?: string;
}

/**
 * SUBIDA DE IMAGEN CON VISTA PREVIA.
 *
 * Muestra la foto actual, permite reemplazarla por un archivo local y la
 * comprime antes de guardarla (ver `archivoAImagen`): una foto de celular sin
 * redimensionar no cabe en localStorage y el guardado fallaría en silencio.
 *
 * El `<input type="file" />` va oculto y se dispara desde el área visible, que
 * es mucho más grande y cómoda de tocar que el control nativo.
 */
export function CampoImagen({
  valor,
  onCambiar,
  emoji = "🍽️",
  etiqueta = "Fotografía",
}: CampoImagenProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seleccionar = async (file: File | undefined) => {
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Ese archivo no es una imagen.");
      return;
    }

    setProcesando(true);
    try {
      onCambiar(await archivoAImagen(file));
    } catch {
      setError("No se pudo procesar la imagen. Intenta con otra.");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">
        {etiqueta}
      </label>

      <div className="flex items-center gap-3">
        {/* Vista previa */}
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
          {valor ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={valor}
              alt="Vista previa"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-3xl">
              {emoji}
            </div>
          )}

          {procesando && (
            <div className="absolute inset-0 grid place-items-center bg-black/60">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={procesando}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-violet-400/60 hover:bg-violet-500/10 disabled:opacity-50"
          >
            <ImagePlus className="h-4 w-4" />
            {valor ? "Cambiar foto" : "Subir foto"}
          </button>

          {valor && (
            <button
              type="button"
              onClick={() => onCambiar(undefined)}
              className="flex items-center gap-1.5 text-xs font-semibold text-white/40 transition hover:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Quitar foto
            </button>
          )}

          <p className="text-[11px] leading-snug text-white/35">
            Se reduce a 800 px y se comprime automáticamente.
          </p>
        </div>
      </div>

      {error && <p className="mt-2 text-xs font-medium text-rose-400">{error}</p>}

      {/* Control nativo oculto: el área visible de arriba es el disparador. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void seleccionar(e.target.files?.[0]);
          // Se limpia para poder volver a elegir el MISMO archivo después.
          e.target.value = "";
        }}
      />
    </div>
  );
}
