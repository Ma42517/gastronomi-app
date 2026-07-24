"use client";

interface CategoriaPillsProps {
  categorias: string[];
  activa: string;
  onSelect: (categoria: string) => void;
}

/**
 * Navegación por categorías (pills) con scroll horizontal suave y barra de
 * scroll oculta. Pill activa: fondo negro sólido + texto blanco; inactiva:
 * fondo gris claro + texto oscuro. Sticky para navegar el feed tipo delivery.
 */
export function CategoriaPills({ categorias, activa, onSelect }: CategoriaPillsProps) {
  return (
    <nav className="sticky top-0 z-30 -mx-5 flex gap-2 overflow-x-auto bg-gray-50/95 px-5 py-3 backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
    </nav>
  );
}
