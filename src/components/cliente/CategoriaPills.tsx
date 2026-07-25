"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

interface CategoriaPillsProps {
  categorias: string[];
  activa: string;
  onSelect: (categoria: string) => void;
  /** Texto de búsqueda global (controlado por el padre). */
  busqueda: string;
  onBuscar: (texto: string) => void;
}

/**
 * Navegación por categorías (pills) con scroll horizontal suave y barra de
 * scroll oculta, más el BUSCADOR GLOBAL anclado al extremo izquierdo.
 * Pill activa: fondo negro sólido + texto blanco; inactiva: gris claro.
 * Sticky con glassmorphism para acompañar al usuario durante el scroll.
 */
export function CategoriaPills({
  categorias,
  activa,
  onSelect,
  busqueda,
  onBuscar,
}: CategoriaPillsProps) {
  const [abierto, setAbierto] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Al expandir la lupa, enfoca el campo para escribir de inmediato.
  useEffect(() => {
    if (abierto) inputRef.current?.focus();
  }, [abierto]);

  const cerrarBusqueda = () => {
    onBuscar("");
    setAbierto(false);
  };

  return (
    <nav className="sticky top-0 z-40 -mx-5 flex items-center gap-2 border-b border-gray-100/60 bg-white/90 px-5 py-2 backdrop-blur-md">
      {/* LUPA / BUSCADOR — siempre anclado al extremo izquierdo */}
      <div className="flex shrink-0 items-center">
        {abierto ? (
          <div className="flex items-center gap-1.5 rounded-full bg-gray-100 pl-3 pr-1.5 ring-2 ring-gray-900/10 transition-all duration-300">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={busqueda}
              onChange={(e) => onBuscar(e.target.value)}
              placeholder="¿Qué se te antoja?"
              className="w-40 bg-transparent py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 sm:w-48"
            />
            <button
              type="button"
              onClick={cerrarBusqueda}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-200 hover:text-gray-600"
              aria-label="Cerrar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200 active:scale-95"
            aria-label="Buscar en el menú"
          >
            <Search className="h-4 w-4" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Pills de categorías (se ocultan mientras se busca, para dar aire) */}
      {!abierto && (
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
        </div>
      )}
    </nav>
  );
}
