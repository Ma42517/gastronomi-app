"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Plus, ShoppingBag, UtensilsCrossed, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";
import { TAQUERIA_EL_PRIMO } from "@/lib/mock-data";
import { obtenerMaridaje } from "@/lib/maridajes";
import type { GrupoModificador, MenuItemMock } from "@/lib/mock-data";
import { useCopiloto } from "@/lib/use-copiloto";
import { useNomAI } from "./NomAIContext";
import { BotonFavorito } from "./BotonFavorito";
import { CopilotoAI } from "./CopilotoAI";

interface DetallePlatilloProps {
  abierto: boolean;
  item: MenuItemMock | null;
  onCerrar: () => void;
}

/**
 * DETALLE DEL PLATILLO — filosofía "Fricción Cero" y "Cero Scroll".
 *
 * Todo cabe en una sola pantalla de móvil. Jerarquía estricta de arriba abajo:
 *
 *   1. Imagen + título + precio (compactos, precio en la misma línea)
 *   2. ÑOM AI (copiloto): el ÚNICO lugar donde habla la IA. Su texto reacciona
 *      a cada modificador y, cuando el platillo está completo, ofrece la
 *      bebida con los botones de venta cruzada integrados justo debajo.
 *   3. Modificadores obligatorios (salsa, preparación)
 *   4. Un único botón fijo abajo: "Añadir y ver orden"
 *
 * FLUJO (un solo toque cierra):
 *   - Toca una bebida  -> agrega platillo + bebida y CIERRA el modal.
 *   - Toca el botón    -> agrega solo el platillo, CIERRA y abre el carrito.
 *
 * No hay confirmaciones verdes, ni tarjeta de IA inferior, ni scroll.
 */
export function DetallePlatillo({ abierto, item, onCerrar }: DetallePlatilloProps) {
  const addToCart = useCartStore((s) => s.addToCart);
  const { abrirCarrito } = useNomAI();

  const [imgError, setImgError] = useState(false);
  const [selecciones, setSelecciones] = useState<Record<string, string[]>>({});
  const [toast, setToast] = useState<string | null>(null);

  // Toast discreto (favoritos).
  const mostrarToast = (mensaje: string) => setToast(mensaje);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2000);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Al abrir o cambiar de platillo: ninguna opción llega preseleccionada.
  useEffect(() => {
    if (!abierto || !item) return;
    const init: Record<string, string[]> = {};
    item.modifiers?.forEach((g) => {
      init[g.id] = [];
    });
    setSelecciones(init);
    setImgError(false);
  }, [abierto, item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Maridaje real (puede venir vacío: un postre no lleva refresco).
  const { items: complementos, motivo: motivoMaridaje } = item
    ? obtenerMaridaje(item, TAQUERIA_EL_PRIMO.menu)
    : { items: [], motivo: "" };

  const gruposObligatorios = (item?.modifiers ?? []).filter((g) => g.requerido);
  const faltanObligatorios = gruposObligatorios.some(
    (g) => (selecciones[g.id]?.length ?? 0) === 0,
  );

  // Referencia estable: si se pasara un objeto nuevo en cada render, el hook
  // del copiloto recalcularía su payload sin parar.
  const primerComplemento = complementos[0]?.nombre ?? "";
  const complementoCopiloto = useMemo(
    () =>
      primerComplemento
        ? { nombre: primerComplemento, motivo: motivoMaridaje }
        : undefined,
    [primerComplemento, motivoMaridaje],
  );

  // COPILOTO: debe invocarse antes del early return (orden de hooks).
  const { texto: textoCopiloto, pensando: copilotoPensando } = useCopiloto({
    item,
    selecciones,
    activo: abierto && item !== null,
    complemento: complementoCopiloto,
  });

  if (!abierto || !item) return null;

  const brand = "var(--brand, #DC2626)";
  const platillo = item;

  const agregarPlatillo = () => {
    addToCart({
      id: platillo.id,
      nombre: platillo.nombre,
      precio: platillo.precio,
      emoji: platillo.emoji,
    });
  };

  /** ESTADO 3 — bebida: agrega platillo + bebida y cierra al instante. */
  const elegirBebida = (bebida: MenuItemMock) => {
    agregarPlatillo();
    addToCart({
      id: bebida.id,
      nombre: bebida.nombre,
      precio: bebida.precio,
      emoji: bebida.emoji,
    });
    onCerrar();
  };

  /** Botón fijo: agrega solo el platillo, cierra y abre la vista de pago. */
  const anadirYVerOrden = () => {
    agregarPlatillo();
    onCerrar();
    abrirCarrito();
  };

  // Cada toque actualiza `selecciones`: la fuente de verdad del copiloto.
  const toggle = (grupo: GrupoModificador, opcionId: string) => {
    const actual = selecciones[grupo.id] ?? [];
    const nuevas =
      grupo.tipo === "single"
        ? [opcionId]
        : actual.includes(opcionId)
          ? actual.filter((x) => x !== opcionId)
          : [...actual, opcionId];
    setSelecciones({ ...selecciones, [grupo.id]: nuevas });
  };

  // ESTADO 2: la venta cruzada se desbloquea al completar los obligatorios.
  const mostrarBebidas =
    platillo.disponible && !faltanObligatorios && complementos.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onCerrar}
        className="animate-backdrop-in absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* Hoja compacta: max-h al 92vh y contenido dimensionado para caber sin
          scroll en un móvil estándar (>=640px de alto útil). */}
      <div className="animate-sheet-up relative mt-auto flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-neutral-900/95 text-white shadow-2xl backdrop-blur-2xl">
        {/* ===== 1) IMAGEN — formato 16:9 completo (apetito visual).
             Es el elemento que vende el platillo, así que recupera su tamaño
             original. El resto del layout sigue compactado, así que el total
             continúa entrando en una pantalla sin scroll. ===== */}
        <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-zinc-900">
          {platillo.imagen_url && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={platillo.imagen_url}
              alt={platillo.nombre}
              onError={() => setImgError(true)}
              className="animate-live-photo absolute inset-0 h-full w-full object-cover"
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
          <div className="absolute right-3 top-3 flex items-center gap-2">
            <BotonFavorito
              itemId={platillo.id}
              nombre={platillo.nombre}
              onToast={mostrarToast}
            />
            <button
              type="button"
              onClick={onCerrar}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur-md transition hover:bg-black/60"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ===== CONTENIDO COMPACTO =====
            overflow-y-auto queda solo como red de seguridad para pantallas muy
            pequeñas; con los tamaños actuales no se activa scroll. */}
        <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-3 pt-3">
          {/* Título + precio en la MISMA línea: ahorra una fila completa. */}
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="min-w-0 flex-1 text-xl font-extrabold leading-tight">
              {platillo.nombre}
            </h2>
            <p className="shrink-0 text-lg font-bold" style={{ color: brand }}>
              {formatCurrency(platillo.precio)}
            </p>
          </div>

          {/* ===== 2) ÑOM AI — ÚNICO bloque de IA del modal =====
              Su texto reacciona a los modificadores y, al completarse el
              platillo, ofrece la bebida con los botones integrados debajo. */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <CopilotoAI texto={textoCopiloto} pensando={copilotoPensando} />

            {/* ESTADO 2 — venta cruzada integrada en el bloque de la IA.
                Un toque agrega platillo + bebida y cierra el modal. */}
            {mostrarBebidas && (
              <div className="animate-fade-in mt-2.5 flex gap-2">
                {complementos.slice(0, 2).map((bebida) => (
                  <button
                    key={bebida.id}
                    type="button"
                    onClick={() => elegirBebida(bebida)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-2.5 py-2 text-left transition active:scale-[0.97]"
                  >
                    <span className="text-lg leading-none">{bebida.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold leading-tight">
                        {bebida.nombre}
                      </span>
                      <span
                        className="block text-[11px] font-bold"
                        style={{ color: brand }}
                      >
                        + {formatCurrency(bebida.precio)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ===== 3) MODIFICADORES OBLIGATORIOS (visibles y accesibles) ===== */}
          {platillo.modifiers?.map((grupo) => (
            <div key={grupo.id}>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-white/70">
                {grupo.titulo}
                {grupo.requerido ? (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                    style={{
                      background: `color-mix(in srgb, ${brand} 22%, transparent)`,
                      color: `color-mix(in srgb, ${brand} 70%, white)`,
                    }}
                  >
                    Obligatorio
                  </span>
                ) : (
                  <span className="text-[11px] font-normal text-white/40">
                    (opcional)
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {grupo.opciones.map((op) => {
                  const activa = (selecciones[grupo.id] ?? []).includes(op.id);
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => toggle(grupo, op.id)}
                      role={grupo.tipo === "multi" ? "checkbox" : "radio"}
                      aria-checked={activa}
                      className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-all duration-200"
                      style={{
                        borderColor: activa ? brand : "rgba(255,255,255,0.12)",
                        background: activa
                          ? `color-mix(in srgb, ${brand} 22%, transparent)`
                          : "rgba(255,255,255,0.04)",
                        color: activa ? "#fff" : "rgba(255,255,255,0.7)",
                      }}
                    >
                      {activa && <Check className="h-3 w-3" strokeWidth={3} />}
                      {op.nombre}
                      {op.precio_extra ? (
                        <span className="text-[11px] text-white/50">
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

        {/* ===== 4) ÚNICO BOTÓN FIJO ABAJO ===== */}
        <div className="shrink-0 border-t border-white/10 bg-neutral-900/95 px-4 pb-4 pt-3">
          {!platillo.disponible ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 py-3 text-center text-sm font-bold text-white/50">
              No disponible
            </div>
          ) : (
            <button
              type="button"
              onClick={anadirYVerOrden}
              disabled={faltanObligatorios}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-bold text-white shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: brand }}
            >
              {faltanObligatorios ? (
                <>
                  <Plus className="h-4 w-4" strokeWidth={3} />
                  Añadir y ver orden
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" strokeWidth={2.5} />
                  Añadir y ver orden · {formatCurrency(platillo.precio)}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Toast discreto de favoritos */}
      {toast && (
        <div className="animate-fade-in-up absolute bottom-24 left-1/2 z-[70] -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900 shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
