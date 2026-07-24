"use client";

import { useState } from "react";
import { Check, Plus, Sparkles } from "lucide-react";
import type { SugerenciaSommelier } from "@/lib/mock-data";

interface SommelierBannerProps {
  sugerencia: SugerenciaSommelier;
  onAgregar: () => void;
}

/**
 * Banner "Sommelier Ñom AI": maridaje sugerido con borde de gradiente
 * giratorio (efecto futurista). White-label vía --brand.
 */
export function SommelierBanner({ sugerencia, onAgregar }: SommelierBannerProps) {
  const [agregado, setAgregado] = useState(false);

  const handleAgregar = () => {
    onAgregar();
    setAgregado(true);
    setTimeout(() => setAgregado(false), 1600);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-sm">
      {/* Borde: gradiente cónico giratorio */}
      <span
        aria-hidden
        className="ai-border-spin absolute left-1/2 top-1/2 aspect-square w-[150%] animate-[borderSpin_5s_linear_infinite]"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, var(--brand) 60deg, #f59e0b 120deg, #a855f7 180deg, transparent 260deg)",
        }}
      />

      {/* Contenido (deja ver 1.5px del borde animado) */}
      <div className="relative m-[1.5px] flex items-center gap-3 rounded-[22px] bg-white p-4">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
          style={{
            background:
              "linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 50%, #a855f7))",
          }}
        >
          <Sparkles className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-sm font-bold text-gray-900">
            Sugerencia Ñom AI
            <span
              className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{
                background: "color-mix(in srgb, var(--brand) 12%, white)",
                color: "color-mix(in srgb, var(--brand) 80%, black)",
              }}
            >
              Beta
            </span>
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
            <span className="font-medium text-gray-700">
              {sugerencia.titulo}:
            </span>{" "}
            {sugerencia.descripcion}
          </p>
        </div>

        <button
          type="button"
          onClick={handleAgregar}
          className="flex shrink-0 items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-white transition active:scale-95"
          style={{ background: agregado ? "#16a34a" : "var(--brand)" }}
        >
          {agregado ? (
            <>
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
              Listo
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" strokeWidth={3} />
              Agregar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
