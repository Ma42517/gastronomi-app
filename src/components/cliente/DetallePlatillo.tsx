"use client";

import { useEffect, useState } from "react";
import {
  Check,
  CreditCard,
  MessageCircle,
  Plus,
  Sparkles,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";
import { TAQUERIA_EL_PRIMO } from "@/lib/mock-data";
import type { GrupoModificador, MenuItemMock } from "@/lib/mock-data";
import { useNomAI } from "./NomAIContext";
import { BotonFavorito } from "./BotonFavorito";

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

/**
 * Venta cruzada INTELIGENTE: el complemento se elige según la categoría real
 * del platillo (no al azar y sin inventar productos):
 *  - Antojitos salados (tacos, tortas, quesadillas, volcanes, papas) → BEBIDA.
 *  - Bebidas → un antojito para acompañar.
 *  - Postres → una bebida caliente/fría (no otro postre).
 */
function sugerirCrossSell(item: MenuItemMock): MenuItemMock | null {
  const menu = TAQUERIA_EL_PRIMO.menu;
  const buscar = (id: string) =>
    menu.find((m) => m.id === id && m.disponible && m.id !== item.id) ?? null;

  // Con una bebida en mano, lo que falta es la comida.
  if (item.categoria === "Bebidas") {
    return buscar("t-pastor") ?? buscar("q-asada");
  }

  // Con un postre, una bebida para acompañar.
  if (item.categoria === "Postres") {
    return buscar("b-coca") ?? buscar("b-horchata");
  }

  // Antojitos salados → refresco bien frío (o horchata como respaldo).
  return buscar("b-coca") ?? buscar("b-horchata") ?? buscar("p-flan");
}

/** Mensaje del complemento según lo que se está pidiendo. */
function mensajeComplemento(item: MenuItemMock, sugerido: MenuItemMock | null) {
  if (!sugerido) return "¡Excelente elección! Ya está en tu orden. 🎉";
  if (item.categoria === "Bebidas") {
    return `¡Buena elección! ¿Le sumamos unos ${sugerido.nombre} para acompañar? 🌮`;
  }
  if (item.categoria === "Postres") {
    return `¡Excelente! ¿Un ${sugerido.nombre} bien frío para acompañar tu postre? 🥤`;
  }
  return `¡Excelente elección! ¿Le sumas un ${sugerido.nombre} bien frío para acompañar? 🥤`;
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
  const { abrirChat, abrirCarrito } = useNomAI();

  /** Ir a pagar sin volver al menú: cierra el detalle y abre el carrito. */
  const irAPagar = () => {
    onCerrar();
    abrirCarrito();
  };

  const [agregado, setAgregado] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [selecciones, setSelecciones] = useState<Record<string, string[]>>({});
  // Tarjeta INLINE de Ñom AI (ya NO barra fija): reacción tras un clic real y,
  // solo tras agregar, la sugerencia de complemento.
  const [reaccion, setReaccion] = useState<string | null>(null);
  const [sugeridoAgregado, setSugeridoAgregado] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Toast discreto (favoritos).
  const mostrarToast = (mensaje: string) => setToast(mensaje);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const sugerido = item ? sugerirCrossSell(item) : null;
  const mensajeCrossSell = item ? mensajeComplemento(item, sugerido) : "";

  // "Agregar al carrito" se habilita solo cuando TODOS los grupos marcados como
  // obligatorios tienen al menos una selección real del cliente.
  const gruposObligatorios = (item?.modifiers ?? []).filter((g) => g.requerido);
  const faltanObligatorios = gruposObligatorios.some(
    (g) => (selecciones[g.id]?.length ?? 0) === 0,
  );

  const agregar = () => {
    if (!item) return;
    addToCart({
      id: item.id,
      nombre: item.nombre,
      precio: item.precio,
      emoji: item.emoji,
    });
    // Timing estricto: la sugerencia de complemento solo aparece AHORA (tras
    // agregar el platillo principal), nunca antes.
    setAgregado(true);
  };

  const agregarSugeridoInline = () => {
    if (!sugerido) return;
    addToCart({
      id: sugerido.id,
      nombre: sugerido.nombre,
      precio: sugerido.precio,
      emoji: sugerido.emoji,
    });
    setSugeridoAgregado(true);
  };

  // Al abrir/cambiar de platillo: reinicia selección y estado de la tarjeta.
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
    setReaccion(null);
    setSugeridoAgregado(false);
  }, [abierto, item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!abierto || !item) return null;

  const brand = "var(--brand, #DC2626)";

  // Solo con un clic REAL del usuario se describe la opción (nunca por default).
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
    setReaccion(REACCIONES[opcionId] ?? "¡Buena elección!");
  };

  // Texto de la tarjeta inline (timing estricto):
  //  - antes de agregar: contexto/reacción a la opción elegida (SIN extras).
  //  - después de agregar: recomendación de complemento (con botón de acción).
  const textoTarjeta = agregado
    ? mensajeCrossSell
    : reaccion ?? `¡Buena elección! ${item.descripcion}`;

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
          {/* Favorito + Cerrar, flotando sobre la imagen */}
          <div className="absolute right-3 top-3 flex items-center gap-2">
            <BotonFavorito
              itemId={item.id}
              nombre={item.nombre}
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

          {/* ===== Tarjeta Ñom AI INTEGRADA (estática, position: static) =====
              Va DEBAJO del botón de agregar; no es barra fija ni tiene chevron.
              Timing estricto: no sugiere complementos ni muestra botón de extra
              hasta que el usuario agrega el platillo principal a la cuenta. */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p
              className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide"
              style={{ color: brand }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Ñom AI
            </p>
            <p className="text-sm leading-snug text-white/85">{textoTarjeta}</p>

            {agregado && sugerido ? (
              <button
                type="button"
                onClick={agregarSugeridoInline}
                disabled={sugeridoAgregado}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-70"
                style={{ background: sugeridoAgregado ? "#16a34a" : brand }}
              >
                {sugeridoAgregado ? (
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
            ) : null}

            {/* Tras agregar: pagar aquí mismo, sin volver al menú principal. */}
            {agregado ? (
              <button
                type="button"
                onClick={irAPagar}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-neutral-900 shadow-sm transition hover:bg-white/90 active:scale-[0.98]"
              >
                <CreditCard className="h-4 w-4" />
                Ver orden y pagar
              </button>
            ) : (
              <button
                type="button"
                onClick={abrirChat}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/15 active:scale-[0.98]"
              >
                <MessageCircle className="h-4 w-4" />
                Hablar con Ñom AI
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toast discreto de favoritos */}
      {toast && (
        <div className="animate-fade-in-up absolute bottom-8 left-1/2 z-[70] -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900 shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
