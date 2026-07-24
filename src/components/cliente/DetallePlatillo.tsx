"use client";

import { useEffect, useState } from "react";
import { Check, Plus, UtensilsCrossed, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";
import type { MenuItemMock } from "@/lib/mock-data";

interface DetallePlatilloProps {
  abierto: boolean;
  item: MenuItemMock | null;
  onCerrar: () => void;
}

/**
 * Detalle premium (dark) para CUALQUIER platillo del menú.
 * Si no hay foto, usa un placeholder elegante (cubiertos) para no romper la
 * estética. Conectado al carrito global (addToCart).
 */
export function DetallePlatillo({ abierto, item, onCerrar }: DetallePlatilloProps) {
  const addToCart = useCartStore((s) => s.addToCart);
  const [agregado, setAgregado] = useState(false);

  useEffect(() => {
    if (abierto) setAgregado(false);
  }, [abierto, item?.id]);

  if (!abierto || !item) return null;

  const agregar = () => {
    addToCart({
      id: item.id,
      nombre: item.nombre,
      precio: item.precio,
      emoji: item.emoji,
    });
    setAgregado(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onCerrar}
        className="animate-backdrop-in absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="animate-sheet-up relative mt-auto flex w-full max-w-md flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-neutral-900/90 text-white shadow-2xl backdrop-blur-2xl">
        {/* Visual (placeholder premium si no hay foto) */}
        <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--brand, #DC2626) 32%, #18181b), #0a0a0a 78%)",
            }}
          />
          <div className="absolute inset-0 grid place-items-center">
            <UtensilsCrossed className="h-16 w-16 text-white/25" />
          </div>

          <div className="absolute left-1/2 top-2.5 -translate-x-1/2">
            <span className="block h-1.5 w-12 rounded-full bg-white/50" />
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur-md transition hover:bg-black/60"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Información */}
        <div className="space-y-2 px-5 pb-2 pt-5">
          <h2 className="text-2xl font-extrabold leading-tight">
            {item.nombre}
          </h2>
          <p className="text-sm leading-relaxed text-white/55">
            {item.descripcion}
          </p>
          <p
            className="pt-1 text-xl font-bold"
            style={{ color: "var(--brand, #DC2626)" }}
          >
            {formatCurrency(item.precio)}
          </p>
        </div>

        {/* Barra inferior */}
        <div className="border-t border-white/10 bg-neutral-900/60 p-4 pb-6 backdrop-blur-md">
          <button
            type="button"
            onClick={agregar}
            disabled={agregado || !item.disponible}
            className="flex w-full items-center justify-center gap-2 rounded-3xl px-6 py-4 text-base font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-70"
            style={{ background: agregado ? "#16a34a" : "var(--brand, #DC2626)" }}
          >
            {!item.disponible ? (
              "No disponible"
            ) : agregado ? (
              <>
                <Check className="h-5 w-5" strokeWidth={3} />
                Añadido a la cuenta ✓
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" strokeWidth={2.5} />
                Agregar · {formatCurrency(item.precio)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
