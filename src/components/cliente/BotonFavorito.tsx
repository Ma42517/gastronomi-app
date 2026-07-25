"use client";

import { Heart } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";

interface BotonFavoritoProps {
  /** ID del platillo. */
  itemId: string;
  /** Nombre (para el mensaje del toast). */
  nombre?: string;
  /** Notifica al padre para mostrar el toast. */
  onToast?: (mensaje: string) => void;
  /** Variante visual: sobre foto (glass oscuro) o sólida (fondo claro). */
  variante?: "sobre-foto" | "solida";
  className?: string;
}

/**
 * Botón de Favoritos (corazón) — modular y reutilizable.
 * Outline por defecto; relleno en rojo cuando está activo, con micro-animación
 * de escala al tocar. Notifica al padre para mostrar un toast discreto.
 */
export function BotonFavorito({
  itemId,
  nombre,
  onToast,
  variante = "sobre-foto",
  className = "",
}: BotonFavoritoProps) {
  const favoriteItems = useCartStore((s) => s.favoriteItems);
  const toggleFavorite = useCartStore((s) => s.toggleFavorite);
  const esFavorito = favoriteItems.includes(itemId);

  const handleClick = (e: React.MouseEvent) => {
    // Evita que el clic abra el detalle cuando el corazón vive dentro de una tarjeta.
    e.stopPropagation();
    e.preventDefault();
    const quedoFavorito = toggleFavorite(itemId);
    onToast?.(
      quedoFavorito
        ? `♥ ${nombre ? `${nombre} añadido` : "Añadido"} a tus favoritos`
        : `${nombre ?? "Platillo"} quitado de favoritos`,
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={esFavorito ? "Quitar de favoritos" : "Añadir a favoritos"}
      aria-pressed={esFavorito}
      className={`flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-200 active:scale-125 ${
        variante === "sobre-foto"
          ? "bg-black/40 backdrop-blur-md hover:bg-black/55"
          : "bg-white shadow-md ring-1 ring-gray-100 hover:bg-gray-50"
      } ${className}`}
    >
      <Heart
        className={`h-[18px] w-[18px] transition-all duration-200 ${
          esFavorito
            ? "scale-110 fill-red-500 text-red-500"
            : variante === "sobre-foto"
              ? "text-white"
              : "text-gray-400"
        }`}
        strokeWidth={2.5}
      />
    </button>
  );
}
