"use client";

import { Hash, ShoppingBag, Utensils } from "lucide-react";

export type Modalidad = "local" | "llevar";

interface SelectorModalidadProps {
  modalidad: Modalidad;
  onCambiar: (m: Modalidad) => void;
  /** Número de mesa (solo aplica en "En local"). */
  mesa: string;
  onCambiarMesa: (mesa: string) => void;
}

/**
 * Selector de modalidad del pedido (segmented control premium).
 * - "En local" despliega el input del número de mesa.
 * - "Para llevar" hace obligatorio el nombre del cliente al pagar.
 */
export function SelectorModalidad({
  modalidad,
  onCambiar,
  mesa,
  onCambiarMesa,
}: SelectorModalidadProps) {
  return (
    <div>
      {/* Segmented control */}
      <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
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

      {/* Número de mesa (solo en local) */}
      {modalidad === "local" && (
        <div className="animate-fade-in mt-2 flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3">
          <label
            htmlFor="mesa-input"
            className="flex-1 text-sm font-medium text-gray-700"
          >
            ¿En qué mesa estás?
          </label>
          <div className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 ring-1 ring-gray-200">
            <Hash className="h-3.5 w-3.5 text-gray-400" />
            <input
              id="mesa-input"
              type="number"
              inputMode="numeric"
              min={1}
              value={mesa}
              onChange={(e) => onCambiarMesa(e.target.value)}
              placeholder="4"
              className="w-12 bg-transparent text-center text-sm font-bold text-gray-900 outline-none placeholder:text-gray-300"
            />
          </div>
        </div>
      )}

      {modalidad === "llevar" && (
        <p className="animate-fade-in mt-2 rounded-2xl bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-500">
          🥡 Te avisaremos cuando esté listo. Al pagar te pediremos tu{" "}
          <span className="font-semibold text-gray-700">nombre</span> para
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
          ? "bg-gray-900 text-white shadow-md"
          : "bg-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {icono}
      {label}
    </button>
  );
}
