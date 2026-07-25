"use client";

import { useEffect, useState } from "react";
import { CreditCard, Plus, ShoppingCart, Sparkles, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";
import { useNomAI } from "./NomAIContext";

/** Tiempo que la viñeta de sugerencia permanece visible sin interacción. */
const AUTOCIERRE_MS = 6000;

interface NomAIBubbleProps {
  /** Abre el drawer del carrito (rol de cajero). */
  onPagarOrden: () => void;
  /** Solo en el Home se muestra el aviso persistente del carrito. */
  enHome: boolean;
}

/**
 * Viñeta proactiva (speech bubble) de Ñom AI que brota ARRIBA de la píldora
 * central. Tiene dos modos:
 *
 *  1. SUGERENCIA (temporal): al agregar un platillo propone su maridaje real,
 *     con acción de 1 toque. Se autocierra a los 6s o al hacer scroll.
 *  2. CAJERO (persistente): si hay artículos en el carrito y estamos en el
 *     Home, Ñom AI recuerda el total y ofrece el botón [ Pagar Orden ].
 */
export function NomAIBubble({ onPagarOrden, enHome }: NomAIBubbleProps) {
  const { burbuja, cerrarBurbuja } = useNomAI();
  const addToCart = useCartStore((s) => s.addToCart);
  const items = useCartStore((s) => s.items);
  const [saliendo, setSaliendo] = useState(false);
  // Permite ocultar el aviso de cajero si el cliente lo descarta.
  const [cajeroOculto, setCajeroOculto] = useState(false);

  const totalItems = items.reduce((a, i) => a + i.cantidad, 0);
  const totalCarrito = items.reduce((a, i) => a + i.precio * i.cantidad, 0);

  /** Cierre de la sugerencia con animación de salida. */
  const cerrarSugerencia = () => {
    setSaliendo(true);
    window.setTimeout(() => {
      setSaliendo(false);
      cerrarBurbuja();
    }, 200);
  };

  // Autocierre de la sugerencia a los 6s + cierre al hacer scroll.
  useEffect(() => {
    if (!burbuja) return;
    setSaliendo(false);

    const timer = window.setTimeout(cerrarSugerencia, AUTOCIERRE_MS);
    const alHacerScroll = () => cerrarSugerencia();
    window.addEventListener("scroll", alHacerScroll, { passive: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", alHacerScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burbuja]);

  // Si el carrito vuelve a tener algo, se reactiva el aviso de cajero.
  useEffect(() => {
    if (totalItems > 0) setCajeroOculto(false);
  }, [totalItems]);

  const anadirSugerido = () => {
    if (!burbuja?.sugerido) return;
    addToCart(burbuja.sugerido);
    cerrarSugerencia();
  };

  // La sugerencia temporal tiene prioridad sobre el aviso de cajero.
  const modoCajero = !burbuja && enHome && totalItems > 0 && !cajeroOculto;
  if (!burbuja && !modoCajero) return null;

  return (
    <div
      // No intercepta el tap de la píldora: solo la tarjeta es interactiva.
      className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-3 -translate-x-1/2"
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto relative w-72 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-gray-100 bg-white p-3 text-gray-900 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] ring-1 ring-black/5 ${
          saliendo ? "animate-bubble-out" : "animate-bubble-in"
        }`}
      >
        {/* Cerrar (discreto) */}
        <button
          type="button"
          onClick={() =>
            burbuja ? cerrarSugerencia() : setCajeroOculto(true)
          }
          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-gray-300 transition hover:bg-gray-100 hover:text-gray-600"
          aria-label="Cerrar mensaje"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {burbuja ? (
          <>
            {/* --- MODO SUGERENCIA --- */}
            <div className="flex gap-2 pr-5">
              <Sparkles
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: "var(--brand)" }}
              />
              <p className="text-[13px] font-medium leading-snug text-gray-600">
                {burbuja.mensaje}
              </p>
            </div>

            {burbuja.sugerido && (
              <button
                type="button"
                onClick={anadirSugerido}
                className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-95"
                style={{ background: "var(--brand)" }}
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                Añadir {burbuja.sugerido.nombre} ·{" "}
                {formatCurrency(burbuja.sugerido.precio)}
              </button>
            )}
          </>
        ) : (
          <>
            {/* --- MODO CAJERO (persistente en el Home) --- */}
            <div className="flex gap-2 pr-5">
              <ShoppingCart
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: "var(--brand)" }}
              />
              {/* Resumen de la orden: resalta en oscuro sobre el fondo blanco. */}
              <p className="text-[13px] font-bold leading-snug text-gray-900">
                Tienes{" "}
                <span className="font-bold text-gray-900">
                  {totalItems} platillo{totalItems === 1 ? "" : "s"}
                </span>{" "}
                por{" "}
                <span className="font-bold text-gray-900">
                  {formatCurrency(totalCarrito)}
                </span>
                . ¿Listo para pedir?
              </p>
            </div>

            <button
              type="button"
              onClick={onPagarOrden}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-95"
              style={{ background: "var(--brand)" }}
            >
              <CreditCard className="h-3.5 w-3.5" />
              Ver mi cuenta y pagar
            </button>
          </>
        )}

        {/* Flechita apuntando a la píldora central */}
        <span className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-gray-100 bg-white" />
      </div>
    </div>
  );
}
