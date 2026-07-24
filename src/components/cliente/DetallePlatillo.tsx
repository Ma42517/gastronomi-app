"use client";

import { useEffect, useState } from "react";
import { Check, Plus, UtensilsCrossed, X } from "lucide-react";
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

/** Descripciones de Ñom AI por opción (se muestran SOLO tras un clic real). */
const REACCIONES: Record<string, string> = {
  roja: "La salsa roja tiene poco picor pero mucho sabor. Ideal si prefieres disfrutar sin que pique de más.",
  verde: "La salsa verde es fresca y con un picor equilibrado. ¡Combina con todo!",
  habanero:
    "La habanero es intensa y muy picante. Solo para valientes 🔥.",
  "con-todo": "Con todo: cebolla, cilantro y su salsa. La experiencia completa.",
  "sin-cebolla":
    "Sin cebolla, para un sabor más limpio y directo. ¡Buena elección!",
  chorizo: "Con chorizo extra: más sabor y un toque picosito.",
  champinones: "Champiñones extra: un toque terroso y muy jugoso.",
  doble: "¡Doble porción! Perfecto para compartir en grande.",
};

/** Sugiere el ítem de venta cruzada según la categoría del platillo. */
function sugerirCrossSell(item: MenuItemMock): MenuItemMock | null {
  const menu = TAQUERIA_EL_PRIMO.menu;
  const disp = (id: string) =>
    menu.find((m) => m.id === id && m.disponible && m.id !== item.id) ?? null;
  if (item.categoria === "Bebidas") return disp("t-pastor");
  if (item.categoria === "Especiales") return disp("b-cerveza");
  return (
    disp("b-horchata") ??
    menu.find(
      (m) => m.categoria === "Bebidas" && m.disponible && m.id !== item.id,
    ) ??
    null
  );
}

/**
 * Detalle premium (dark) DINÁMICO. La mensajería de Ñom AI ya NO vive aquí:
 * este componente empuja el estado a la BARRA GLOBAL (Estados B/C/D):
 *  - Al abrir: invita a elegir (o describe el producto si no tiene opciones).
 *  - Al tocar una opción (clic real): describe esa opción.
 *  - Al agregar: recomendación complementaria con acción directa en la barra.
 */
export function DetallePlatillo({ abierto, item, onCerrar }: DetallePlatilloProps) {
  const addToCart = useCartStore((s) => s.addToCart);
  const { setBarMensaje, setBarRecomendacion, setBarAccion } = useNomAI();

  const [agregado, setAgregado] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [selecciones, setSelecciones] = useState<Record<string, string[]>>({});

  const esBebida = item?.categoria === "Bebidas";
  const mensajeCrossSell = esBebida
    ? "¡Buena elección! ¿Le sumamos unos Tacos al Pastor para acompañar? 🌮"
    : "¡Excelente elección! ¿Gustas añadir un refresco bien frío para acompañar? 🥤";

  const sugerido = item ? sugerirCrossSell(item) : null;

  // "Agregar al carrito" se habilita solo cuando TODOS los grupos marcados como
  // obligatorios tienen al menos una selección real del cliente.
  const gruposObligatorios = (item?.modifiers ?? []).filter((g) => g.requerido);
  const faltanObligatorios = gruposObligatorios.some(
    (g) => (selecciones[g.id]?.length ?? 0) === 0,
  );

  // ESTADO D: al agregar, recomendación complementaria en la barra.
  const agregar = () => {
    if (!item) return;
    addToCart({
      id: item.id,
      nombre: item.nombre,
      precio: item.precio,
      emoji: item.emoji,
    });
    setAgregado(true);
    setBarAccion(null);
    setBarMensaje(mensajeCrossSell);
    setBarRecomendacion(
      sugerido
        ? {
            id: sugerido.id,
            nombre: sugerido.nombre,
            precio: sugerido.precio,
            emoji: sugerido.emoji,
          }
        : null,
    );
  };

  // Al abrir/cambiar de platillo: prepara opciones y empuja el ESTADO B a la barra.
  useEffect(() => {
    if (!abierto || !item) return;
    // Ninguna opción llega preseleccionada: el cliente elige manualmente cada
    // grupo (incluidos los single como "salsa"). Se inicializa todo vacío.
    const init: Record<string, string[]> = {};
    item.modifiers?.forEach((g) => {
      init[g.id] = [];
    });
    setSelecciones(init);
    setAgregado(false);
    setImgError(false);

    // Estado B: invita a elegir (sin describir la opción por default) o describe.
    const primerGrupo = item.modifiers?.[0];
    setBarMensaje(
      primerGrupo
        ? `¡Buena elección! Ahora ${primerGrupo.titulo.toLowerCase()} 👇`
        : `¡Buena elección! ${item.descripcion}`,
    );
    setBarRecomendacion(null);

    // Al cerrar el detalle, la barra vuelve al mensaje de bienvenida.
    return () => {
      setBarMensaje(null);
      setBarRecomendacion(null);
      setBarAccion(null);
    };
  }, [abierto, item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Publica/limpia la acción "Agregar al carrito" en la barra global: aparece en
  // cuanto el cliente eligió todo lo obligatorio y desaparece tras agregar.
  useEffect(() => {
    if (!abierto || !item) return;
    if (agregado || faltanObligatorios) {
      setBarAccion(null);
      return;
    }
    setBarAccion({
      etiqueta: formatCurrency(item.precio),
      onAgregar: agregar,
    });
  }, [abierto, item?.id, faltanObligatorios, agregado]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!abierto || !item) return null;

  const brand = "var(--brand, #DC2626)";

  // ESTADO C: solo con un clic REAL del usuario se describe la opción.
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
    setBarMensaje(REACCIONES[opcionId] ?? "¡Buena elección!");
  };

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

        {/* Contenido (scroll). pb amplio para no quedar tras la barra global. */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-28 pt-4">
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
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/80">
                {grupo.titulo}
                {grupo.requerido ? (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{
                      background: `color-mix(in srgb, ${brand} 22%, transparent)`,
                      color: `color-mix(in srgb, ${brand} 70%, white)`,
                    }}
                  >
                    Obligatorio
                  </span>
                ) : (
                  <span className="text-xs font-normal text-white/40">
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

          {/* Botón principal (rojo) de agregar */}
          <button
            type="button"
            onClick={agregar}
            disabled={agregado || !item.disponible || faltanObligatorios}
            className="flex w-full items-center justify-center gap-2 rounded-3xl px-6 py-4 text-base font-bold text-white shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: agregado ? "#16a34a" : brand }}
          >
            {!item.disponible ? (
              "No disponible"
            ) : agregado ? (
              <>
                <Check className="h-5 w-5" strokeWidth={3} />
                Añadido a la cuenta ✓
              </>
            ) : faltanObligatorios ? (
              "Elige las opciones obligatorias"
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
