"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  Check,
  Mic,
  Plus,
  Send,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";
import { TAQUERIA_EL_PRIMO } from "@/lib/mock-data";
import { useNomAI } from "./NomAIContext";

const SALUDO =
  "¡Hola! Soy Ñom AI. ¿Tienes antojo de algo en especial o alguna alergia que deba conocer?";

const MENSAJE_BIENVENIDA = "¡Hola! Soy Ñom AI, pregúntame sobre el menú 👋";

/** Fases del flujo de bienvenida automático (sin interacción del cliente). */
type FaseBienvenida = "welcome" | "tooltip" | "done";

/** Resuelve el item sugerido por la IA a un producto real del menú. */
function resolverItem(nombre: string, precio?: number) {
  const enMenu = TAQUERIA_EL_PRIMO.menu.find(
    (m) => m.nombre.toLowerCase() === nombre.toLowerCase(),
  );
  if (enMenu) {
    return {
      id: enMenu.id,
      nombre: enMenu.nombre,
      precio: enMenu.precio,
      emoji: enMenu.emoji,
    };
  }
  return {
    id: `ai-${nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    nombre,
    precio: precio ?? 0,
    emoji: undefined as string | undefined,
  };
}

/**
 * "Ñom AI" — BARRA GLOBAL fija en la parte inferior (montada en el layout,
 * visible en todas las pantallas). Muestra un mensaje según la máquina de
 * estados (bienvenida / elige opción / opción elegida / recomendación) y se
 * expande hacia arriba (bottom sheet) al tocarla para abrir el chat completo.
 */
export function NomAIAssistant() {
  const {
    platilloActual,
    categoriaActual,
    restauranteNombre,
    escena,
    carritoAbierto,
    abrirCarrito,
    chatAbierto,
    abrirChat,
    cerrarChat,
  } = useNomAI();

  const [aviso, setAviso] = useState<string | null>(null);
  const [agregados, setAgregados] = useState<string[]>([]);
  const [userLocation] = useState("Zamora, Michoacán");
  const [faseBienvenida, setFaseBienvenida] = useState<FaseBienvenida>("welcome");

  const addToCart = useCartStore((s) => s.addToCart);
  const items = useCartStore((s) => s.items);
  const totalItems = items.reduce((a, i) => a + i.cantidad, 0);
  const totalCarrito = items.reduce((a, i) => a + i.precio * i.cantidad, 0);
  const hayItems = totalItems > 0;

  // La barra flotante SOLO es visible en la escena de menú/categorías. Durante un
  // platillo (tarjeta inline), el drawer del carrito o el checkout se oculta.
  const barVisible = !chatAbierto && !carritoAbierto && escena === "categorias";

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      // id estable ⇒ la conversación se guarda en el store global del AI SDK y
      // sobrevive al cerrar/reabrir el chat (persiste a nivel de toda la app).
      id: "nom-ai-conversacion",
      api: "/api/chat",
      body: {
        currentDish: platilloActual,
        category: categoriaActual,
        location: userLocation,
      },
      initialMessages: [{ id: "saludo", role: "assistant", content: SALUDO }],
    });

  // Flujo de bienvenida automático: saludo → tooltip corto → estado discreto.
  useEffect(() => {
    const aTooltip = window.setTimeout(() => setFaseBienvenida("tooltip"), 3200);
    const aDone = window.setTimeout(() => setFaseBienvenida("done"), 6800);
    return () => {
      window.clearTimeout(aTooltip);
      window.clearTimeout(aDone);
    };
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading, chatAbierto]);

  const brand = "var(--brand, #DC2626)";

  // Texto de la barra INTELIGENTE según el estado del carrito:
  //  - carrito vacío  → saludo/bienvenida de Ñom AI.
  //  - con productos  → "Ver orden y Pagar" (toca el texto/total para abrir el
  //    drawer del carrito; el avatar abre el chat conversacional).
  const bienvenidaInicial = `¡Bienvenido a ${
    restauranteNombre || TAQUERIA_EL_PRIMO.tema.nombre_restaurante
  }!`;
  const mensajeBar = hayItems
    ? "Ver orden y Pagar"
    : faseBienvenida === "welcome"
      ? bienvenidaInicial
      : MENSAJE_BIENVENIDA;

  // Añadir desde una tarjeta del chat (tool suggestItemTool).
  const agregarSugerido = (
    toolCallId: string,
    nombre: string,
    precio?: number,
  ) => {
    if (agregados.includes(toolCallId)) return;
    const item = resolverItem(nombre, precio);
    addToCart(item);
    setAgregados((prev) => [...prev, toolCallId]);
    setAviso(`✓ ${item.nombre} añadido a la cuenta`);
    window.setTimeout(() => setAviso(null), 2200);
  };

  return (
    <>
      {/* ============ CHAT EXPANDIDO (bottom sheet hacia arriba) ============ */}
      {chatAbierto && (
        <div className="fixed inset-0 z-[60] flex justify-center">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={cerrarChat}
            className="animate-backdrop-in absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div className="animate-sheet-up relative mt-auto flex h-[75vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-neutral-900/90 shadow-2xl backdrop-blur-2xl">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/10 bg-white/5 p-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                style={{
                  background: `linear-gradient(135deg, ${brand}, color-mix(in srgb, ${brand} 55%, #a855f7))`,
                }}
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white">Ñom AI</p>
                <p className="flex items-center gap-1.5 text-[11px] text-white/60">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                  En línea
                </p>
              </div>
              <button
                type="button"
                onClick={cerrarChat}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Minimizar chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mensajes (chat conversacional puro — el carrito vive en su drawer) */}
            <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto p-3">
              {messages.map((m) => {
                const esUser = m.role === "user";
                const sugerencias = !esUser
                  ? (m.toolInvocations ?? []).filter(
                      (inv) =>
                        inv.toolName === "suggestItemTool" &&
                        inv.state === "result",
                    )
                  : [];
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col gap-1.5 ${
                      esUser ? "items-end" : "items-start"
                    }`}
                  >
                    {m.content && (
                      <div
                        className={
                          esUser
                            ? "max-w-[80%] rounded-2xl rounded-br-md px-3 py-2 text-sm leading-snug text-white"
                            : "max-w-[80%] rounded-2xl rounded-bl-md bg-white/10 px-3 py-2 text-sm leading-snug text-white/90"
                        }
                        style={esUser ? { background: brand } : undefined}
                      >
                        {m.content}
                      </div>
                    )}

                    {sugerencias.map((inv) => {
                      const args = inv.args as {
                        itemName?: string;
                        price?: number;
                      };
                      const nombre = args?.itemName ?? "este platillo";
                      const precio =
                        typeof args?.price === "number" ? args.price : undefined;
                      const yaAgregado = agregados.includes(inv.toolCallId);
                      return (
                        <div
                          key={inv.toolCallId}
                          className="w-[85%] rounded-2xl border border-white/10 bg-zinc-800 p-3 shadow-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white"
                              style={{
                                background:
                                  "color-mix(in srgb, var(--brand, #DC2626) 30%, #27272a)",
                              }}
                            >
                              <UtensilsCrossed className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="break-words text-sm font-bold text-white">
                                {nombre}
                              </p>
                              {precio !== undefined && (
                                <p className="text-xs text-white/60">
                                  {formatCurrency(precio)}
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              agregarSugerido(inv.toolCallId, nombre, precio)
                            }
                            disabled={yaAgregado}
                            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-[0.98]"
                            style={{ background: yaAgregado ? "#16a34a" : brand }}
                          >
                            {yaAgregado ? (
                              <>
                                <Check className="h-4 w-4" strokeWidth={3} />
                                Añadido ✓
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4" strokeWidth={3} />
                                Añadir a la cuenta
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-md bg-white/10 px-3 py-2.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              )}

              {error && (
                <div className="rounded-2xl rounded-bl-md bg-red-500/15 px-3 py-2 text-xs leading-snug text-red-200">
                  {error.message
                    ? `Ñom AI no pudo responder: ${error.message}`
                    : "No pude conectar con Ñom AI. Revisa que la clave de API esté configurada."}
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 border-t border-white/10 bg-white/5 p-2.5"
            >
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Escribe tu antojo…"
                className="min-w-0 flex-1 rounded-full bg-white/10 px-4 py-2 text-sm text-white placeholder-white/40 outline-none ring-1 ring-transparent focus:ring-white/20"
              />
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Ordenar por voz (próximamente)"
                title="Ordenar por voz (próximamente)"
              >
                <Mic className="h-5 w-5" />
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition active:scale-90 disabled:opacity-50"
                style={{ background: brand }}
                aria-label="Enviar"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============ BARRA GLOBAL (reposo) ============
          Centrada y con ancho máximo (max-w-md). Solo visible en la escena de
          menú: durante un platillo o el checkout se oculta por completo para no
          colisionar con las tarjetas/modales (ver barVisible). */}
      {barVisible && (
        <div className="fixed inset-x-0 bottom-0 z-[55] mx-auto max-w-md p-2.5 sm:p-3">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-neutral-900/90 p-2.5 shadow-2xl backdrop-blur-xl">
            {/* AVATAR → abre el CHAT conversacional (Acción B) */}
            <button
              type="button"
              onClick={abrirChat}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 text-white"
              aria-label="Abrir chat de Ñom AI"
            >
              <span
                className="absolute inset-0 animate-pulse rounded-full opacity-60 blur-md"
                style={{
                  background: `radial-gradient(circle, ${brand}, transparent 72%)`,
                }}
              />
              <Sparkles className="relative h-5 w-5" style={{ color: brand }} />
            </button>

            {/* TEXTO → abre el DRAWER del carrito si hay items (Acción A);
                si el carrito está vacío, invita a preguntarle al chat. */}
            <button
              type="button"
              onClick={hayItems ? abrirCarrito : abrirChat}
              className="min-w-0 flex-1 text-left"
              aria-label={hayItems ? "Ver orden y pagar" : "Preguntar a Ñom AI"}
            >
              <span
                key={mensajeBar}
                className="animate-text-in block whitespace-pre-wrap break-words text-sm font-medium leading-snug text-white/85"
              >
                {mensajeBar}
              </span>
            </button>

            {/* $ TOTAL → abre el DRAWER del carrito (Acción A) */}
            {hayItems && (
              <button
                type="button"
                onClick={abrirCarrito}
                className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white shadow-md transition active:scale-95"
                style={{ background: brand }}
                aria-label="Ver tu orden y pagar"
              >
                <ShoppingBag className="h-4 w-4" />
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white/25 px-1 text-[10px] font-bold">
                  {totalItems}
                </span>
                {formatCurrency(totalCarrito)}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Aviso tipo toast */}
      {aviso && (
        <div className="animate-fade-in-up fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-neutral-900/90 px-4 py-2 text-sm font-semibold text-white shadow-2xl backdrop-blur">
          {aviso}
        </div>
      )}
    </>
  );
}
