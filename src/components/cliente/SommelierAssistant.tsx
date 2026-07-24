"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Send, Sparkles, X } from "lucide-react";

interface Mensaje {
  id: number;
  autor: "bot" | "user";
  texto: string;
}

const MENSAJE_INICIAL =
  "¡Hola! Soy tu Sommelier Ñom. ¿Tienes antojo de algo en especial o alguna alergia que deba conocer?";

const RESPUESTA_BOT =
  "¡Entendido! Basado en lo que me dices, la especialidad de la casa te va a encantar. ¿Quieres que te la agregue a tu carrito?";

/**
 * "Sommelier Ñom": chatbot de lujo (estilo Intercom / Apple Messages).
 * Avatar flotante + ventana de chat glassmorphism con conversación simulada.
 * White-label vía --brand (con respaldo por si se usa fuera del tema).
 */
export function SommelierAssistant() {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    { id: 0, autor: "bot", texto: MENSAJE_INICIAL },
  ]);
  const [input, setInput] = useState("");
  const [escribiendo, setEscribiendo] = useState(false);

  const idRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll al último mensaje.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [mensajes, escribiendo, abierto]);

  // Limpieza del timeout al desmontar.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const enviar = () => {
    const texto = input.trim();
    if (!texto || escribiendo) return;

    setMensajes((prev) => [
      ...prev,
      { id: idRef.current++, autor: "user", texto },
    ]);
    setInput("");
    setEscribiendo(true);

    timeoutRef.current = setTimeout(() => {
      setEscribiendo(false);
      setMensajes((prev) => [
        ...prev,
        { id: idRef.current++, autor: "bot", texto: RESPUESTA_BOT },
      ]);
    }, 1500);
  };

  const brand = "var(--brand, #DC2626)";

  return (
    <div className="fixed bottom-24 right-4 z-[60] flex flex-col items-end gap-3">
      {/* --- VENTANA DE CHAT --- */}
      {abierto && (
        <div className="animate-fade-in-up flex h-[26rem] max-h-[70vh] w-80 max-w-[86vw] flex-col overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/80 shadow-2xl backdrop-blur-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-white/10 bg-white/5 p-3">
            <div
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-white"
              style={{
                background: `linear-gradient(135deg, ${brand}, color-mix(in srgb, ${brand} 55%, #a855f7))`,
              }}
            >
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white">Sommelier Ñom</p>
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
              onClick={() => setAbierto(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Minimizar chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mensajes */}
          <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto p-3">
            {mensajes.map((m) =>
              m.autor === "bot" ? (
                <div
                  key={m.id}
                  className="max-w-[80%] rounded-2xl rounded-bl-md bg-white/10 px-3 py-2 text-sm leading-snug text-white/90"
                >
                  {m.texto}
                </div>
              ) : (
                <div
                  key={m.id}
                  className="ml-auto max-w-[80%] rounded-2xl rounded-br-md px-3 py-2 text-sm leading-snug text-white"
                  style={{ background: brand }}
                >
                  {m.texto}
                </div>
              ),
            )}

            {/* Indicador "escribiendo…" */}
            {escribiendo && (
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
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-white/10 bg-white/5 p-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") enviar();
              }}
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
              type="button"
              onClick={enviar}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition active:scale-90"
              style={{ background: brand }}
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* --- AVATAR FLOTANTE --- */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="animate-float-avatar relative flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-neutral-900/70 text-white shadow-xl backdrop-blur-xl transition active:scale-95"
        aria-label={abierto ? "Minimizar Sommelier Ñom" : "Abrir Sommelier Ñom"}
      >
        <span
          className="absolute inset-0 rounded-full opacity-60 blur-md"
          style={{ background: `radial-gradient(circle, ${brand}, transparent 72%)` }}
        />
        <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/20" />
        {abierto ? (
          <X className="relative h-6 w-6" />
        ) : (
          <Sparkles className="relative h-6 w-6" style={{ color: brand }} />
        )}
      </button>
    </div>
  );
}
