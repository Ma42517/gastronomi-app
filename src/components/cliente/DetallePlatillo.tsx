"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Minus, Plus, ShoppingBag, UtensilsCrossed, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";
import { obtenerMaridaje } from "@/lib/maridajes";
import type { GrupoModificador, MenuItemMock } from "@/lib/mock-data";
import { useCopiloto } from "@/lib/use-copiloto";
import { useRestauranteStore } from "@/lib/restaurante-store";
import { useNomAI } from "./NomAIContext";
import { BotonFavorito } from "./BotonFavorito";
import { CopilotoAI } from "./CopilotoAI";

interface DetallePlatilloProps {
  abierto: boolean;
  item: MenuItemMock | null;
  onCerrar: () => void;
}

/**
 * ===== TÉRMINO DE COCCIÓN: LA FOTO REACCIONA AL TOQUE =====
 *
 * Metadatos visuales de cada término. Venían del configurador exclusivo del
 * Ribeye; al unificar todo en este modal se portaron aquí para no perder la
 * micro-interacción estrella: al elegir el término, la carne de la foto cambia
 * de color en vivo.
 *
 * - `overlay`: capa de color + blend mode que se pinta sobre la imagen.
 * - `glow`:    color del halo del pill y de la etiqueta flotante.
 * - `punto`:   color del círculo que simula el interior del corte.
 *
 * El mapa se indexa por el id de la opción, así que cualquier grupo llamado
 * "termino" en cualquier platillo hereda el efecto sin tocar este componente.
 */
const TERMINO_VISUAL: Record<
  string,
  { overlay: string; glow: string; punto: string; sub: string }
> = {
  rojo: {
    overlay: "bg-red-600/50 mix-blend-color-burn",
    glow: "#ef4444",
    punto: "#b81f1f",
    sub: "Rare",
  },
  medio: {
    overlay: "bg-red-400/30 mix-blend-multiply",
    glow: "#f87171",
    punto: "#d24b3d",
    sub: "Medium",
  },
  "tres-cuartos": {
    overlay: "bg-orange-900/40 mix-blend-multiply",
    glow: "#fca5a5",
    punto: "#dda183",
    sub: "Medium Well",
  },
  "bien-cocido": {
    overlay: "bg-stone-800/60 mix-blend-multiply",
    glow: "#b45309",
    punto: "#8a5a3b",
    sub: "Well Done",
  },
};

/** Id del grupo que dispara el efecto sobre la foto. */
const GRUPO_TERMINO = "termino";

/**
 * Máscara radial: el tono de cocción se aplica SOLO al centro de la foto (la
 * carne), nunca a la tabla ni al fondo. Sin esto el efecto tiñe toda la imagen
 * y parece un filtro de Instagram en vez de un cambio de cocción.
 */
const MASCARA_TERMINO =
  "radial-gradient(ellipse at 50% 55%, black 15%, transparent 60%)";

/** Respuesta háptica sutil al elegir (solo dispositivos compatibles). */
function vibrar(ms = 8) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(ms);
  }
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
  // --- VENTA CRUZADA CON STEPPER ---
  // Al elegir una bebida el modal NO se cierra: la tarjeta elegida se queda,
  // las demás se ocultan y el precio se convierte en un stepper de cantidad.
  const [selectedBeverageId, setSelectedBeverageId] = useState<string | null>(
    null,
  );
  const [beverageQty, setBeverageQty] = useState(1);

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
    setSelectedBeverageId(null);
    setBeverageQty(1);
  }, [abierto, item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // El maridaje se calcula sobre el menú VIVO del store: si el dueño marca
  // una bebida como agotada en el panel, deja de sugerirse aquí.
  const menu = useRestauranteStore((s) => s.menu);

  // Maridaje real (puede venir vacío: un postre no lleva refresco).
  const { items: complementos, motivo: motivoMaridaje } = item
    ? obtenerMaridaje(item, menu)
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

  /**
   * Selecciona una bebida SIN cerrar el modal ni tocar el carrito todavía.
   * Solo marca la intención: las demás tarjetas se ocultan y el precio se
   * transforma en el stepper. El carrito se toca una única vez, al confirmar.
   */
  const seleccionarBebida = (bebida: MenuItemMock) => {
    setSelectedBeverageId(bebida.id);
    setBeverageQty(1);
  };

  /** Stepper: al bajar de 1 se deselecciona y reaparecen las otras opciones. */
  const bajarCantidad = () => {
    if (beverageQty <= 1) {
      setSelectedBeverageId(null);
      setBeverageQty(1);
      return;
    }
    setBeverageQty((q) => q - 1);
  };

  const subirCantidad = () => setBeverageQty((q) => Math.min(q + 1, 20));

  /**
   * ÚNICA salida del modal: agrega el platillo, más la bebida elegida con su
   * cantidad exacta, cierra y abre la vista de la orden.
   */
  const anadirYVerOrden = () => {
    agregarPlatillo();

    const bebida = complementos.find((b) => b.id === selectedBeverageId);
    if (bebida) {
      for (let i = 0; i < beverageQty; i += 1) {
        addToCart({
          id: bebida.id,
          nombre: bebida.nombre,
          precio: bebida.precio,
          emoji: bebida.emoji,
        });
      }
    }

    onCerrar();
    abrirCarrito();
  };

  // Cada toque actualiza `selecciones`: la fuente de verdad del copiloto.
  const toggle = (grupo: GrupoModificador, opcionId: string) => {
    // Se usa la forma de ACTUALIZACIÓN (prev => …) y no el valor del closure.
    // Con `{ ...selecciones }` dos toques seguidos dentro del mismo ciclo de
    // render leen la misma foto del estado, así que el segundo descarta al
    // primero: elegir salsa y preparación muy rápido perdía la salsa y el botón
    // se quedaba deshabilitado sin motivo aparente.
    setSelecciones((prev) => {
      const actual = prev[grupo.id] ?? [];
      const nuevas =
        grupo.tipo === "single"
          ? [opcionId]
          : actual.includes(opcionId)
            ? actual.filter((x) => x !== opcionId)
            : [...actual, opcionId];
      return { ...prev, [grupo.id]: nuevas };
    });

    // El término cambia la foto: se acompaña con un pulso háptico para que el
    // cambio visual se sienta físico.
    if (grupo.id === GRUPO_TERMINO) vibrar();
  };

  // --- Término elegido: alimenta la capa de color de la foto y la etiqueta ---
  const terminoId = selecciones[GRUPO_TERMINO]?.[0] ?? null;
  const terminoVisual = terminoId ? TERMINO_VISUAL[terminoId] : null;
  const tieneGrupoTermino = (platillo.modifiers ?? []).some(
    (g) => g.id === GRUPO_TERMINO,
  );
  const nombreTermino = terminoId
    ? ((platillo.modifiers ?? [])
        .find((g) => g.id === GRUPO_TERMINO)
        ?.opciones.find((o) => o.id === terminoId)?.nombre ?? "")
    : "";

  // ESTADO 2: la venta cruzada se desbloquea al completar los obligatorios.
  const mostrarBebidas =
    platillo.disponible && !faltanObligatorios && complementos.length > 0;

  // El botón refleja el total real que va a entrar al carrito (platillo +
  // bebida × cantidad), para que nadie confirme sin ver lo que va a pagar.
  const bebidaElegida =
    complementos.find((b) => b.id === selectedBeverageId) ?? null;
  const totalAAgregar =
    platillo.precio + (bebidaElegida ? bebidaElegida.precio * beverageQty : 0);

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
          {/* ===== CAPA DE TÉRMINO =====
              Tiñe SOLO el centro de la foto (la carne) con el tono del término
              elegido. `transition-colors duration-700` hace que el cambio entre
              términos sea un fundido de color, no un salto. */}
          {terminoVisual && (
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-0 transition-colors duration-700 ${terminoVisual.overlay}`}
              style={{
                WebkitMaskImage: MASCARA_TERMINO,
                maskImage: MASCARA_TERMINO,
              }}
            />
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-black/20" />

          {/* Etiqueta flotante del término (o invitación a elegirlo). */}
          {tieneGrupoTermino && (
            <div className="absolute bottom-3 left-3">
              <span
                className="rounded-full border px-3 py-1 text-xs font-semibold text-white backdrop-blur-md transition-all duration-500"
                style={{
                  borderColor: `${terminoVisual?.glow ?? "#ffffff"}80`,
                  background: `${terminoVisual?.glow ?? "#ffffff"}33`,
                }}
              >
                {terminoVisual
                  ? `${nombreTermino} · ${terminoVisual.sub}`
                  : "Elige tu término 👇"}
              </span>
            </div>
          )}

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

            {/* ===== ESTADO 2 — VENTA CRUZADA CON STEPPER =====
                Integrada en el bloque de la IA. Tocar una bebida NO cierra el
                modal: oculta las demás con AnimatePresence, agranda la elegida
                y cambia su precio por un stepper para sumar unidades ahí mismo.
                `layout` hace que el reacomodo sea fluido en vez de un salto. */}
            {mostrarBebidas && (
              <motion.div layout className="mt-2.5 flex gap-2">
                <AnimatePresence initial={false} mode="popLayout">
                  {complementos.slice(0, 2).map((bebida) => {
                    const elegida = selectedBeverageId === bebida.id;
                    // Si ya hay una elegida, las demás salen de escena.
                    if (selectedBeverageId && !elegida) return null;

                    return (
                      <motion.div
                        key={bebida.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{
                          opacity: 1,
                          // La elegida se expande ligeramente.
                          scale: elegida ? 1.02 : 1,
                        }}
                        exit={{ opacity: 0, scale: 0.85, y: 4 }}
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 32,
                        }}
                        className="min-w-0 flex-1"
                      >
                        {elegida ? (
                          /* --- Tarjeta ELEGIDA: contiene el stepper ---
                             Es un <div>, no un <button>: anidar botones dentro
                             de un botón es HTML inválido y rompe los taps. */
                          <div
                            className="flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2"
                            style={{
                              borderColor: brand,
                              background: `color-mix(in srgb, ${brand} 16%, transparent)`,
                            }}
                          >
                            <span className="text-lg leading-none">
                              {bebida.emoji}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-bold leading-tight">
                                {bebida.nombre}
                              </p>
                              <p className="text-[11px] font-semibold text-white/45">
                                {formatCurrency(bebida.precio * beverageQty)}
                              </p>
                            </div>

                            {/* STEPPER en forma de píldora */}
                            <div className="flex shrink-0 items-center justify-between gap-1 rounded-full bg-zinc-800 px-3 py-1">
                              <button
                                type="button"
                                onClick={bajarCantidad}
                                className="flex h-6 w-6 items-center justify-center rounded-full text-white/70 transition hover:text-white active:scale-90"
                                aria-label={`Quitar un ${bebida.nombre}`}
                              >
                                <Minus className="h-3.5 w-3.5" strokeWidth={3} />
                              </button>
                              <motion.span
                                key={beverageQty}
                                initial={{ scale: 0.6, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.18 }}
                                className="w-4 text-center text-sm font-extrabold"
                              >
                                {beverageQty}
                              </motion.span>
                              <button
                                type="button"
                                onClick={subirCantidad}
                                className="flex h-6 w-6 items-center justify-center rounded-full transition active:scale-90"
                                style={{ color: brand }}
                                aria-label={`Agregar un ${bebida.nombre}`}
                              >
                                <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* --- Tarjeta SIN elegir: muestra el precio --- */
                          <button
                            type="button"
                            onClick={() => seleccionarBebida(bebida)}
                            className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-2.5 py-2 text-left transition active:scale-[0.97]"
                          >
                            <span className="text-lg leading-none">
                              {bebida.emoji}
                            </span>
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
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
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
                  // Los términos usan su propio color (rojo intenso -> café) en
                  // lugar del color de marca, y muestran el punto de cocción.
                  const visual =
                    grupo.id === GRUPO_TERMINO ? TERMINO_VISUAL[op.id] : null;
                  const acento = visual?.glow ?? brand;

                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => toggle(grupo, op.id)}
                      role={grupo.tipo === "multi" ? "checkbox" : "radio"}
                      aria-checked={activa}
                      className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-all duration-300"
                      style={{
                        borderColor: activa
                          ? acento
                          : "rgba(255,255,255,0.12)",
                        background: activa
                          ? visual
                            ? `${acento}1f`
                            : `color-mix(in srgb, ${brand} 22%, transparent)`
                          : "rgba(255,255,255,0.04)",
                        color: activa ? "#fff" : "rgba(255,255,255,0.7)",
                        boxShadow: activa && visual
                          ? `0 0 20px -4px ${acento}88`
                          : "none",
                      }}
                    >
                      {/* Punto que simula el interior del corte. */}
                      {visual ? (
                        <span
                          aria-hidden
                          className="h-3 w-3 shrink-0 rounded-full border border-black/20 transition-colors duration-300"
                          style={{ background: visual.punto }}
                        />
                      ) : (
                        activa && <Check className="h-3 w-3" strokeWidth={3} />
                      )}
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
                  Añadir y ver orden · {formatCurrency(totalAAgregar)}
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
