"use client";

import { ShoppingBag, Utensils } from "lucide-react";

export type Modalidad = "local" | "llevar";

interface SelectorModalidadProps {
  modalidad: Modalidad;
  onCambiar: (m: Modalidad) => void;
}

/**
 * Selector de modalidad del pedido (segmented control premium).
 * - "En local": la mesa NO se pregunta, se deduce del QR escaneado (URL).
 * - "Para llevar" hace obligatorio el nombre del cliente al pagar.
 */
export function SelectorModalidad({
  modalidad,
  onCambiar,
}: SelectorModalidadProps) {
  return (
    <div>
      {/* Segmented control */}
      <div className="flex gap-1 rounded-2xl bg-white/[0.06] p-1">
        <BotonSegmento
          activo={modalidad === "local"}
          onClick={() => onCambiar("local")}
          icono={<Utensils className="h-4 w-4" />}
          label="En local"
        />
        <BotonSegmento
          activo={modalidad === "llevar"}
          onClick={() => onCambiar("llevar")}
          icono={<ShoppingBag className="h-4 w-4" />}
          label="Para llevar"
        />
      </div>

      {/* En local NO se pide la mesa: ya viene del QR escaneado. */}

      {modalidad === "llevar" && (
        <p className="animate-fade-in mt-2 rounded-2xl bg-white/[0.04] px-4 py-3 text-xs leading-relaxed text-white/50">
          🥡 Te avisaremos cuando esté listo. Al pagar te pediremos tu{" "}
          <span className="font-semibold text-white/80">nombre</span> para
          identificar la orden.
        </p>
      )}
    </div>
  );
}

function BotonSegmento({
  activo,
  onClick,
  icono,
  label,
}: {
  activo: boolean;
  onClick: () => void;
  icono: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition-all duration-200 ${
        activo
          ? "bg-white text-neutral-900 shadow-md"
          : "bg-transparent text-white/50 hover:text-white/80"
      }`}
    >
      {icono}
      {label}
    </button>
  );
}
