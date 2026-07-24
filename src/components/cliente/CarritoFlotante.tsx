"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Minus, Plus, ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { CarritoLinea } from "@/lib/mock-data";

interface CarritoFlotanteProps {
  lineas: CarritoLinea[];
  total: number;
  totalItems: number;
  onAgregar: (linea: CarritoLinea) => void;
  onQuitar: (itemId: string) => void;
  onPagar: () => void;
  /** Notifica al padre cuando el detalle del carrito se abre/cierra. */
  onExpandidoChange?: (expandido: boolean) => void;
}

export function CarritoFlotante({
  lineas,
  total,
  totalItems,
  onAgregar,
  onQuitar,
  onPagar,
  onExpandidoChange,
}: CarritoFlotanteProps) {
  const [expandido, setExpandido] = useState(false);

  // Informa al padre (para el contexto de Ñom AI). Antes del early return.
  useEffect(() => {
    onExpandidoChange?.(expandido);
  }, [expandido, onExpandidoChange]);

  if (totalItems === 0) return null;

  return (
    <>
      {/* Detalle expandible (sheet) */}
      {expandido && (
        <>
          <button
            type="button"
            aria-label="Cerrar detalle"
            onClick={() => setExpandido(false)}
            className="fixed inset-0 z-30 bg-black/40"
          />
          <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md rounded-t-3xl bg-white p-5 pb-28 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Tu orden</h3>
              <button
                type="button"
                onClick={() => setExpandido(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
                aria-label="Colapsar"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>

            <ul className="max-h-[45vh] space-y-3 overflow-y-auto">
              {lineas.map((linea) => (
                <li key={linea.item.id} className="flex items-center gap-3">
                  <span className="text-2xl">{linea.item.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {linea.item.nombre}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(linea.item.precio)} c/u
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onQuitar(linea.item.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border-2 transition active:scale-95"
                      style={{ borderColor: "var(--brand)", color: "var(--brand)" }}
                      aria-label="Quitar uno"
                    >
                      <Minus className="h-3.5 w-3.5" strokeWidth={3} />
                    </button>
                    <span className="w-4 text-center text-sm font-bold text-gray-900">
                      {linea.cantidad}
                    </span>
                    <button
                      type="button"
                      onClick={() => onAgregar(linea)}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-white transition active:scale-95"
                      style={{ background: "var(--brand)" }}
                      aria-label="Agregar uno"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* Barra flotante inferior */}
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md p-4">
        <div className="flex items-center gap-3 rounded-2xl p-2 shadow-lg" style={{ background: "var(--brand)" }}>
          <button
            type="button"
            onClick={() => setExpandido((v) => !v)}
            className="flex flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left text-white transition active:scale-[0.99]"
          >
            <span className="relative">
              <ShoppingBag className="h-6 w-6" />
              <span
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold"
                style={{ color: "var(--brand)" }}
              >
                {totalItems}
              </span>
            </span>
            <span className="text-sm font-semibold">
              {expandido ? "Ocultar orden" : "Ver orden"}
            </span>
          </button>

          <button
            type="button"
            onClick={onPagar}
            className="rounded-xl bg-white px-4 py-3 text-sm font-bold shadow-sm transition active:scale-95"
            style={{ color: "var(--brand)" }}
          >
            Pagar {formatCurrency(total)}
          </button>
        </div>
      </div>
    </>
  );
}
