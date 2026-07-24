"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { Mic, Plus, Send, Sparkles, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useNomAI } from "./NomAIContext";

const SALUDO =
  "¡Hola! Soy Ñom AI. ¿Tienes antojo de algo en especial o alguna alergia que deba conocer?";

/**
 * "Ñom AI": Capitán de Meseros virtual.
 *  - Estado base: avatar flotante + UNA burbuja de sugerencia CONTEXTUAL
 *    (el texto cambia según la escena/ruta para guiar y hacer upselling).
 *  - Solo al pulsar "Hablar con Ñom AI" se abre el chat real (Vercel AI SDK).
 * White-label vía --brand.
 */
export function NomAIAssistant() {
  const { escena, restauranteNombre, platilloActual } = useNomAI();
  const pathname = usePathname();

  const [chatAbierto, setChatAbierto] = useState(false);
  const [sugerenciaVisible, setSugerenciaVisible] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  // TODO: atar a la API de geolocalización del navegador. Por ahora fijo.
  const [userLocation] = useState("Zamora, Michoacán");

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useChat({
    api: "/api/chat",
    // Contexto dinámico enviado al backend en cada mensaje.
    body: { currentDish: platilloActual, location: userLocation },
    initialMessages: [{ id: "saludo", role: "assistant", content: SALUDO }],
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  // Mensaje contextual (Context Awareness) según la escena activa.
  const sugerencia = useMemo(() => {
    switch (escena) {
      case "platillo":
        return "¡Uff, excelente elección! Este corte sale increíble con un buen acompañamiento. ¿Le agregamos una guarnición para compartir?";
      case "carrito":
        return "¡Casi listos! 🍷 Tu pedido se ve delicioso. ¿Te agrego un postre o una bebida fría antes de confirmar?";
      default:
        return `¡Bienvenido a ${
          restauranteNombre || "nuestro restaurante"
        }! ✨ ¿Vienes con mucha hambre hoy o prefieres que te recomiende nuestra especialidad más vendida?`;
    }
  }, [escena, restauranteNombre]);

  // Auto-scroll del chat.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading, chatAbierto]);

  // Al cambiar de escena o de ruta, vuelve a mostrar la sugerencia contextual.
  useEffect(() => {
    setSugerenciaVisible(true);
  }, [escena, pathname]);

  const brand = "var(--brand, #DC2626)";

  const cerrarChat = () => {
    setChatAbierto(false);
    setSugerenciaVisible(false);
  };

  // El avatar NO abre el chat: solo muestra/oculta la burbuja de sugerencia.
  // (Si el chat está abierto, actúa como "cerrar").
  const alPulsarAvatar = () => {
    if (chatAbierto) {
      setChatAbierto(false);
      return;
    }
    setSugerenciaVisible((v) => !v);
  };

  // Acción del botón de "Agregar" que sugiere la IA (por ahora, toast + log).
  const agregarSugerido = (nombre: string) => {
    console.log("[Carrito] Agregado desde Ñom AI:", nombre);
    setAviso(`✓ ${nombre} agregado al carrito`);
    window.setTimeout(() => setAviso(null), 2200);
  };

  return (
    <>
      <div className="fixed bottom-24 right-4 z-[60] flex flex-col items-end gap-3">
      {/* --- VENTANA DE CHAT (solo tras pulsar "Hablar con Ñom AI") --- */}
      {chatAbierto && (
        <div className="animate-fade-in-up flex h-[26rem] max-h-[70vh] w-80 max-w-[86vw] flex-col overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/80 shadow-2xl backdrop-blur-2xl">
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
                      inv.toolName === "suggestItem" &&
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

                  {/* Botones interactivos generados por el tool suggestItem */}
                  {sugerencias.map((inv) => {
                    const args = inv.args as {
                      itemName?: string;
                      price?: number;
                    };
                    const nombre = args?.itemName ?? "este platillo";
                    const precio =
                      typeof args?.price === "number" ? args.price : undefined;
                    return (
                      <button
                        key={inv.toolCallId}
                        type="button"
                        onClick={() => agregarSugerido(nombre)}
                        className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold text-white shadow-md transition active:scale-95"
                        style={{ background: brand }}
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                        Agregar {nombre}
                        {precio !== undefined
                          ? ` · ${formatCurrency(precio)}`
                          : ""}
                      </button>
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

      {/* --- BURBUJA DE SUGERENCIA CONTEXTUAL (estado base) --- */}
      {!chatAbierto && sugerenciaVisible && (
        <div className="animate-fade-in-up relative w-64 max-w-[80vw] rounded-2xl bg-white p-3.5 pr-8 text-gray-800 shadow-2xl ring-1 ring-black/5">
          <button
            type="button"
            onClick={() => setSugerenciaVisible(false)}
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar sugerencia"
          >
            <X className="h-4 w-4" />
          </button>

          <p
            className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide"
            style={{ color: brand }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Ñom AI
          </p>

          {/* key={escena} => transición suave al cambiar de pantalla */}
          <p key={escena} className="animate-text-in text-sm leading-snug text-gray-700">
            {sugerencia}
          </p>

          <button
            type="button"
            onClick={() => {
              setChatAbierto(true);
              setSugerenciaVisible(false);
            }}
            className="mt-2.5 w-full rounded-full px-3 py-2 text-xs font-bold text-white shadow-sm transition active:scale-95"
            style={{ background: brand }}
          >
            Hablar con Ñom AI
          </button>

          <div className="absolute -bottom-1.5 right-7 h-3.5 w-3.5 rotate-45 bg-white" />
        </div>
      )}

      {/* --- AVATAR FLOTANTE --- */}
      <button
        type="button"
        onClick={alPulsarAvatar}
        className="animate-float-avatar relative flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-neutral-900/70 text-white shadow-xl backdrop-blur-xl transition active:scale-95"
        aria-label={chatAbierto ? "Cerrar chat de Ñom AI" : "Mostrar sugerencia de Ñom AI"}
      >
        <span
          className="absolute inset-0 rounded-full opacity-60 blur-md"
          style={{ background: `radial-gradient(circle, ${brand}, transparent 72%)` }}
        />
        <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/20" />
        {chatAbierto ? (
          <X className="relative h-6 w-6" />
        ) : (
          <Sparkles className="relative h-6 w-6" style={{ color: brand }} />
        )}
      </button>
      </div>

      {/* Aviso tipo toast al agregar desde el chat */}
      {aviso && (
        <div className="animate-fade-in-up fixed bottom-8 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-neutral-900/90 px-4 py-2 text-sm font-semibold text-white shadow-2xl backdrop-blur">
          {aviso}
        </div>
      )}
    </>
  );
}
