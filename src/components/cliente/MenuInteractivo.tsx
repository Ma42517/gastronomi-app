"use client";

import { useState } from "react";
import { ChevronRight, UtensilsCrossed } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { MenuItemMock } from "@/lib/mock-data";

interface MenuInteractivoProps {
  categorias: string[];
  menu: MenuItemMock[];
  categoriaActiva: string;
  onCategoriaChange: (categoria: string) => void;
  /** Abre el detalle premium del platillo. */
  onVerDetalle: (item: MenuItemMock) => void;
}

export function MenuInteractivo({
  categorias,
  menu,
  categoriaActiva,
  onCategoriaChange,
  onVerDetalle,
}: MenuInteractivoProps) {
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const itemsFiltrados = menu.filter((m) => m.categoria === categoriaActiva);

  return (
    <div>
      {/* Pills de categorías (deslizables horizontalmente, sticky) */}
      <nav className="sticky top-0 z-10 -mx-5 mb-4 flex gap-2 overflow-x-auto bg-gray-50/95 px-5 py-3 backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categorias.map((cat) => {
          const activa = cat === categoriaActiva;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoriaChange(cat)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                activa
                  ? "text-white shadow-md"
                  : "bg-white text-gray-500 shadow-sm ring-1 ring-gray-100"
              }`}
              style={activa ? { background: "var(--brand)" } : undefined}
            >
              {cat}
            </button>
          );
        })}
      </nav>

      {/* Tarjetas de platillos */}
      <ul className="space-y-3">
        {itemsFiltrados.map((item) => (
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

            {/* CTA secundario (outline) — no opaca a la "Selección del Chef" */}
            <div className="flex shrink-0 items-end">
              {item.disponible ? (
                <button
                  type="button"
                  onClick={() => onVerDetalle(item)}
                  className="flex items-center gap-0.5 rounded-full border-2 bg-transparent px-3 py-2 text-xs font-bold transition active:scale-95"
                  style={{ borderColor: "var(--brand)", color: "var(--brand)" }}
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
    </div>
  );
}
