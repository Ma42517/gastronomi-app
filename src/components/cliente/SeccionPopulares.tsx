"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import type { MenuItemMock } from "@/lib/mock-data";

interface SeccionPopularesProps {
  items: MenuItemMock[];
  /** Abre el detalle/personalización del platillo. */
  onVerDetalle: (item: MenuItemMock) => void;
}

/**
 * Carrusel horizontal "Populares" (estilo delivery premium): tarjetas con
 * foto arriba (redondeada) y, debajo, nombre en negritas + precio a la
 * izquierda. Snap horizontal, scrollbar oculta. Tocar abre "Personalizar".
 */
export function SeccionPopulares({ items, onVerDetalle }: SeccionPopularesProps) {
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-lg font-extrabold text-gray-900">Populares</h2>

      <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onVerDetalle(item)}
            className="group w-40 shrink-0 snap-start text-left"
          >
            {/* Imagen cuadrada con bordes redondeados */}
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 shadow-sm">
              {item.imagen_url && !imgErrors[item.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imagen_url}
                  alt={item.nombre}
                  onError={() =>
                    setImgErrors((prev) => ({ ...prev, [item.id]: true }))
                  }
                  className="h-full w-full object-cover transition duration-300 group-active:scale-95"
                />
              ) : (
                <div className="grid h-full w-full place-items-center">
                  <span className="text-4xl">{item.emoji}</span>
                </div>
              )}
              <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
                Popular
              </span>
              {!item.disponible && (
                <span className="absolute inset-0 grid place-items-center bg-black/50 text-xs font-semibold text-white">
                  Agotado
                </span>
              )}
            </div>

            {/* Nombre + precio (alineados a la izquierda) */}
            <p className="mt-2 line-clamp-1 text-sm font-bold text-gray-900">
              {item.nombre}
            </p>
            <p className="text-sm font-bold" style={{ color: "var(--brand)" }}>
              {formatCurrency(item.precio)}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
