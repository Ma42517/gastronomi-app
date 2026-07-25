"use client";

import { useEffect, useState } from "react";
import { BellRing, Check, ClipboardList, Flame } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Modalidad } from "./SelectorModalidad";

const PASOS = [
  {
    id: "recibida",
    titulo: "Recibida",
    detalle: "Tu orden llegó a la cocina",
    Icono: ClipboardList,
  },
  {
    id: "preparacion",
    titulo: "En preparación",
    detalle: "¡Manos a la obra en el comal!",
    Icono: Flame,
  },
  {
    id: "lista",
    titulo: "¡Lista!",
    detalle: "Pasa por ella o te la llevamos",
    Icono: BellRing,
  },
] as const;

interface RastreadorOrdenProps {
  /** Monto pagado (para el resumen). */
  total: number;
  /** Modalidad del pedido. */
  modalidad: Modalidad;
  /** Mesa (si es en local). */
  mesa?: string;
}

/**
 * Rastreador de orden animado (Order Tracker) que sustituye la pantalla
 * estática de éxito. Línea de tiempo vertical de 3 pasos que avanza sola para
 * que el cliente vea la UI "viva" y reaccionando.
 */
export function RastreadorOrden({
  total,
  modalidad,
  mesa,
}: RastreadorOrdenProps) {
  const [pasoActivo, setPasoActivo] = useState(0);

  // Simulación: avanza de "Recibida" a "En preparación" tras 4 segundos.
  useEffect(() => {
    const t = window.setTimeout(() => setPasoActivo(1), 4000);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="py-2">
      {/* Encabezado del pago */}
      <div className="mb-5 text-center">
        <span
          className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg"
          style={{
            background:
              "linear-gradient(135deg, #16a34a, color-mix(in srgb, #16a34a 55%, #4ade80))",
          }}
        >
          <Check className="h-7 w-7" strokeWidth={3} />
        </span>
        <h3 className="text-lg font-extrabold text-gray-900">¡Pago exitoso!</h3>
        <p className="mt-0.5 text-sm text-gray-500">
          {formatCurrency(total)} ·{" "}
          {modalidad === "local"
            ? `Mesa ${mesa || "—"}`
            : "Para llevar 🥡"}
        </p>
      </div>

      {/* Línea de tiempo vertical */}
      <ol className="relative space-y-1 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
        {PASOS.map((paso, i) => {
          const completado = i < pasoActivo;
          const activo = i === pasoActivo;
          const pendiente = i > pasoActivo;
          const { Icono } = paso;

          return (
            <li key={paso.id} className="flex gap-3">
              {/* Columna del ícono + conector */}
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
                    activo ? "animate-pulse shadow-lg" : ""
                  }`}
                  style={{
                    background: completado
                      ? "#16a34a"
                      : activo
                        ? "var(--brand)"
                        : "#e5e7eb",
                    color: pendiente ? "#9ca3af" : "#fff",
                  }}
                >
                  {completado ? (
                    <Check className="h-5 w-5" strokeWidth={3} />
                  ) : (
                    <Icono className="h-5 w-5" />
                  )}
                </span>
                {i < PASOS.length - 1 && (
                  <span
                    className="my-1 w-0.5 flex-1 rounded-full transition-all duration-700"
                    style={{
                      minHeight: "1.5rem",
                      background: i < pasoActivo ? "#16a34a" : "#e5e7eb",
                    }}
                  />
                )}
              </div>

              {/* Texto del paso */}
              <div className="flex-1 pb-3 pt-1.5">
                <p
                  className={`text-sm font-bold transition-colors duration-500 ${
                    pendiente ? "text-gray-400" : "text-gray-900"
                  }`}
                >
                  {paso.titulo}
                </p>
                <p className="text-xs text-gray-500">{paso.detalle}</p>
                {activo && (
                  <span
                    className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{
                      background:
                        "color-mix(in srgb, var(--brand) 14%, transparent)",
                      color: "var(--brand)",
                    }}
                  >
                    En curso
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-center text-xs font-medium text-gray-400">
        Sumaste 1 sello a tu lealtad 🎉
      </p>
    </div>
  );
}
