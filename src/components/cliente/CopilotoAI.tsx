"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface CopilotoAIProps {
  /** Texto vivo del copiloto (cambia con cada modificador elegido). */
  texto: string;
  /** Pulsa el ícono mientras el modelo redacta, sin vaciar el texto actual. */
  pensando?: boolean;
}

/** Duración del fade-out; debe coincidir con `copilotoOut` en globals.css. */
const SALIDA_MS = 160;

/**
 * CONTENEDOR DE TEXTO DEL COPILOTO DE IA.
 *
 * Ocupa el lugar exacto donde antes vivía la descripción estática del platillo
 * (entre el título y el precio) y conserva su tipografía —`text-sm`,
 * `leading-relaxed`, `text-white/55`— para no romper la estética premium.
 * No es un botón ni una tarjeta: es texto corrido, como la descripción que
 * sustituye. El único añadido es una chispa en color de marca que delata que
 * ese texto está vivo.
 *
 * TRANSICIÓN: crossfade en dos fases (out 160 ms -> swap -> in 240 ms) con
 * CSS puro. Se descartó framer-motion a propósito: son ~110 KB de JS para una
 * PWA mobile-first, y el proyecto ya tiene un sistema de animaciones en
 * `globals.css` con soporte de `prefers-reduced-motion`. Meter otra librería
 * de animación habría duplicado el sistema por un solo fundido.
 */
export function CopilotoAI({ texto, pensando = false }: CopilotoAIProps) {
  // `mostrado` va un paso atrás de `texto`: permite desvanecer lo viejo antes
  // de pintar lo nuevo, en lugar de sustituirlo de golpe.
  const [mostrado, setMostrado] = useState(texto);
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    if (texto === mostrado) return;

    setSaliendo(true);
    const t = window.setTimeout(() => {
      setMostrado(texto);
      setSaliendo(false);
    }, SALIDA_MS);

    return () => window.clearTimeout(t);
  }, [texto, mostrado]);

  return (
    <div className="mt-1 flex items-start gap-1.5">
      <Sparkles
        aria-hidden
        className={`mt-[3px] h-3.5 w-3.5 shrink-0 transition-opacity ${
          pensando ? "animate-copiloto-pulse" : "opacity-70"
        }`}
        style={{ color: "var(--brand, #DC2626)" }}
      />
      {/* Mismo tamaño, color e interlineado que la descripción que reemplaza. */}
      <p
        // `key` fuerza el remount para que la animación de entrada se reejecute
        // en cada texto nuevo (sin esto, el navegador la reproduce una sola vez).
        key={mostrado}
        role="status"
        aria-live="polite"
        className={`text-sm leading-relaxed text-white/55 ${
          saliendo ? "animate-copiloto-out" : "animate-copiloto-in"
        }`}
      >
        {mostrado}
      </p>
    </div>
  );
}
