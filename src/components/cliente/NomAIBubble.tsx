"use client";

import { useEffect, useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";
import { useNomAI } from "./NomAIContext";

/** Tiempo que la viñeta permanece visible sin interacción. */
const AUTOCIERRE_MS = 6000;

/**
 * Viñeta proactiva (speech bubble) de Ñom AI.
 *
 * Brota justo ARRIBA de la píldora central de la barra flotante con una
 * animación de flotación (fade + scale). Trae un mensaje reactivo y un
 * mini-botón para añadir el complemento con un solo toque.
 * Se cierra sola tras 6s, al hacer scroll, o con la ✕ discreta.
 */
export function NomAIBubble() {
  const { burbuja, cerrarBurbuja } = useNomAI();
  const addToCart = useCartStore((s) => s.addToCart);
  const [saliendo, setSaliendo] = useState(false);

  /** Cierre con animación de salida. */
  const cerrar = () => {
    setSaliendo(true);
    window.setTimeout(() => {
      setSaliendo(false);
      cerrarBurbuja();
    }, 200);
  };

  // Autocierre a los 6s + cierre al hacer scroll.
  useEffect(() => {
    if (!burbuja) return;
    setSaliendo(false);

    const timer = window.setTimeout(cerrar, AUTOCIERRE_MS);
    const alHacerScroll = () => cerrar();
    window.addEventListener("scroll", alHacerScroll, { passive: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", alHacerScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burbuja]);

  if (!burbuja) return null;

  const { mensaje, sugerido } = burbuja;

  const anadirSugerido = () => {
    if (!sugerido) return;
    addToCart(sugerido);
    cerrar();
  };

  return (
    <div
      // No intercepta el tap de la píldora: solo la tarjeta es interactiva.
      className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-3 -translate-x-1/2"
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto relative w-72 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-zinc-700/80 bg-zinc-900/95 p-3 text-white shadow-2xl backdrop-blur-md ${
          saliendo ? "animate-bubble-out" : "animate-bubble-in"
        }`}
      >
        {/* Cerrar (discreto) */}
        <button
          type="button"
          onClick={cerrar}
          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"
          aria-label="Cerrar sugerencia"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Mensaje reactivo */}
        <div className="flex gap-2 pr-5">
          <Sparkles
            className="mt-0.5 h-4 w-4 shrink-0"
            style={{ color: "var(--brand)" }}
          />
          <p className="text-[13px] font-medium leading-snug text-white/90">
            {mensaje}
          </p>
        </div>

        {/* Acción directa de 1 toque */}
        {sugerido && (
          <button
            type="button"
            onClick={anadirSugerido}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-95"
            style={{ background: "var(--brand)" }}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={3} />
            Añadir {sugerido.nombre} · {formatCurrency(sugerido.precio)}
          </button>
        )}

        {/* Flechita apuntando a la píldora central */}
        <span className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-zinc-700/80 bg-zinc-900/95" />
      </div>
    </div>
  );
}
