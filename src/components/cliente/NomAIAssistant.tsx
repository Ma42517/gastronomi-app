"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  Check,
  Mic,
  Plus,
  Send,
  Sparkles,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";
import type { MenuItemMock } from "@/lib/mock-data";
import { useRestauranteStore } from "@/lib/restaurante-store";
import { useNomAI } from "./NomAIContext";

const SALUDO =
  "¡Hola! Soy Ñom AI. ¿Tienes antojo de algo en especial o alguna alergia que deba conocer?";

/**
 * Resuelve el item sugerido por la IA a un producto real del menú.
 * Recibe el menú por parámetro (ya no lee el mock directo) para que respete
 * los precios y nombres que el administrador tenga guardados.
 */
function resolverItem(
  menu: MenuItemMock[],
  nombre: string,
  precio?: number,
) {
  const enMenu = menu.find(
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
 * "Ñom AI" — ventana de chat (bottom sheet) montada en el layout del cliente.
 * Ya NO tiene barra flotante propia: se abre desde la píldora central de la
 * barra de navegación inferior, evitando botones duplicados.
 */
export function NomAIAssistant() {
  const {
    platilloActual,
    categoriaActual,
    clienteNombre,
    chatAbierto,
    cerrarChat,
  } = useNomAI();

  const [aviso, setAviso] = useState<string | null>(null);
  const [agregados, setAgregados] = useState<string[]>([]);
  const [userLocation] = useState("Zamora, Michoacán");

  const addToCart = useCartStore((s) => s.addToCart);
  // Menú vivo: lo que sugiera la IA se resuelve contra los datos que el
  // administrador tenga guardados, no contra el mock original.
  const menu = useRestauranteStore((s) => s.menu);

  const {
    messages,
    setMessages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useChat({
      // id estable ⇒ la conversación se guarda en el store global del AI SDK y
      // sobrevive al cerrar/reabrir el chat (persiste a nivel de toda la app).
      id: "nom-ai-conversacion",
      api: "/api/chat",
      body: {
        currentDish: platilloActual,
        category: categoriaActual,
        location: userLocation,
        customerName: clienteNombre,
      },
      initialMessages: [{ id: "saludo", role: "assistant", content: SALUDO }],
    });

  // Al registrarse, el saludo del chat se vuelve personalizado (deja de ser
  // el genérico de invitado) sin perder el resto de la conversación.
  useEffect(() => {
    if (!clienteNombre) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === "saludo"
          ? {
              ...m,
              content: `¡Qué bueno verte de nuevo, ${clienteNombre}! ¿Se te antoja lo de siempre?`,
            }
          : m,
      ),
    );
  }, [clienteNombre, setMessages]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading, chatAbierto]);

  const brand = "var(--brand, #DC2626)";

  // Añadir desde una tarjeta del chat (tool suggestItemTool).
  const agregarSugerido = (
    toolCallId: string,
    nombre: string,
    precio?: number,
  ) => {
    if (agregados.includes(toolCallId)) return;
    const item = resolverItem(menu, nombre, precio);
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

      {/* La barra flotante antigua se eliminó: ahora Ñom AI se abre desde la
          píldora central de la barra de navegación (BarraNavegacion). */}

      {/* Aviso tipo toast */}
      {aviso && (
        <div className="animate-fade-in-up fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-neutral-900/90 px-4 py-2 text-sm font-semibold text-white shadow-2xl backdrop-blur">
          {aviso}
        </div>
      )}
    </>
  );
}
