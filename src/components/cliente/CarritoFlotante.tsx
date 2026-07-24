"use client";

import { ChevronDown, Minus, Plus, UtensilsCrossed } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";

interface CarritoFlotanteProps {
  /** Controlado por la vista: la barra de Ñom AI abre/cierra la orden. */
  abierto: boolean;
  onCerrar: () => void;
}

/**
 * Hoja (bottom sheet) con el detalle de la orden: ítems, cantidades y edición.
 * Ya NO tiene barra flotante propia ni botón de pagar: esas acciones de
 * "avanzar" viven ahora en la barra global de Ñom AI (control único inferior).
 * Este componente solo muestra/edita la orden cuando la barra lo solicita.
 */
export function CarritoFlotante({ abierto, onCerrar }: CarritoFlotanteProps) {
  const items = useCartStore((s) => s.items);
  const addToCart = useCartStore((s) => s.addToCart);
  const removeFromCart = useCartStore((s) => s.removeFromCart);

  const totalItems = items.reduce((a, i) => a + i.cantidad, 0);
  const total = items.reduce((a, i) => a + i.precio * i.cantidad, 0);

  if (!abierto || totalItems === 0) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar detalle"
        onClick={onCerrar}
        className="animate-backdrop-in fixed inset-0 z-30 bg-black/40"
      />
      <div className="animate-sheet-up fixed inset-x-0 bottom-[84px] z-40 mx-auto max-w-md rounded-t-3xl bg-white p-5 pb-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h3 className="text-lg font-bold text-gray-900">Tu orden</h3>
            <span className="text-sm font-medium text-gray-400">
              {formatCurrency(total)}
            </span>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
            aria-label="Cerrar"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        <ul className="max-h-[45vh] space-y-3 overflow-y-auto">
          {items.map((ci) => (
            <li key={ci.id} className="flex items-center gap-3">
              {ci.emoji ? (
                <span className="text-2xl">{ci.emoji}</span>
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-gray-100 text-gray-400">
                  <UtensilsCrossed className="h-4 w-4" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {ci.nombre}
                </p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(ci.precio)} c/u
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => removeFromCart(ci.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 transition active:scale-95"
                  style={{ borderColor: "var(--brand)", color: "var(--brand)" }}
                  aria-label="Quitar uno"
                >
                  <Minus className="h-3.5 w-3.5" strokeWidth={3} />
                </button>
                <span className="w-4 text-center text-sm font-bold text-gray-900">
                  {ci.cantidad}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    addToCart({
                      id: ci.id,
                      nombre: ci.nombre,
                      precio: ci.precio,
                      emoji: ci.emoji,
                    })
                  }
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
  );
}
