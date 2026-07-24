"use client";

import { useState } from "react";
import { Flame } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { MenuItemMock } from "@/lib/mock-data";

interface SeccionPopularesProps {
  items: MenuItemMock[];
  /** Abre el detalle/personalización del platillo. */
  onVerDetalle: (item: MenuItemMock) => void;
}

/**
 * Carrusel horizontal "Populares" — versión premium (estilo delivery):
 * imagen a pantalla completa con Ken Burns, nombre y precio sobre la foto con
 * degradado, badge de marca y un brillo diagonal (sheen) en bucle. Snap
 * horizontal con scrollbar oculta. Tocar abre "Personalizar".
 */
export function SeccionPopulares({ items, onVerDetalle }: SeccionPopularesProps) {
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-1.5 text-lg font-extrabold text-gray-900">
        Populares
        <Flame className="h-5 w-5" style={{ color: "var(--brand)" }} />
      </h2>

      <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item, i) => {
          const conFoto = item.imagen_url && !imgErrors[item.id];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onVerDetalle(item)}
              className="group relative aspect-[3/4] w-44 shrink-0 snap-start overflow-hidden rounded-3xl shadow-lg ring-1 ring-black/5 transition-transform duration-300 active:scale-[0.97]"
            >
              {/* Imagen con Ken Burns (zoom lento en bucle) */}
              {conFoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imagen_url}
                  alt={item.nombre}
                  onError={() =>
                    setImgErrors((prev) => ({ ...prev, [item.id]: true }))
                  }
                  className="animate-ken-burns absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-gray-800 to-gray-950">
                  <span className="text-5xl">{item.emoji}</span>
                </div>
              )}

              {/* Degradado para legibilidad del texto */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/5" />

              {/* Brillo diagonal (sheen) en bucle, escalonado por tarjeta */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div
                  className="animate-sheen absolute -inset-y-4 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent"
                  style={{ animationDelay: `${i * 1.3}s` }}
                />
              </div>

              {/* Badge POPULAR con degradado de marca */}
              <span
                className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-md"
                style={{
                  background:
                    "linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 55%, #f59e0b))",
                }}
              >
                <Flame className="h-3 w-3" strokeWidth={2.5} />
                Popular
              </span>

              {/* Nombre + precio SOBRE la imagen (alineados a la izquierda) */}
              <div className="absolute inset-x-0 bottom-0 p-3 text-left">
                <p className="line-clamp-2 text-sm font-extrabold leading-tight text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.7)]">
                  {item.nombre}
                </p>
                <span className="mt-1.5 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-sm font-extrabold text-white ring-1 ring-white/25 backdrop-blur-md">
                  {formatCurrency(item.precio)}
                </span>
              </div>

              {!item.disponible && (
                <span className="absolute inset-0 grid place-items-center bg-black/55 text-xs font-bold uppercase tracking-wide text-white">
                  Agotado
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
