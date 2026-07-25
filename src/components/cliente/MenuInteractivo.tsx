"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
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
 * TARJETA DE PRODUCTO — sin marco, integrada al fondo claro de la app.
 *
 * No tiene contenedor con fondo ni borde: la foto redondeada es la que define
 * la silueta y el texto va suelto debajo, alineado exactamente al ancho de la
 * imagen. Así el grid respira y no aparecen bloques oscuros peleando con el
 * tema claro del menú.
 *
 * Toda la tarjeta es el área táctil: no hay botón de "+" flotando encima.
 * "Personalizar" es solo una PISTA de texto, no un segundo botón.
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
    <motion.button
      type="button"
      onClick={onAbrir}
      // Respuesta física al tacto: la tarjeta se hunde. Se hace con Framer
      // Motion en vez de `active:scale-*` porque interpola de verdad (y se
      // recupera con suavidad al soltar) en lugar de saltar entre dos estados.
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className={`group flex w-full flex-col bg-transparent text-left ${
        item.disponible ? "" : "opacity-60"
      }`}
    >
      {/* Imagen: cuadrada, recortada y con las esquinas redondeadas. */}
      <div className="relative w-full overflow-hidden rounded-2xl">
        {conFoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imagen_url}
            alt={item.nombre}
            onError={onErrorImagen}
            className="aspect-square w-full object-cover"
          />
        ) : (
          <div className="grid aspect-square w-full place-items-center bg-gray-100">
            <span className="text-4xl">{item.emoji}</span>
          </div>
        )}

        {!item.disponible && (
          <span className="absolute inset-0 grid place-items-center bg-black/60 text-[11px] font-bold uppercase tracking-wide text-white">
            Agotado
          </span>
        )}
      </div>

      {/* Info: mismo ancho que la foto, con padding ligero. */}
      <div className="w-full px-1 py-2">
        {/* `truncate` corta con puntos suspensivos: nunca desborda ni empuja. */}
        <p className="truncate text-sm font-bold text-gray-900">
          {item.nombre}
        </p>

        <div className="mt-1 flex w-full items-center justify-between gap-1">
          <span className="shrink-0 text-sm font-bold text-red-500">
            {formatCurrency(item.precio)}
          </span>
          {/* Pista de acción. `truncate` + `min-w-0` evitan que en nombres
              largos o pantallas estrechas se salga del ancho de la foto. */}
          <span className="min-w-0 truncate text-[10px] font-semibold uppercase text-gray-400 sm:text-xs">
            Personalizar
          </span>
        </div>
      </div>
    </motion.button>
  );
}
