"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Check, Mic, Plus, Send, Sparkles, UtensilsCrossed, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";
import { TAQUERIA_EL_PRIMO } from "@/lib/mock-data";
import { useNomAI } from "./NomAIContext";

const SALUDO =
  "¡Hola! Soy Ñom AI. ¿Tienes antojo de algo en especial o alguna alergia que deba conocer?";

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
 * "Ñom AI" — componente camaleónico con dos estados:
 *  ESTADO 1 (Home): bienvenida (3s) → retracción → barra inferior con latido →
 *  al tocarla se expande al chat completo.
 *  ESTADO 2 (Detalle): el flotante se OCULTA (la IA vive inline en el platillo).
 */
export function NomAIAssistant() {
  const {
    escena,
    restauranteNombre,
    platilloActual,
    categoriaActual,
    chatAbierto,
    abrirChat,
    cerrarChat,
  } = useNomAI();

  // Fase del Estado 1: bienvenida (con texto) o barra (reposo).
  const [fase, setFase] = useState<"bienvenida" | "barra">("barra");
  const [aviso, setAviso] = useState<string | null>(null);
  const [agregados, setAgregados] = useState<string[]>([]);
  const [userLocation] = useState("Zamora, Michoacán");

  const addToCart = useCartStore((s) => s.addToCart);
  const cartCount = useCartStore((s) => s.items.length);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      api: "/api/chat",
      body: {
        currentDish: platilloActual,
        category: categoriaActual,
        location: userLocation,
      },
      initialMessages: [{ id: "saludo", role: "assistant", content: SALUDO }],
    });

  const scrollRef = useRef<HTMLDivElement>(null);

  // Texto de bienvenida contextual.
  const sugerencia = useMemo(
    () =>
      `¡Bienvenido a ${
        restauranteNombre || "nuestro restaurante"
      }! ✨ ¿Te recomiendo nuestra especialidad?`,
    [restauranteNombre],
  );

  // Auto-scroll del chat.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading, chatAbierto]);

  // BIENVENIDA (one-time por sesión): muestra el texto 3s y luego se retrae
  // ("Pac-Man") dejando la barra de reposo.
  const bienvenidaRef = useRef(false);
  useEffect(() => {
    if (bienvenidaRef.current) return;
    bienvenidaRef.current = true;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("hasSeenWelcome")) return;
    sessionStorage.setItem("hasSeenWelcome", "1");
    setFase("bienvenida");
    const t = setTimeout(() => setFase("barra"), 3000);
    return () => clearTimeout(t);
  }, []);

  const brand = "var(--brand, #DC2626)";
  // Sube por encima del carrito cuando hay artículos (sin taparlo).
  const anclaBottom = cartCount > 0 ? "bottom-24" : "bottom-4";

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
      {/* ============ VENTANA DE CHAT (expandida) ============ */}
      {chatAbierto && (
        <div
          className={`animate-fade-in-up fixed ${anclaBottom} right-4 z-[60] flex h-[26rem] max-h-[70vh] w-80 max-w-[86vw] flex-col overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/85 shadow-2xl backdrop-blur-2xl`}
        >
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

          {/* Mensajes */}
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

                  {/* Tarjeta generada por el tool suggestItemTool */}
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
                            <p className="truncate text-sm font-bold text-white">
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
      )}

      {/* ============ ESTADO 1 (Home): bienvenida / barra de reposo ============ */}
      {/* Se OCULTA por completo dentro del detalle (Estado 2 = inline). */}
      {!chatAbierto && escena !== "platillo" && (
        <div
          className={`fixed ${anclaBottom} right-4 z-30 flex items-center justify-end gap-2`}
        >
          {fase === "bienvenida" ? (
            /* Burbuja de bienvenida (se retrae a los 3s) */
            <button
              type="button"
              onClick={abrirChat}
              className="animate-fade-in-up relative max-w-[62vw] rounded-2xl bg-white px-4 py-2.5 text-left text-sm font-medium text-gray-700 shadow-2xl ring-1 ring-black/5"
            >
              {sugerencia}
              <span className="absolute -right-1.5 bottom-3 h-3 w-3 rotate-45 bg-white" />
            </button>
          ) : (
            /* Barra de reposo (se despliega desde el logo hacia la izquierda) */
            <button
              type="button"
              onClick={abrirChat}
              className="animate-bar-deploy flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900/80 py-3 pl-4 pr-3 text-sm font-medium text-white/85 shadow-xl backdrop-blur-xl transition hover:bg-neutral-900"
            >
              <Sparkles className="h-4 w-4" style={{ color: brand }} />
              Pregúntale a Ñom AI
            </button>
          )}

          {/* Logo circular con LATIDO continuo (siempre visible en Estado 1) */}
          <button
            type="button"
            onClick={abrirChat}
            className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/15 bg-neutral-900/80 text-white shadow-xl backdrop-blur-xl transition active:scale-95"
            aria-label="Abrir Ñom AI"
          >
            {/* Halo con latido (animate-pulse) */}
            <span
              className="absolute inset-0 animate-pulse rounded-full opacity-60 blur-md"
              style={{ background: `radial-gradient(circle, ${brand}, transparent 72%)` }}
            />
            <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/20" />
            <Sparkles className="relative h-6 w-6" style={{ color: brand }} />
          </button>
        </div>
      )}

      {/* Aviso tipo toast al agregar desde el chat */}
      {aviso && (
        <div className="animate-fade-in-up fixed bottom-8 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-neutral-900/90 px-4 py-2 text-sm font-semibold text-white shadow-2xl backdrop-blur">
          {aviso}
        </div>
      )}
    </>
  );
}
