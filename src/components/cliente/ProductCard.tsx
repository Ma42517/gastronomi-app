"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { MenuItemMock } from "@/lib/mock-data";

interface ProductCardProps {
  item: MenuItemMock;
  /** Abre el modal de personalización. */
  onAbrir: () => void;
  /**
   * Clases de ancho del contenedor. El grid usa el ancho de la columna; el
   * carrusel de Populares necesita un ancho fijo y `shrink-0`.
   */
  className?: string;
}

/**
 * TARJETA DE PRODUCTO ÚNICA de la app — light mode puro.
 *
 * La usan TANTO el grid de 2 columnas como el carrusel de "Populares", para
 * que no existan dos lenguajes visuales distintos para lo mismo. Antes el
 * carrusel pintaba el nombre y el precio ENCIMA de la foto sobre un degradado
 * `from-black/85`: esos eran los bloques oscuros que seguían apareciendo.
 *
 * Anatomía:
 *   - Foto cuadrada redondeada, sin fondo ni borde en el contenedor.
 *   - Badge "Personalizar" superpuesto arriba a la derecha: es el indicador
 *     visual de la acción (antes era un texto gris junto al precio que nadie
 *     veía y no invitaba a nada).
 *   - Debajo: título oscuro y precio rojo SOLO, alineado a la izquierda.
 *
 * Toda la tarjeta es un único área táctil: el badge es un `<span>`, no un
 * botón anidado (eso sería HTML inválido y rompería el tap).
 */
export function ProductCard({ item, onAbrir, className = "" }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const conFoto = item.imagen_url && !imgError;

  return (
    <motion.button
      type="button"
      onClick={onAbrir}
      // Respuesta física al tacto: la tarjeta completa se hunde. Framer Motion
      // interpola de verdad y se recupera con suavidad al soltar, en lugar de
      // saltar entre dos estados como haría `active:scale-*`.
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className={`group flex flex-col bg-transparent text-left ${
        item.disponible ? "" : "opacity-60"
      } ${className}`}
    >
      {/* --- FOTO (contenedor relative para colgar el badge) --- */}
      <div className="relative w-full overflow-hidden rounded-2xl">
        {conFoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imagen_url}
            alt={item.nombre}
            onError={() => setImgError(true)}
            className="aspect-square w-full object-cover"
          />
        ) : (
          <div className="grid aspect-square w-full place-items-center bg-gray-100">
            <span className="text-4xl">{item.emoji}</span>
          </div>
        )}

        {/* CTA "Personalizar" superpuesto arriba a la derecha.
            `group-active` lo hunde junto con la tarjeta al presionar. */}
        {item.disponible && (
          <span className="absolute right-2 top-2 flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 shadow-lg backdrop-blur-sm transition active:scale-95 group-active:scale-95">
            <Pencil className="size-3 shrink-0 text-zinc-900" strokeWidth={2.5} />
            <span className="text-xs font-semibold text-zinc-900">
              Personalizar
            </span>
          </span>
        )}

        {/* Agotado: velo CLARO (no negro) para no reintroducir bloques oscuros. */}
        {!item.disponible && (
          <span className="absolute inset-0 grid place-items-center bg-white/70 text-[11px] font-bold uppercase tracking-wide text-zinc-900 backdrop-blur-sm">
            Agotado
          </span>
        )}
      </div>

      {/* --- INFO: alineada al ancho exacto de la foto --- */}
      <div className="w-full px-1 py-2">
        {/* `truncate` corta con puntos suspensivos: nunca desborda. */}
        <p className="truncate text-sm font-semibold text-zinc-950">
          {item.nombre}
        </p>
        {/* El precio queda SOLO en su línea, a la izquierda. */}
        <p className="mt-1 text-sm font-bold text-red-500">
          {formatCurrency(item.precio)}
        </p>
      </div>
    </motion.button>
  );
}
