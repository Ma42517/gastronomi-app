"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { MenuItemMock } from "@/lib/mock-data";

interface SugerenciasBebidaProps {
  /** Bebidas (o complementos) sugeridos por Ñom AI. */
  items: MenuItemMock[];
  /** Motivo real del maridaje (micro-copy que justifica la sugerencia). */
  motivo?: string;
  /** One-Tap Combo: agrega el platillo principal + este complemento y cierra. */
  onSeleccionar: (item: MenuItemMock) => void;
}

/**
 * Carrusel horizontal de mini-tarjetas de complementos, integrado DENTRO de la
 * tarjeta de Ñom AI del detalle del platillo. Cada mini-tarjeta lleva una
 * miniatura de la bebida, su nombre corto y el precio; un tap ejecuta el
 * "One-Tap Combo" (agrega y cierra el modal para ir directo al pago).
 */
export function SugerenciasBebida({
  items,
  motivo,
  onSeleccionar,
}: SugerenciasBebidaProps) {
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  if (items.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="mb-2 text-[11px] font-semibold leading-snug text-white/55">
        Ñom AI recomienda para acompañar:
        {motivo ? (
          <span className="font-normal italic text-white/40"> {motivo}.</span>
        ) : null}
      </p>

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((bebida) => {
          const conFoto = bebida.imagen_url && !imgErrors[bebida.id];
          return (
            <button
              key={bebida.id}
              type="button"
              onClick={() => onSeleccionar(bebida)}
              className="group flex shrink-0 snap-start items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2 pr-3 text-left transition hover:border-white/25 hover:bg-white/10 active:scale-95"
            >
              {/* Miniatura */}
              {conFoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bebida.imagen_url}
                  alt={bebida.nombre}
                  onError={() =>
                    setImgErrors((prev) => ({ ...prev, [bebida.id]: true }))
                  }
                  className="h-11 w-11 shrink-0 rounded-md object-cover"
                />
              ) : (
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-white/10 text-xl">
                  {bebida.emoji}
                </span>
              )}

              {/* Nombre corto + precio */}
              <span className="min-w-0">
                <span className="block max-w-[7.5rem] truncate text-xs font-bold text-white">
                  {bebida.nombre}
                </span>
                <span
                  className="mt-0.5 flex items-center gap-0.5 text-xs font-bold"
                  style={{ color: "var(--brand)" }}
                >
                  <Plus className="h-3 w-3" strokeWidth={3} />
                  {formatCurrency(bebida.precio)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
