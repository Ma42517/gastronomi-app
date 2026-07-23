"use client";

import { Minus, Plus } from "lucide-react";
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
      {/* Tabs de categorías (sticky, scroll horizontal) */}
      <nav className="sticky top-[68px] z-10 -mx-5 mb-4 flex gap-2 overflow-x-auto border-b border-gray-100 bg-white/90 px-5 py-3 backdrop-blur [scrollbar-width:none]">
        {categorias.map((cat) => {
          const activa = cat === categoriaActiva;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoriaChange(cat)}
              className="whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition"
              style={
                activa
                  ? { background: "var(--brand)", color: "white" }
                  : {
                      background:
                        "color-mix(in srgb, var(--brand) 8%, white)",
                      color: "color-mix(in srgb, var(--brand) 80%, black)",
                    }
              }
            >
              {cat}
            </button>
          );
        })}
      </nav>

      {/* Lista de platillos */}
      <ul className="space-y-3">
        {itemsFiltrados.map((item) => {
          const cantidad = cantidadEnCarrito(item.id);
          return (
            <li
              key={item.id}
              className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                item.disponible
                  ? "border-gray-100 bg-white"
                  : "border-gray-100 bg-gray-50 opacity-60"
              }`}
            >
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-3xl"
                style={{
                  background: "color-mix(in srgb, var(--brand) 8%, white)",
                }}
              >
                {item.emoji}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-gray-900">
                  {item.nombre}
                </p>
                <p className="line-clamp-2 text-xs text-gray-500">
                  {item.descripcion}
                </p>
                <p
                  className="mt-1 text-sm font-bold"
                  style={{ color: "var(--brand)" }}
                >
                  {formatCurrency(item.precio)}
                </p>
              </div>

              {/* Control de cantidad */}
              {!item.disponible ? (
                <span className="shrink-0 rounded-lg bg-gray-200 px-2 py-1 text-xs font-medium text-gray-500">
                  Agotado
                </span>
              ) : cantidad === 0 ? (
                <button
                  type="button"
                  onClick={() => onAgregar(item)}
                  className="shrink-0 rounded-xl px-3 py-2 text-sm font-semibold text-white transition active:scale-95"
                  style={{ background: "var(--brand)" }}
                >
                  Agregar
                </button>
              ) : (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onQuitar(item.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 transition active:scale-95"
                    style={{
                      borderColor: "var(--brand)",
                      color: "var(--brand)",
                    }}
                    aria-label="Quitar uno"
                  >
                    <Minus className="h-4 w-4" strokeWidth={3} />
                  </button>
                  <span className="w-5 text-center font-bold text-gray-900">
                    {cantidad}
                  </span>
                  <button
                    type="button"
                    onClick={() => onAgregar(item)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white transition active:scale-95"
                    style={{ background: "var(--brand)" }}
                    aria-label="Agregar uno"
                  >
                    <Plus className="h-4 w-4" strokeWidth={3} />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
