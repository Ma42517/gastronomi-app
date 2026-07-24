"use client";

import { useEffect, useState } from "react";
import { Check, Plus, UtensilsCrossed, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";
import type { GrupoModificador, MenuItemMock } from "@/lib/mock-data";
import { useNomAI } from "./NomAIContext";

interface DetallePlatilloProps {
  abierto: boolean;
  item: MenuItemMock | null;
  onCerrar: () => void;
}

/**
 * Detalle premium (dark) DINÁMICO para cualquier platillo:
 * foto real (con placeholder de respaldo), descripción apetitosa y sus
 * modificadores específicos. Conectado al carrito global + venta cruzada.
 */
export function DetallePlatillo({ abierto, item, onCerrar }: DetallePlatilloProps) {
  const addToCart = useCartStore((s) => s.addToCart);
  const { dispararCrossSell } = useNomAI();

  const [agregado, setAgregado] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [selecciones, setSelecciones] = useState<Record<string, string[]>>({});

  // Reinicia estado al abrir / cambiar de platillo (con defaults de modifiers).
  useEffect(() => {
    if (!abierto || !item) return;
    const init: Record<string, string[]> = {};
    item.modifiers?.forEach((g) => {
      init[g.id] =
        g.tipo === "single" && g.opciones[0] ? [g.opciones[0].id] : [];
    });
    setSelecciones(init);
    setAgregado(false);
    setImgError(false);
  }, [abierto, item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!abierto || !item) return null;

  const toggle = (grupo: GrupoModificador, opcionId: string) => {
    setSelecciones((prev) => {
      const actual = prev[grupo.id] ?? [];
      if (grupo.tipo === "single") return { ...prev, [grupo.id]: [opcionId] };
      return {
        ...prev,
        [grupo.id]: actual.includes(opcionId)
          ? actual.filter((x) => x !== opcionId)
          : [...actual, opcionId],
      };
    });
  };

  const agregar = () => {
    addToCart({
      id: item.id,
      nombre: item.nombre,
      precio: item.precio,
      emoji: item.emoji,
    });
    // Venta cruzada: la burbuja de Ñom AI reacciona al instante.
    const esBebida = item.categoria === "Bebidas";
    dispararCrossSell(
      esBebida
        ? "¡Buena elección! ¿Le sumamos unos Tacos al Pastor para acompañar? 🌮"
        : "¡Excelente elección! ¿Gustas añadir un refresco bien frío para acompañar? 🥤",
    );
    setAgregado(true);
  };

  const brand = "var(--brand, #DC2626)";

  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onCerrar}
        className="animate-backdrop-in absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="animate-sheet-up relative mt-auto flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-neutral-900/90 text-white shadow-2xl backdrop-blur-2xl">
        {/* Foto real (placeholder premium si falla o no hay) */}
        <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-zinc-900">
          {item.imagen_url && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imagen_url}
              alt={item.nombre}
              onError={() => setImgError(true)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <>
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(circle at 50% 40%, color-mix(in srgb, ${brand} 32%, #18181b), #0a0a0a 78%)`,
                }}
              />
              <div className="absolute inset-0 grid place-items-center">
                <UtensilsCrossed className="h-16 w-16 text-white/25" />
              </div>
            </>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-black/20" />

          <div className="absolute left-1/2 top-2.5 -translate-x-1/2">
            <span className="block h-1.5 w-12 rounded-full bg-white/60" />
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur-md transition hover:bg-black/60"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido (scroll) */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-4 pt-4">
          <div>
            <h2 className="text-2xl font-extrabold leading-tight">
              {item.nombre}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-white/55">
              {item.descripcion}
            </p>
            <p className="mt-2 text-xl font-bold" style={{ color: brand }}>
              {formatCurrency(item.precio)}
            </p>
          </div>

          {/* Modificadores dinámicos */}
          {item.modifiers?.map((grupo) => (
            <div key={grupo.id}>
              <p className="mb-2 text-sm font-semibold text-white/80">
                {grupo.titulo}
                {grupo.tipo === "multi" && (
                  <span className="ml-1 text-xs font-normal text-white/40">
                    (opcional)
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {grupo.opciones.map((op) => {
                  const activa = (selecciones[grupo.id] ?? []).includes(op.id);
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => toggle(grupo, op.id)}
                      className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200"
                      style={{
                        borderColor: activa ? brand : "rgba(255,255,255,0.12)",
                        background: activa
                          ? `color-mix(in srgb, ${brand} 22%, transparent)`
                          : "rgba(255,255,255,0.04)",
                        color: activa ? "#fff" : "rgba(255,255,255,0.7)",
                      }}
                    >
                      {activa && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      {op.nombre}
                      {op.precio_extra ? (
                        <span className="text-xs text-white/50">
                          +{formatCurrency(op.precio_extra)}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Barra inferior */}
        <div className="shrink-0 border-t border-white/10 bg-neutral-900/60 p-4 pb-6 backdrop-blur-md">
          <button
            type="button"
            onClick={agregar}
            disabled={agregado || !item.disponible}
            className="flex w-full items-center justify-center gap-2 rounded-3xl px-6 py-4 text-base font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-70"
            style={{ background: agregado ? "#16a34a" : brand }}
          >
            {!item.disponible ? (
              "No disponible"
            ) : agregado ? (
              <>
                <Check className="h-5 w-5" strokeWidth={3} />
                Añadido a la cuenta ✓
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" strokeWidth={2.5} />
                Agregar al carrito · {formatCurrency(item.precio)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
