"use client";

import {
  ChevronDown,
  CreditCard,
  Minus,
  Plus,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";
import type { MenuItemMock } from "@/lib/mock-data";
import { BarraProgresoUpsell } from "./BarraProgresoUpsell";
import { ModuloPropinas } from "./ModuloPropinas";
import { SelectorModalidad, type Modalidad } from "./SelectorModalidad";

interface CarritoDrawerProps {
  abierto: boolean;
  onCerrar: () => void;
  /** Pago FINAL: va directo a la pasarela/checkout. NUNCA se interrumpe. */
  onPagar: () => void;
  /** Postre sugerido (banner proactivo ANTES de pagar). */
  sugerido: MenuItemMock | null;
  onAgregarSugerido: () => void;
  // --- Módulos operativos (estado en el padre para que el checkout lo use) ---
  modalidad: Modalidad;
  onCambiarModalidad: (m: Modalidad) => void;
  propina: number;
  porcentajePropina: number | null;
  onCambiarPropina: (porcentaje: number | null, monto: number) => void;
}

/**
 * Drawer del carrito (bottom sheet) — INDEPENDIENTE del chat de Ñom AI.
 * No tiene caja de mensajes: es una vista de compra pura. Orden vertical:
 *  1) Header "Tu orden"
 *  2) Lista de productos con + / -
 *  3) Banner proactivo de la IA (sugerencia de postre ANTES de pagar)
 *  4) Botón de pago final (va directo al checkout, sin interrupciones)
 */
export function CarritoDrawer({
  abierto,
  onCerrar,
  onPagar,
  sugerido,
  onAgregarSugerido,
  modalidad,
  onCambiarModalidad,
  propina,
  porcentajePropina,
  onCambiarPropina,
}: CarritoDrawerProps) {
  const items = useCartStore((s) => s.items);
  const addToCart = useCartStore((s) => s.addToCart);
  const removeFromCart = useCartStore((s) => s.removeFromCart);
  const subtotal = items.reduce((a, i) => a + i.precio * i.cantidad, 0);
  // Total exacto (a centavos) = subtotal + propina.
  const total = Math.round((subtotal + propina) * 100) / 100;

  if (!abierto) return null;

  // El postre solo se sugiere si aún no está en la orden.
  const sugeridoEnCarrito = sugerido
    ? items.some((i) => i.id === sugerido.id)
    : false;
  const mostrarSugerencia =
    sugerido !== null && !sugeridoEnCarrito && items.length > 0;

  return (
    <div className="fixed inset-0 z-[60] flex justify-center">
      <button
        type="button"
        aria-label="Cerrar carrito"
        onClick={onCerrar}
        className="animate-backdrop-in absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div className="animate-sheet-up relative mt-auto flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-2.5">
          <span className="block h-1.5 w-12 rounded-full bg-gray-300" />
        </div>

        {/* 1) HEADER */}
        <div className="flex items-center justify-between px-5 pb-3 pt-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-xl font-extrabold text-gray-900">Tu orden</h2>
            <span className="text-sm font-medium text-gray-400">
              {items.length} {items.length === 1 ? "ítem" : "ítems"}
            </span>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100"
            aria-label="Cerrar"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        {/* 1.2) MODALIDAD: comer aquí vs. para llevar.
              La mesa NO se pide aquí: se obtiene del QR escaneado. */}
        <div className="px-5 pb-3">
          <SelectorModalidad
            modalidad={modalidad}
            onCambiar={onCambiarModalidad}
          />
        </div>

        {/* 1.5) GATILLO DE UPSELLING: progreso hacia la recompensa gratis */}
        {items.length > 0 && (
          <div className="px-5 pb-3">
            <BarraProgresoUpsell total={subtotal} />
          </div>
        )}

        {/* 2) LISTA DE PRODUCTOS + 3) BANNER (scroll) */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {items.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-400">
              Tu orden está vacía.
            </p>
          ) : (
            <>
              <ul className="space-y-4">
                {items.map((ci) => (
                  <li key={ci.id} className="flex items-center gap-3">
                    {ci.emoji ? (
                      <span className="text-2xl">{ci.emoji}</span>
                    ) : (
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-gray-100 text-gray-400">
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
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => removeFromCart(ci.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 transition active:scale-95"
                        style={{
                          borderColor: "var(--brand)",
                          color: "var(--brand)",
                        }}
                        aria-label={`Quitar un ${ci.nombre}`}
                      >
                        <Minus className="h-4 w-4" strokeWidth={3} />
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
                        className="flex h-8 w-8 items-center justify-center rounded-full text-white transition active:scale-95"
                        style={{ background: "var(--brand)" }}
                        aria-label={`Agregar un ${ci.nombre}`}
                      >
                        <Plus className="h-4 w-4" strokeWidth={3} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* 3) BANNER PROACTIVO DE IA — sugerencia ANTES de pagar (no es chat) */}
              {mostrarSugerencia && (
                <div
                  className="mt-5 rounded-2xl border border-dashed p-4"
                  style={{
                    borderColor: "color-mix(in srgb, var(--brand) 45%, transparent)",
                    background: "color-mix(in srgb, var(--brand) 6%, white)",
                  }}
                >
                  <p
                    className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide"
                    style={{ color: "var(--brand)" }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Ñom AI
                  </p>
                  <p className="text-sm leading-snug text-gray-700">
                    Aquí tienes tu orden. ¿Todo listo para pagar o se te antoja un
                    postre? 🍮
                  </p>
                  <button
                    type="button"
                    onClick={onAgregarSugerido}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-sm transition active:scale-[0.98]"
                    style={{ background: "var(--brand)" }}
                  >
                    <Plus className="h-4 w-4" strokeWidth={3} />
                    Añadir {sugerido.nombre} · {formatCurrency(sugerido.precio)}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* 4) PROPINAS + DESGLOSE + PAGO FINAL (directo al checkout) */}
        {items.length > 0 && (
          <div className="shrink-0 space-y-3 border-t border-gray-100 p-5 pb-6">
            {/* Módulo de propinas (fricción cero) */}
            <ModuloPropinas
              subtotal={subtotal}
              porcentaje={porcentajePropina}
              propina={propina}
              onCambiar={onCambiarPropina}
            />

            {/* Desglose exacto */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {propina > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>
                    Propina
                    {porcentajePropina ? ` (${porcentajePropina}%)` : ""}
                  </span>
                  <span>{formatCurrency(propina)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-gray-100 pt-1.5">
                <span className="font-bold text-gray-900">Total</span>
                <span
                  className="text-lg font-extrabold"
                  style={{ color: "var(--brand)" }}
                >
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onPagar}
              className="flex w-full items-center justify-center gap-2 rounded-3xl px-6 py-4 text-base font-bold text-white shadow-lg transition active:scale-[0.98]"
              style={{ background: "var(--brand)" }}
            >
              <CreditCard className="h-5 w-5" />
              Pagar {formatCurrency(total)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
