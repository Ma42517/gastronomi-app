"use client";

import type { ReactNode } from "react";
import type { MenuItemMock } from "@/lib/mock-data";
import type { DisposicionMenu } from "@/types/database";
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
  /**
   * Agrupación elegida por el dueño. Solo cambia CÓMO se reparten las tarjetas;
   * la tarjeta en sí (`ProductCard`) es exactamente la misma en los dos casos.
   */
  layout?: DisposicionMenu;
}

/**
 * Clases del contenedor según la disposición.
 *
 * ⚠️ POR QUÉ 'grid' SON DOS COLUMNAS TAMBIÉN EN EL MÓVIL
 * Lo natural sería `grid-cols-1 md:grid-cols-2`, pero aquí sería un cambio de
 * diseño encubierto: este menú ya se pinta en dos columnas HOY, y vive dentro de
 * un marco de 448 px (`max-w-md`), muy por debajo del punto de corte `md`. Con
 * ese patrón, todos los restaurantes que hoy tienen cuadrícula pasarían a una
 * sola columna en el teléfono, que es el 95 % de las visitas.
 *
 * Así que 'grid' conserva lo que ya había y 'list' es la variante nueva.
 */
const CLASES_LAYOUT: Record<DisposicionMenu, string> = {
  grid: "grid grid-cols-2 gap-4",
  list: "grid grid-cols-1 gap-3",
};

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
  layout = "grid",
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

            {/* Cuadrícula de dos columnas o lista de una, según el restaurante */}
            <div className={CLASES_LAYOUT[layout]}>
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
