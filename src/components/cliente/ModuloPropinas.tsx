"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

/** Porcentajes de propina rápidos. */
const PORCENTAJES = [10, 15, 20];

interface ModuloPropinasProps {
  /** Subtotal de la orden (base del cálculo). */
  subtotal: number;
  /** Porcentaje elegido (null = sin propina o monto personalizado). */
  porcentaje: number | null;
  /** Monto de propina resultante. */
  propina: number;
  /** Reporta el nuevo porcentaje y monto exacto. */
  onCambiar: (porcentaje: number | null, monto: number) => void;
}

/**
 * Módulo de propinas de fricción cero: pills de 10/15/20% + monto libre.
 * El cálculo se hace SIEMPRE sobre el subtotal de la orden y se redondea a
 * centavos para que el total final sea exacto.
 */
export function ModuloPropinas({
  subtotal,
  porcentaje,
  propina,
  onCambiar,
}: ModuloPropinasProps) {
  const [modoLibre, setModoLibre] = useState(false);
  const [montoLibre, setMontoLibre] = useState("");

  /** Redondeo a 2 decimales para evitar errores de punto flotante. */
  const calcular = (pct: number) => Math.round(subtotal * pct) / 100;

  const elegirPorcentaje = (pct: number) => {
    setModoLibre(false);
    setMontoLibre("");
    // Si se vuelve a tocar el mismo porcentaje, se quita la propina.
    if (porcentaje === pct) {
      onCambiar(null, 0);
      return;
    }
    onCambiar(pct, calcular(pct));
  };

  const activarLibre = () => {
    setModoLibre(true);
    onCambiar(null, 0);
  };

  const cambiarMontoLibre = (valor: string) => {
    setMontoLibre(valor);
    const monto = Math.max(0, Math.round(parseFloat(valor || "0") * 100) / 100);
    onCambiar(null, Number.isFinite(monto) ? monto : 0);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-white">
        <Heart className="h-4 w-4" style={{ color: "var(--brand)" }} />
        Agradece a tu equipo
      </p>
      <p className="mb-3 text-xs text-white/45">
        El 100% de la propina va directo al personal.
      </p>

      <div className="flex gap-2">
        {PORCENTAJES.map((pct) => {
          const activo = porcentaje === pct && !modoLibre;
          return (
            <button
              key={pct}
              type="button"
              onClick={() => elegirPorcentaje(pct)}
              aria-pressed={activo}
              className="flex-1 rounded-xl border-2 py-2.5 text-sm font-bold transition active:scale-95"
              style={
                activo
                  ? {
                      borderColor: "var(--brand)",
                      background: "var(--brand)",
                      color: "#fff",
                    }
                  : {
                      borderColor: "rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.7)",
                    }
              }
            >
              {pct}%
            </button>
          );
        })}
        <button
          type="button"
          onClick={activarLibre}
          aria-pressed={modoLibre}
          className="flex-1 rounded-xl border-2 py-2.5 text-sm font-bold transition active:scale-95"
          style={
            modoLibre
              ? {
                  borderColor: "var(--brand)",
                  background: "var(--brand)",
                  color: "#fff",
                }
              : {
                  borderColor: "rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.7)",
                }
          }
        >
          Otro
        </button>
      </div>

      {/* Monto personalizado */}
      {modoLibre && (
        <div className="animate-fade-in mt-2.5 flex items-center gap-2 rounded-xl bg-black/40 px-3 py-2 ring-1 ring-white/15">
          <span className="text-sm font-bold text-white/40">$</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="1"
            value={montoLibre}
            onChange={(e) => cambiarMontoLibre(e.target.value)}
            placeholder="0.00"
            className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/25"
            aria-label="Monto de propina personalizado"
          />
        </div>
      )}

      {propina > 0 && (
        <p className="mt-2.5 text-xs font-semibold text-white/60">
          Propina: {formatCurrency(propina)} · ¡Gracias de parte del equipo! 🙌
        </p>
      )}
    </div>
  );
}
