"use client";

import { Plus } from "lucide-react";

interface CategoriaPillsProps {
  categorias: string[];
  activa: string;
  onSelect: (categoria: string) => void;
  /**
   * Crear una sección nueva. Si se pasa, aparece un pill "+ Añadir" al final.
   *
   * Al final y no al principio: las categorías reales son lo que el comensal
   * necesita, y en modo edición el dueño ya sabe que está editando. Ponerlo
   * primero desplazaría la primera sección fuera de la vista.
   */
  onAnadirCategoria?: () => void;
}

/**
 * Navegación por categorías (pills) con scroll horizontal suave y barra de
 * scroll oculta. Pill activa: fondo negro sólido + texto blanco; inactiva:
 * gris claro. Sticky con glassmorphism para acompañar al usuario en el scroll.
 *
 * NOTA: el buscador ya NO vive aquí. La lupa se movió a la barra de navegación
 * inferior, junto a la píldora de Ñom AI, para agrupar las dos herramientas de
 * descubrimiento del menú en el alcance del pulgar.
 */
export function CategoriaPills({
  categorias,
  activa,
  onSelect,
  onAnadirCategoria,
}: CategoriaPillsProps) {
  return (
    <nav className="sticky top-0 z-40 -mx-5 flex items-center border-b border-gray-100/60 bg-white/90 px-5 py-2 backdrop-blur-md">
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categorias.map((cat) => {
          const isActive = cat === activa;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onSelect(cat)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 ${
                isActive
                  ? "bg-gray-900 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          );
        })}

        {/* Añadir sección. Usa el color de marca en lugar del gris de los pills
            inactivos: es una acción, no un filtro, y confundirla con una
            categoría más sería el error fácil aquí. */}
        {onAnadirCategoria && (
          <button
            type="button"
            onClick={onAnadirCategoria}
            className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-dashed px-4 py-2 text-sm font-bold transition active:scale-95"
            style={{ color: "var(--brand)", borderColor: "var(--brand)" }}
          >
            <Plus className="h-4 w-4" strokeWidth={3} />
            Añadir sección
          </button>
        )}
      </div>
    </nav>
  );
}
