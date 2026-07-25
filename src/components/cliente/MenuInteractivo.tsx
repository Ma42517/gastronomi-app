"use client";

import type { ReactNode } from "react";
import type { MenuItemMock } from "@/lib/mock-data";
import { ProductCard } from "./ProductCard";

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
 * Rappi / Uber Eats). Cada categoría es una sección con su ancla (id) para que
 * las pills superiores puedan desplazar suavemente hasta ella.
 *
 * La tarjeta vive en `ProductCard` y es COMPARTIDA con el carrusel de
 * Populares: un solo diseño para todo el menú.
 */
export function MenuInteractivo({
  categorias,
  menu,
  onVerDetalle,
  tituloUnico,
  vacio,
}: MenuInteractivoProps) {
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
            <h2 className="mb-3 text-lg font-extrabold text-zinc-950">
              {tituloUnico ?? categoria}
            </h2>

            {/* CUADRÍCULA DE 2 COLUMNAS */}
            <div className="grid grid-cols-2 gap-4">
              {items.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  onAbrir={() => onVerDetalle(item)}
                  className="w-full"
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
