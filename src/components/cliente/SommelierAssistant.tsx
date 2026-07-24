"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";

interface SommelierAssistantProps {
  /** Mensaje contextual del asistente (se re-escribe cuando cambia). */
  mensaje: string;
  /** Etiqueta del botón de acción (opcional). */
  accionLabel?: string;
  /** Acción al confirmar la sugerencia (opcional). */
  onAccion?: () => void;
}

/**
 * "Sommelier Ñom": conserje virtual de alta cocina.
 * Avatar flotante glassmorphism + burbuja con efecto typewriter.
 * White-label vía --brand.
 */
export function SommelierAssistant({
  mensaje,
  accionLabel,
  onAccion,
}: SommelierAssistantProps) {
  const [abierto, setAbierto] = useState(true);
  const [texto, setTexto] = useState("");

  const escribiendo = abierto && texto.length < mensaje.length;

  // Efecto máquina de escribir: revela el mensaje letra por letra.
  useEffect(() => {
    if (!abierto) return;
    setTexto("");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTexto(mensaje.slice(0, i));
      if (i >= mensaje.length) clearInterval(id);
    }, 22);
    return () => clearInterval(id);
  }, [abierto, mensaje]);

  return (
    <div className="fixed bottom-24 right-4 z-[60] flex flex-col items-end gap-3">
      {/* --- Burbuja de diálogo --- */}
      {abierto && (
        <div className="animate-fade-in-up relative w-64 max-w-[78vw] rounded-2xl bg-white p-3.5 pr-8 text-gray-800 shadow-2xl ring-1 ring-black/5">
          {/* Cerrar */}
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar mensaje"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Encabezado */}
          <p
            className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide"
            style={{ color: "var(--brand)" }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Sommelier Ñom
          </p>

          {/* Texto con typewriter */}
          <p className="min-h-[2.5rem] text-sm leading-snug text-gray-700">
            {texto}
            {escribiendo && (
              <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-gray-400 align-middle" />
            )}
          </p>

          {/* Acción sugerida */}
          {accionLabel && onAccion && !escribiendo && (
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={onAccion}
                className="rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-sm transition active:scale-95"
                style={{ background: "var(--brand)" }}
              >
                {accionLabel}
              </button>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-100"
              >
                Ahora no
              </button>
            </div>
          )}

          {/* Piquito hacia el avatar */}
          <div className="absolute -bottom-1.5 right-7 h-3.5 w-3.5 rotate-45 bg-white" />
        </div>
      )}

      {/* --- Avatar flotante --- */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="animate-float-avatar relative flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-neutral-900/70 text-white shadow-xl backdrop-blur-xl transition active:scale-95"
        aria-label="Abrir Sommelier Ñom"
      >
        {/* Halo de marca */}
        <span
          className="absolute inset-0 rounded-full opacity-60 blur-md"
          style={{
            background: "radial-gradient(circle, var(--brand), transparent 72%)",
          }}
        />
        {/* Anillo sutil */}
        <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/20" />
        <Sparkles
          className="relative h-6 w-6"
          style={{ color: "var(--brand)" }}
        />
      </button>
    </div>
  );
}
