"use client";

import { useState, type ReactNode } from "react";
import { UtensilsCrossed } from "lucide-react";
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
  /** Título alternativo para la única sección (modo Favoritos). */
  tituloUnico?: string;
  /** Empty state a mostrar si no hay platillos que listar. */
  vacio?: ReactNode;
}

/**
 * Feed principal AGRUPADO por categoría, en CUADRÍCULA DE 2 COLUMNAS (estilo
 * Rappi / Uber Eats). Antes era una lista vertical con foto pequeña a la
 * izquierda y descripción, que desperdiciaba ancho y enterraba las fotos.
 *
 * Cada categoría es una sección con su ancla (id) para que las pills
 * superiores puedan desplazar suavemente hasta ella.
 */
export function MenuInteractivo({
  categorias,
  menu,
  onVerDetalle,
  tituloUnico,
  vacio,
}: MenuInteractivoProps) {
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  // Empty state (ej. Favoritos sin platillos guardados).
  if (menu.length === 0 && vacio) return <>{vacio}</>;

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
              {tituloUnico ?? categoria}
            </h2>

            {/* CUADRÍCULA DE 2 COLUMNAS */}
            <div className="grid grid-cols-2 gap-4">
              {items.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  conError={!!imgErrors[item.id]}
                  onErrorImagen={() =>
                    setImgErrors((prev) => ({ ...prev, [item.id]: true }))
                  }
                  onAbrir={() => onVerDetalle(item)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/**
 * TARJETA DE PRODUCTO — limpia y 100% clickable.
 *
 * Toda la tarjeta es el área táctil: no hay botón de "+" ni de "Personalizar"
 * flotando encima. El cliente toca la tarjeta y entra al detalle, punto.
 */
function ProductCard({
  item,
  conError,
  onErrorImagen,
  onAbrir,
}: {
  item: MenuItemMock;
  conError: boolean;
  onErrorImagen: () => void;
  onAbrir: () => void;
}) {
  const conFoto = item.imagen_url && !conError;

  return (
    <button
      type="button"
      onClick={onAbrir}
      className={`relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 text-left transition active:scale-[0.97] ${
        item.disponible ? "" : "opacity-60"
      }`}
    >
      {/* Imagen arriba, cuadrada y recortada */}
      {conFoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imagen_url}
          alt={item.nombre}
          onError={onErrorImagen}
          className="aspect-square w-full object-cover"
        />
      ) : (
        <div className="grid aspect-square w-full place-items-center bg-gradient-to-br from-zinc-800 to-zinc-900">
          <span className="text-4xl">{item.emoji}</span>
        </div>
      )}

      {/* Contenido debajo de la imagen */}
      <div className="flex flex-col gap-1 p-3">
        <p className="truncate text-sm font-bold text-white">{item.nombre}</p>
        <p className="text-sm font-semibold text-red-500">
          {formatCurrency(item.precio)}
        </p>
      </div>

      {!item.disponible && (
        <span className="absolute inset-x-0 top-0 grid aspect-square place-items-center bg-black/60 text-[11px] font-bold uppercase tracking-wide text-white">
          Agotado
        </span>
      )}
    </button>
  );
}
