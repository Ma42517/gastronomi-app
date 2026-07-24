"use client";

import { useState } from "react";
import { ChevronRight, UtensilsCrossed } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { MenuItemMock } from "@/lib/mock-data";

/** Ancla (id de sección) para una categoría — usado por las pills para navegar. */
export const anchorCategoria = (categoria: string) =>
  `cat-${categoria.toLowerCase().replace(/\s+/g, "-")}`;

interface MenuInteractivoProps {
  categorias: string[];
  menu: MenuItemMock[];
  /** Abre el detalle premium del platillo. */
  onVerDetalle: (item: MenuItemMock) => void;
}

/**
 * Feed principal AGRUPADO por categoría (scroll vertical). Cada categoría es
 * una sección con su título y sus tarjetas, con un ancla (id) para que las
 * pills superiores puedan desplazar suavemente hasta ella.
 */
export function MenuInteractivo({
  categorias,
  menu,
  onVerDetalle,
}: MenuInteractivoProps) {
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-8">
      {categorias.map((categoria) => {
        const items = menu.filter((m) => m.categoria === categoria);
        if (items.length === 0) return null;

        return (
          <section
            key={categoria}
            id={anchorCategoria(categoria)}
            className="scroll-mt-20"
          >
            <h2 className="mb-3 text-lg font-extrabold text-gray-900">
              {categoria}
            </h2>

            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className={`flex items-stretch gap-3 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-gray-100 transition ${
                    item.disponible ? "" : "opacity-60"
                  }`}
                >
                  {/* Área táctil: abre el detalle premium */}
                  <button
                    type="button"
                    onClick={() => onVerDetalle(item)}
                    className="flex min-w-0 flex-1 items-stretch gap-3 text-left"
                  >
                    {/* Foto real (placeholder de respaldo si falla o no hay) */}
                    {item.imagen_url && !imgErrors[item.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imagen_url}
                        alt={item.nombre}
                        onError={() =>
                          setImgErrors((prev) => ({ ...prev, [item.id]: true }))
                        }
                        className="h-24 w-24 shrink-0 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200">
                        <UtensilsCrossed className="h-7 w-7 text-gray-300" />
                      </div>
                    )}

                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="font-semibold leading-tight text-gray-900">
                        {item.nombre}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-400">
                        {item.descripcion}
                      </p>
                      <span className="mt-auto pt-2 text-[15px] font-bold text-gray-900">
                        {formatCurrency(item.precio)}
                      </span>
                    </div>
                  </button>

                  {/* CTA secundario (outline) */}
                  <div className="flex shrink-0 items-end">
                    {item.disponible ? (
                      <button
                        type="button"
                        onClick={() => onVerDetalle(item)}
                        className="flex items-center gap-0.5 rounded-full border-2 bg-transparent px-3 py-2 text-xs font-bold transition active:scale-95"
                        style={{
                          borderColor: "var(--brand)",
                          color: "var(--brand)",
                        }}
                      >
                        Personalizar
                        <ChevronRight className="h-3.5 w-3.5" strokeWidth={3} />
                      </button>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-400">
                        Agotado
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
