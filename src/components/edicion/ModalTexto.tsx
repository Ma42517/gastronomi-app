"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

/**
 * EDICIÓN DE UN TEXTO SUELTO — modal mínimo y reutilizable.
 *
 * Lo usan tres sitios del editor en vivo: el nombre del restaurante, su eslogan y
 * el nombre de una categoría. Los tres son "un texto y aceptar", así que
 * comparten componente en lugar de tener tres modales casi idénticos que después
 * habría que mantener por separado.
 *
 * SOBRE LA EDICIÓN "INLINE"
 * Se pidió poder editar la categoría en el sitio o con un modal pequeño. Se eligió
 * el modal: la edición dentro del propio texto obliga a resolver el guardado
 * ambiguo (¿al perder el foco? ¿con Enter?) y en un teléfono el teclado tapa
 * justo la línea que se está escribiendo. Un modal deja claro cuándo se acepta y
 * cuándo se cancela.
 */

interface ModalTextoProps {
  abierto: boolean;
  titulo: string;
  etiqueta: string;
  valorInicial: string;
  /** Aclaración bajo el campo, para explicar consecuencias. */
  ayuda?: string;
  /** Nº de líneas. Más de una convierte el campo en `<textarea>`. */
  lineas?: number;
  /** Si devuelve un texto, se muestra como error y no se cierra. */
  onGuardar: (valor: string) => Promise<string | void>;
  onCerrar: () => void;
  /** Permite dejarlo vacío (el eslogan sí, el nombre no). */
  permitirVacio?: boolean;
}

export function ModalTexto({
  abierto,
  titulo,
  etiqueta,
  valorInicial,
  ayuda,
  lineas = 1,
  onGuardar,
  onCerrar,
  permitirVacio = false,
}: ModalTextoProps) {
  const [valor, setValor] = useState(valorInicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al abrir se recarga el valor: si no, reabrir el modal mostraría lo que se
  // tecleó la vez anterior.
  useEffect(() => {
    if (abierto) {
      setValor(valorInicial);
      setError(null);
    }
  }, [abierto, valorInicial]);

  if (!abierto) return null;

  const guardar = async () => {
    const limpio = valor.trim();
    if (!limpio && !permitirVacio) {
      setError("No puede quedar vacío.");
      return;
    }

    setGuardando(true);
    const fallo = await onGuardar(limpio);
    setGuardando(false);

    if (typeof fallo === "string") {
      setError(fallo);
      return;
    }
    onCerrar();
  };

  const clases =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-400/60";

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onCerrar}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#12121a] text-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <h2 className="truncate text-lg font-bold">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-2 px-5 py-5">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">
            {etiqueta}
          </label>

          {lineas > 1 ? (
            <textarea
              autoFocus
              rows={lineas}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className={`${clases} resize-none`}
            />
          ) : (
            <input
              autoFocus
              type="text"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              // Enter acepta: en un campo de una línea es lo que espera todo el
              // mundo, y ahorra ir a buscar el botón.
              onKeyDown={(e) => {
                if (e.key === "Enter") void guardar();
              }}
              className={clases}
            />
          )}

          {ayuda && (
            <p className="text-[11px] leading-snug text-white/35">{ayuda}</p>
          )}

          {error && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium leading-relaxed text-rose-300">
              {error}
            </p>
          )}
        </div>

        <footer className="flex items-center gap-3 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={onCerrar}
            className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-bold text-white/70 transition hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void guardar()}
            disabled={guardando}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500 active:scale-[0.98] disabled:opacity-50"
          >
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </button>
        </footer>
      </div>
    </div>
  );
}
