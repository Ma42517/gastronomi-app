"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "ai/react";
import { Mic, Send, Sparkles, X } from "lucide-react";

interface NomAIAssistantProps {
  /** Sugerencia contextual mostrada en la burbuja discreta. */
  sugerencia?: string;
}

const SALUDO =
  "¡Hola! Soy Ñom AI. ¿Tienes antojo de algo en especial o alguna alergia que deba conocer?";

/**
 * "Ñom AI": asistente discreto.
 *  - Base: avatar flotante + UNA burbuja de sugerencia contextual.
 *  - Solo si el usuario pulsa "Hablar con Ñom AI" se abre el chat interactivo,
 *    conectado a un LLM real vía Vercel AI SDK (hook useChat -> /api/chat).
 * White-label vía --brand (con respaldo).
 */
export function NomAIAssistant({
  sugerencia = "¡Buena elección! ¿Quieres que te recomiende el maridaje perfecto?",
}: NomAIAssistantProps) {
  const [chatAbierto, setChatAbierto] = useState(false);
  const [sugerenciaDescartada, setSugerenciaDescartada] = useState(false);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useChat({
    api: "/api/chat",
    initialMessages: [{ id: "saludo", role: "assistant", content: SALUDO }],
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading, chatAbierto]);

  const brand = "var(--brand, #DC2626)";

  const cerrarChat = () => {
    setChatAbierto(false);
    setSugerenciaDescartada(true);
  };

  return (
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
            {messages.map((m) =>
              m.role === "user" ? (
                <div
                  key={m.id}
                  className="ml-auto max-w-[80%] rounded-2xl rounded-br-md px-3 py-2 text-sm leading-snug text-white"
                  style={{ background: brand }}
                >
                  {m.content}
                </div>
              ) : (
                <div
                  key={m.id}
                  className="max-w-[80%] rounded-2xl rounded-bl-md bg-white/10 px-3 py-2 text-sm leading-snug text-white/90"
                >
                  {m.content}
                </div>
              ),
            )}

            {/* "Escribiendo…" */}
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

            {/* Error (ej. falta OPENAI_API_KEY) */}
            {error && (
              <div className="rounded-2xl rounded-bl-md bg-red-500/15 px-3 py-2 text-xs leading-snug text-red-200">
                No pude conectar con Ñom AI. Revisa que la clave de API esté
                configurada.
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

      {/* --- BURBUJA DE SUGERENCIA DISCRETA (estado base) --- */}
      {!chatAbierto && !sugerenciaDescartada && (
        <div className="animate-fade-in-up relative w-64 max-w-[80vw] rounded-2xl bg-white p-3.5 pr-8 text-gray-800 shadow-2xl ring-1 ring-black/5">
          <button
            type="button"
            onClick={() => setSugerenciaDescartada(true)}
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
          <p className="text-sm leading-snug text-gray-700">{sugerencia}</p>

          <button
            type="button"
            onClick={() => setChatAbierto(true)}
            className="mt-2.5 w-full rounded-full px-3 py-2 text-xs font-bold text-white shadow-sm transition active:scale-95"
            style={{ background: brand }}
          >
            Hablar con Ñom AI
          </button>

          {/* Piquito hacia el avatar */}
          <div className="absolute -bottom-1.5 right-7 h-3.5 w-3.5 rotate-45 bg-white" />
        </div>
      )}

      {/* --- AVATAR FLOTANTE --- */}
      <button
        type="button"
        onClick={() => setChatAbierto((v) => !v)}
        className="animate-float-avatar relative flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-neutral-900/70 text-white shadow-xl backdrop-blur-xl transition active:scale-95"
        aria-label={chatAbierto ? "Minimizar Ñom AI" : "Abrir Ñom AI"}
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
  );
}
