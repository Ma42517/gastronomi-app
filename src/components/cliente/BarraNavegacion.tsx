"use client";

import { useEffect, useRef, useState } from "react";
import { Gift, Home, Search, Sparkles, User, X } from "lucide-react";
import { NomAIBubble } from "./NomAIBubble";

export type TabActivo = "home" | "vip" | "perfil";

interface BarraNavegacionProps {
  tab: TabActivo;
  onTab: (t: TabActivo) => void;
  /** Abre el chat de Ñom AI (píldora central). */
  onAbrirChat: () => void;
  /** Abre el drawer del carrito desde la viñeta (rol de cajero de Ñom AI). */
  onPagarOrden: () => void;
  /** Dispara el destello del botón VIP (al agregar algo o sumar un sello). */
  brillarVIP: boolean;
  /** Texto de búsqueda global (controlado por el padre). */
  busqueda: string;
  onBuscar: (texto: string) => void;
}

/**
 * Barra de navegación flotante y modular (estilo Uber Eats):
 * Home y VIP a la izquierda, píldora central de Ñom AI, y Lupa + Perfil a la
 * derecha. NO hay botón de carrito: Ñom AI asume el rol de cajero a través de
 * su viñeta proactiva.
 *
 * La LUPA vive junto a la píldora de Ñom AI (antes estaba en las pills de
 * categorías). Al tocarla, la barra completa se transforma en un campo de
 * búsqueda a todo lo ancho, sin sacar al cliente de su contexto.
 */
export function BarraNavegacion({
  tab,
  onTab,
  onAbrirChat,
  onPagarOrden,
  brillarVIP,
  busqueda,
  onBuscar,
}: BarraNavegacionProps) {
  const [buscando, setBuscando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Al expandir la lupa, enfoca el campo para escribir de inmediato.
  useEffect(() => {
    if (buscando) inputRef.current?.focus();
  }, [buscando]);

  /** Los resultados de búsqueda solo se pintan en el Home: se fuerza ese tab. */
  const abrirBusqueda = () => {
    onTab("home");
    setBuscando(true);
  };

  const cerrarBusqueda = () => {
    onBuscar("");
    setBuscando(false);
  };

  // --- MODO BÚSQUEDA: la barra se convierte en un campo a todo lo ancho ---
  if (buscando) {
    return (
      <nav className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center">
        <div className="flex flex-1 items-center gap-2 rounded-full bg-white py-1 pl-4 pr-1.5 shadow-lg ring-1 ring-black/5">
          <Search
            className="h-4 w-4 shrink-0"
            strokeWidth={2.5}
            style={{ color: "var(--brand)" }}
          />
          <input
            ref={inputRef}
            type="text"
            value={busqueda}
            onChange={(e) => onBuscar(e.target.value)}
            placeholder="¿Qué se te antoja?"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm font-medium text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={cerrarBusqueda}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 active:scale-90"
            aria-label="Cerrar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center justify-between gap-2">
      {/* 1) Home */}
      <BotonCirculo
        activo={tab === "home"}
        onClick={() => onTab("home")}
        aria-label="Inicio"
      >
        <Home className="h-5 w-5" />
      </BotonCirculo>

      {/* 2) VIP / Premios — EFECTO "CASINO".
             El halo naranja late en bucle mientras el tab NO está activo, para
             que la sección de premios se sienta como una máquina de recompensas
             y atraiga el toque. Al entrar al tab el latido se apaga (ya cumplió
             su función) y al ganar un sello se dispara el destello puntual. */}
      <BotonCirculo
        activo={tab === "vip"}
        onClick={() => onTab("vip")}
        aria-label="Beneficios y premios"
        // Una sola animación a la vez: dos clases `animate-*` en el mismo
        // elemento se pisan entre sí (gana la última del CSS, no la del JSX).
        // El destello puntual tiene prioridad sobre el latido de fondo.
        className={
          brillarVIP
            ? "animate-vip-glow"
            : tab === "vip"
              ? ""
              : // `!` fuerza el naranja sobre el text-gray-700 de BotonCirculo:
                // ambas son utilidades text-*, así que sin important el ganador
                // dependería del orden del CSS generado, no del JSX.
                "animate-casino !text-orange-400 transition-all duration-700 ease-in-out"
        }
      >
        <Gift className="h-5 w-5" />
      </BotonCirculo>

      {/* 3) Ñom AI — píldora expandida central (ancla de la viñeta) */}
      <div className="relative flex flex-1 justify-center">
        {/* Viñeta proactiva: brota justo ARRIBA de esta píldora */}
        <NomAIBubble onPagarOrden={onPagarOrden} enHome={tab === "home"} />

        <button
          type="button"
          onClick={onAbrirChat}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 shadow-lg ring-1 ring-black/5 transition active:scale-95"
          aria-label="Abrir chat de Ñom AI"
        >
          <Sparkles
            className="h-5 w-5 shrink-0"
            style={{ color: "var(--brand)" }}
          />
          <span className="whitespace-nowrap text-sm font-bold text-gray-900">
            Ñom AI
          </span>
        </button>
      </div>

      {/* 4) Lupa — pegada a Ñom AI: buscar y preguntar viven juntos */}
      <BotonCirculo
        activo={busqueda.trim().length > 0}
        onClick={abrirBusqueda}
        aria-label="Buscar en el menú"
      >
        <Search className="h-5 w-5" strokeWidth={2.5} />
      </BotonCirculo>

      {/* 5) Perfil — el carrito ya no vive aquí: Ñom AI hace de cajero */}
      <BotonCirculo
        activo={tab === "perfil"}
        onClick={() => onTab("perfil")}
        aria-label="Tu perfil"
      >
        <User className="h-5 w-5" />
      </BotonCirculo>
    </nav>
  );
}

/** Botón circular flotante (blanco con sombra suave; negro si está activo). */
function BotonCirculo({
  children,
  onClick,
  activo = false,
  badge,
  className = "",
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  activo?: boolean;
  badge?: number;
  className?: string;
} & React.AriaAttributes) {
  return (
    <button
      type="button"
      onClick={onClick}
      {...rest}
      className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-md ring-1 ring-black/5 transition-all duration-300 active:scale-90 ${
        activo ? "bg-gray-900 text-white" : "bg-white text-gray-700"
      } ${className}`}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span
          className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ring-2 ring-white"
          style={{ background: "var(--brand)" }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
