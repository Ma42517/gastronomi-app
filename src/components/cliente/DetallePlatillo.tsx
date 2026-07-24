"use client";

import { useEffect, useState } from "react";
import { Check, Plus, Sparkles, UtensilsCrossed, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";
import { TAQUERIA_EL_PRIMO } from "@/lib/mock-data";
import type { GrupoModificador, MenuItemMock } from "@/lib/mock-data";
import { useNomAI } from "./NomAIContext";

interface DetallePlatilloProps {
  abierto: boolean;
  item: MenuItemMock | null;
  onCerrar: () => void;
}

/** Reacciones de Ñom AI por opción elegida (salsa, preparación, extras). */
const REACCIONES: Record<string, string> = {
  // Salsas
  roja: "La salsa roja tiene poco picor pero mucho sabor. Ideal si prefieres disfrutar sin que pique de más.",
  verde: "La salsa verde es fresca y con un picor equilibrado. ¡Combina con todo!",
  habanero:
    "La habanero es intensa y muy picante. Solo para valientes 🔥. ¿Un agua fresca para calmar el fuego?",
  // Preparación
  "con-todo": "Con todo: cebolla, cilantro y su salsa. La experiencia completa.",
  "sin-cebolla":
    "Sin cebolla, para un sabor más limpio y directo. ¡Buena elección!",
  // Extras (queso fundido)
  chorizo: "Con chorizo extra: más sabor y un toque picosito.",
  champinones: "Champiñones extra: un toque terroso y muy jugoso.",
  doble: "¡Doble porción! Perfecto para compartir en grande.",
};

/** Sugiere el ítem de venta cruzada perfecto según la categoría del platillo. */
function sugerirCrossSell(item: MenuItemMock): MenuItemMock | null {
  const menu = TAQUERIA_EL_PRIMO.menu;
  const disp = (id: string) =>
    menu.find((m) => m.id === id && m.disponible && m.id !== item.id) ?? null;
  if (item.categoria === "Bebidas") return disp("t-pastor");
  if (item.categoria === "Especiales") return disp("b-cerveza");
  // Tacos / Extras -> una bebida bien fría
  return (
    disp("b-horchata") ??
    menu.find(
      (m) => m.categoria === "Bebidas" && m.disponible && m.id !== item.id,
    ) ??
    null
  );
}

/**
 * Detalle premium (dark) DINÁMICO para cualquier platillo:
 * foto real, descripción apetitosa y modificadores. La sugerencia de Ñom AI se
 * muestra INLINE (debajo del botón), no como burbuja flotante invasiva.
 */
export function DetallePlatillo({ abierto, item, onCerrar }: DetallePlatilloProps) {
  const addToCart = useCartStore((s) => s.addToCart);
  const { dispararCrossSell, abrirChat } = useNomAI();

  const [agregado, setAgregado] = useState(false);
  const [agregadoSugerido, setAgregadoSugerido] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [selecciones, setSelecciones] = useState<Record<string, string[]>>({});
  // Última opción tocada por el usuario (para reaccionar a cada cambio).
  const [ultimaOpcion, setUltimaOpcion] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto || !item) return;
    const init: Record<string, string[]> = {};
    item.modifiers?.forEach((g) => {
      init[g.id] =
        g.tipo === "single" && g.opciones[0] ? [g.opciones[0].id] : [];
    });
    setSelecciones(init);
    setAgregado(false);
    setAgregadoSugerido(false);
    setImgError(false);
    setUltimaOpcion(null);
  }, [abierto, item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!abierto || !item) return null;

  const brand = "var(--brand, #DC2626)";
  const esBebida = item.categoria === "Bebidas";
  const sugerido = sugerirCrossSell(item);

  const toggle = (grupo: GrupoModificador, opcionId: string) => {
    setUltimaOpcion(opcionId); // Ñom AI reacciona a cada cambio de opción
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

  const mensajeCrossSell = esBebida
    ? "¡Buena elección! ¿Le sumamos unos Tacos al Pastor para acompañar? 🌮"
    : "¡Excelente elección! ¿Gustas añadir un refresco bien frío para acompañar? 🥤";

  const agregar = () => {
    addToCart({
      id: item.id,
      nombre: item.nombre,
      precio: item.precio,
      emoji: item.emoji,
    });
    // Sincroniza la burbuja flotante para cuando el cliente cierre el detalle.
    dispararCrossSell(mensajeCrossSell);
    setAgregado(true);
  };

  // Acción directa: añade el ítem sugerido al carrito real desde la tarjeta.
  const agregarSugerido = () => {
    if (!sugerido || agregadoSugerido) return;
    addToCart({
      id: sugerido.id,
      nombre: sugerido.nombre,
      precio: sugerido.precio,
      emoji: sugerido.emoji,
    });
    setAgregadoSugerido(true);
  };

  // Descripción "buena elección" con datos REALES del producto (sin inventar).
  const descripcionIA = `¡Buena elección! ${item.descripcion} Y por ${formatCurrency(
    item.precio,
  )}, es un antojo que vale la pena.`;

  // Texto del banner inline de Ñom AI:
  //  - Al abrir: descripción del producto (datos reales).
  //  - Al cambiar una opción (salsa/preparación/extra): reacción a esa opción.
  //  - Tras agregar: venta cruzada.
  const mensajeInline = agregadoSugerido
    ? `¡Listo! ${sugerido?.nombre ?? "Tu extra"} añadido a la cuenta. 🎉`
    : agregado
      ? mensajeCrossSell
      : ultimaOpcion && REACCIONES[ultimaOpcion]
        ? REACCIONES[ultimaOpcion]
        : descripcionIA;

  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onCerrar}
        className="animate-backdrop-in absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="animate-sheet-up relative mt-auto flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-neutral-900/95 text-white shadow-2xl backdrop-blur-2xl">
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

        {/* Contenido (scroll): info + modificadores + botón + banner de Ñom AI */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-6 pt-4">
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

          {/* Botón rojo de Agregar (dentro del scroll) */}
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

          {/* Banner inline de Ñom AI — DEBAJO del botón, integrado al menú */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p
              className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide"
              style={{ color: brand }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Ñom AI
            </p>
            <p
              key={mensajeInline}
              className="animate-text-in text-sm leading-snug text-white/80"
            >
              {mensajeInline}
            </p>

            <div className="mt-3 space-y-2">
              {/* La sugerencia (botón rojo) SOLO aparece tras agregar el platillo */}
              {agregado && sugerido && (
                <button
                  type="button"
                  onClick={agregarSugerido}
                  disabled={agregadoSugerido}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-95"
                  style={{ background: agregadoSugerido ? "#16a34a" : brand }}
                >
                  {agregadoSugerido ? (
                    <>
                      <Check className="h-4 w-4" strokeWidth={3} />
                      {sugerido.nombre} añadido ✓
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" strokeWidth={3} />
                      Añadir {sugerido.nombre} · {formatCurrency(sugerido.precio)}
                    </>
                  )}
                </button>
              )}

              {/* Secundario: abrir el chat completo si el cliente lo prefiere */}
              <button
                type="button"
                onClick={abrirChat}
                className="w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/5 active:scale-95"
              >
                Hablar con Ñom AI
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
