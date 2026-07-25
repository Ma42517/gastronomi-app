"use client";

import { CreditCard, Minus, Plus, Sparkles, UtensilsCrossed, X } from "lucide-react";
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
 * VISTA "TU ORDEN" — PANTALLA COMPLETA (ya no es bottom sheet).
 *
 * Un bottom sheet obligaba a competir por el alto de la pantalla con el fondo
 * y dejaba el checkout comprimido. Ahora la orden es una PANTALLA propia:
 * `fixed inset-0 z-[100] h-screen w-screen bg-black overflow-y-auto`.
 *
 * Estructura:
 *   - Header FIJO (sticky): X a la izquierda, "Tu Orden" centrado.
 *   - Cuerpo con scroll: modalidad, progreso de recompensa, líneas del pedido
 *     con sus + / -, y el banner de postre de Ñom AI.
 *   - Pie FIJO: propinas, desglose y el botón de pago.
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

  const totalPiezas = items.reduce((a, i) => a + i.cantidad, 0);

  return (
    <div className="animate-fade-in fixed inset-0 z-[100] h-screen w-screen overflow-y-auto bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
        {/* ===== HEADER FIJO: X a la izquierda, título centrado ===== */}
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/10 bg-black/95 px-4 py-3 backdrop-blur-md">
          <button
            type="button"
            onClick={onCerrar}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-90"
            aria-label="Regresar al menú"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>

          <div className="min-w-0 flex-1 text-center">
            <h2 className="text-lg font-extrabold leading-tight">Tu Orden</h2>
            {totalPiezas > 0 && (
              <p className="text-[11px] font-medium text-white/40">
                {totalPiezas} {totalPiezas === 1 ? "producto" : "productos"}
              </p>
            )}
          </div>

          {/* Espaciador del mismo ancho que la X para centrar el título. */}
          <span className="h-10 w-10 shrink-0" aria-hidden />
        </header>

        {/* ===== CUERPO ===== */}
        <div className="flex-1 space-y-4 px-4 py-4">
          {/* Modalidad: comer aquí vs. para llevar (la mesa viene del QR). */}
          <SelectorModalidad
            modalidad={modalidad}
            onCambiar={onCambiarModalidad}
          />

          {/* Gatillo de upselling hacia la recompensa gratis */}
          {items.length > 0 && <BarraProgresoUpsell total={subtotal} />}

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <UtensilsCrossed
                className="h-12 w-12 text-white/15"
                strokeWidth={1.5}
              />
              <p className="mt-4 text-sm font-medium text-white/40">
                Tu orden está vacía.
              </p>
              <button
                type="button"
                onClick={onCerrar}
                className="mt-5 rounded-full bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
              >
                Ver el menú
              </button>
            </div>
          ) : (
            <>
              {/* Líneas del pedido */}
              <ul className="space-y-2.5">
                {items.map((ci) => (
                  <li
                    key={ci.id}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                  >
                    {ci.emoji ? (
                      <span className="text-2xl leading-none">{ci.emoji}</span>
                    ) : (
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-white/40">
                        <UtensilsCrossed className="h-4 w-4" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{ci.nombre}</p>
                      <p className="text-xs text-white/45">
                        {formatCurrency(ci.precio)} c/u
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => removeFromCart(ci.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 transition active:scale-90"
                        style={{
                          borderColor: "var(--brand)",
                          color: "var(--brand)",
                        }}
                        aria-label={`Quitar un ${ci.nombre}`}
                      >
                        <Minus className="h-4 w-4" strokeWidth={3} />
                      </button>
                      <span className="w-4 text-center text-sm font-bold">
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
                        className="flex h-8 w-8 items-center justify-center rounded-full text-white transition active:scale-90"
                        style={{ background: "var(--brand)" }}
                        aria-label={`Agregar un ${ci.nombre}`}
                      >
                        <Plus className="h-4 w-4" strokeWidth={3} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Banner proactivo de Ñom AI: postre ANTES de pagar */}
              {mostrarSugerencia && (
                <div
                  className="rounded-2xl border border-dashed p-4"
                  style={{
                    borderColor:
                      "color-mix(in srgb, var(--brand) 45%, transparent)",
                    background: "color-mix(in srgb, var(--brand) 12%, black)",
                  }}
                >
                  <p
                    className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide"
                    style={{ color: "var(--brand)" }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Ñom AI
                  </p>
                  <p className="text-sm leading-snug text-white/80">
                    ¿Todo listo para pagar o se te antoja un postre? 🍮
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

              {/* Propinas */}
              <ModuloPropinas
                subtotal={subtotal}
                porcentaje={porcentajePropina}
                propina={propina}
                onCambiar={onCambiarPropina}
              />
            </>
          )}
        </div>

        {/* ===== PIE FIJO: desglose + pago ===== */}
        {items.length > 0 && (
          <div className="sticky bottom-0 space-y-3 border-t border-white/10 bg-black/95 px-4 pb-5 pt-3 backdrop-blur-md">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-white/50">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {propina > 0 && (
                <div className="flex justify-between text-white/50">
                  <span>
                    Propina
                    {porcentajePropina ? ` (${porcentajePropina}%)` : ""}
                  </span>
                  <span>{formatCurrency(propina)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-white/10 pt-1.5">
                <span className="font-bold">Total</span>
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
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-bold text-white shadow-lg transition active:scale-[0.98]"
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
