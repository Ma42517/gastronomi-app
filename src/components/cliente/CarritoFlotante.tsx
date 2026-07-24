"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Minus, Plus, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";

interface CarritoFlotanteProps {
  onPagar: () => void;
  /** Notifica al padre cuando el detalle del carrito se abre/cierra. */
  onExpandidoChange?: (expandido: boolean) => void;
}

/**
 * Carrito flotante conectado al CartStore global.
 * Muestra en tiempo real la cantidad de artículos y el total.
 */
export function CarritoFlotante({ onPagar, onExpandidoChange }: CarritoFlotanteProps) {
  const items = useCartStore((s) => s.items);
  const addToCart = useCartStore((s) => s.addToCart);
  const removeFromCart = useCartStore((s) => s.removeFromCart);

  const [expandido, setExpandido] = useState(false);

  const totalItems = items.reduce((a, i) => a + i.cantidad, 0);
  const total = items.reduce((a, i) => a + i.precio * i.cantidad, 0);

  useEffect(() => {
    onExpandidoChange?.(expandido);
  }, [expandido, onExpandidoChange]);

  // Si el carrito queda vacío, colapsa el detalle.
  useEffect(() => {
    if (totalItems === 0 && expandido) setExpandido(false);
  }, [totalItems, expandido]);

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
          <div className="fixed inset-x-0 bottom-[72px] z-40 mx-auto max-w-md rounded-t-3xl bg-white p-5 pb-28 shadow-xl">
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
      )}

      {/* Barra flotante inferior — elevada para no chocar con la barra global de Ñom AI. */}
      <div className="fixed inset-x-0 bottom-[72px] z-40 mx-auto max-w-md p-4">
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
