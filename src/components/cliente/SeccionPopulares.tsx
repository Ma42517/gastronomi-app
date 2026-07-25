"use client";

import { Flame } from "lucide-react";
import type { MenuItemMock } from "@/lib/mock-data";
import { ProductCard } from "./ProductCard";

interface SeccionPopularesProps {
  items: MenuItemMock[];
  /** Abre el detalle/personalización del platillo. */
  onVerDetalle: (item: MenuItemMock) => void;
}

/**
 * Carrusel horizontal "Populares" con snap y scrollbar oculta.
 *
 * Usa la MISMA `ProductCard` que el grid de 2 columnas. Antes tenía su propio
 * diseño: foto a sangre con el nombre y el precio encima sobre un degradado
 * `from-black/85`, más un badge "Popular" flotante. Eran los bloques oscuros
 * que seguían apareciendo en el menú y rompían el light mode.
 */
export function SeccionPopulares({ items, onVerDetalle }: SeccionPopularesProps) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-1.5 text-lg font-extrabold text-zinc-950">
        Populares
        <Flame className="h-5 w-5" style={{ color: "var(--brand)" }} />
      </h2>

      <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <ProductCard
            key={item.id}
            item={item}
            onAbrir={() => onVerDetalle(item)}
            // Ancho fijo: en un carrusel la tarjeta no puede encogerse.
            className="w-40 shrink-0 snap-start"
          />
        ))}
      </div>
    </section>
  );
}
