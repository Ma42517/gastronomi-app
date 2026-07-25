"use client";

import { useState } from "react";
import { ChefHat, ChevronRight, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { MenuItemMock } from "@/lib/mock-data";

interface PlatilloHeroCardProps {
  item: MenuItemMock;
  etiqueta: string;
  onPersonalizar: () => void;
}

/**
 * Tarjeta del "Platillo Héroe" (premium). Abre el configurador inmersivo
 * en lugar de agregar directo al carrito. White-label vía --brand.
 */
export function PlatilloHeroCard({
  item,
  etiqueta,
  onPersonalizar,
}: PlatilloHeroCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      type="button"
      onClick={onPersonalizar}
      className="group relative w-full overflow-hidden rounded-3xl border border-white/10 bg-neutral-900 p-4 text-left text-white shadow-xl transition-all duration-300 active:scale-[0.99]"
    >
      {/* Glow de marca */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full opacity-60 blur-3xl transition-opacity duration-300 group-hover:opacity-90"
        style={{
          background:
            "radial-gradient(circle, var(--brand), transparent 70%)",
        }}
      />

      <div className="relative flex items-center gap-4">
        {/* FOTO REAL del corte. Antes aquí solo había un icono de gorro de
            chef sobre un degradado: el componente nunca llegaba a usar
            `item.imagen_url` aunque el dato existía. El icono queda ahora
            únicamente como respaldo si la foto falla al cargar. */}
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/10">
          {item.imagen_url && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imagen_url}
              alt={item.nombre}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="grid h-full w-full place-items-center"
              style={{
                background:
                  "radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--brand) 55%, #7c2d12), #1a1a1a 78%)",
              }}
            >
              <div className="grid h-14 w-14 place-items-center rounded-full bg-black/25">
                <ChefHat className="h-7 w-7 text-white/85" />
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{
              background: "color-mix(in srgb, var(--brand) 25%, transparent)",
              color: "#fff",
            }}
          >
            <Sparkles className="h-3 w-3" />
            {etiqueta}
          </span>

          <h3 className="mt-1.5 truncate text-lg font-extrabold leading-tight">
            {item.nombre}
          </h3>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-white/55">
            {item.descripcion}
          </p>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-white/70">
              desde{" "}
              <span className="text-base font-bold text-white">
                {formatCurrency(item.precio)}
              </span>
            </span>
            <span
              className="flex items-center gap-0.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm transition-transform duration-300 group-hover:translate-x-0.5"
              style={{ background: "var(--brand)", color: "#fff" }}
            >
              Personalizar
              <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
