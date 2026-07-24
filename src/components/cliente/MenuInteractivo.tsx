"use client";

import { Minus, Plus, UtensilsCrossed } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { MenuItemMock } from "@/lib/mock-data";

interface MenuInteractivoProps {
  categorias: string[];
  menu: MenuItemMock[];
  categoriaActiva: string;
  onCategoriaChange: (categoria: string) => void;
  cantidadEnCarrito: (itemId: string) => number;
  onAgregar: (item: MenuItemMock) => void;
  onQuitar: (itemId: string) => void;
}

export function MenuInteractivo({
  categorias,
  menu,
  categoriaActiva,
  onCategoriaChange,
  cantidadEnCarrito,
  onAgregar,
  onQuitar,
}: MenuInteractivoProps) {
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
        {itemsFiltrados.map((item) => {
          const cantidad = cantidadEnCarrito(item.id);
          return (
            <li
              key={item.id}
              className={`flex items-stretch gap-3 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-gray-100 transition ${
                item.disponible ? "" : "opacity-60"
              }`}
            >
              {/* Placeholder de imagen (cuadro gris redondeado) */}
              <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200">
                <UtensilsCrossed className="h-7 w-7 text-gray-300" />
              </div>

              {/* Información */}
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="font-semibold leading-tight text-gray-900">
                  {item.nombre}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-400">
                  {item.descripcion}
                </p>

                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="text-[15px] font-bold text-gray-900">
                    {formatCurrency(item.precio)}
                  </span>

                  {!item.disponible ? (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-400">
                      Agotado
                    </span>
                  ) : cantidad === 0 ? (
                    <button
                      type="button"
                      onClick={() => onAgregar(item)}
                      className="flex h-9 w-9 items-center justify-center rounded-full transition active:scale-90"
                      style={{
                        background: "color-mix(in srgb, var(--brand) 12%, white)",
                        color: "var(--brand)",
                      }}
                      aria-label={`Agregar ${item.nombre}`}
                    >
                      <Plus className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => onQuitar(item.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 transition active:scale-90"
                        style={{ color: "var(--brand)", borderColor: "var(--brand)" }}
                        aria-label="Quitar uno"
                      >
                        <Minus className="h-4 w-4" strokeWidth={3} />
                      </button>
                      <span className="w-4 text-center text-sm font-bold text-gray-900">
                        {cantidad}
                      </span>
                      <button
                        type="button"
                        onClick={() => onAgregar(item)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-white transition active:scale-90"
                        style={{ background: "var(--brand)" }}
                        aria-label="Agregar uno"
                      >
                        <Plus className="h-4 w-4" strokeWidth={3} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
