"use client";

import { Gift, Home, ShoppingBag, Sparkles, User } from "lucide-react";

export type TabActivo = "home" | "vip" | "perfil";

interface BarraNavegacionProps {
  tab: TabActivo;
  onTab: (t: TabActivo) => void;
  /** Abre el chat de Ñom AI (píldora central). */
  onAbrirChat: () => void;
  /** Abre el drawer del carrito. */
  onAbrirCarrito: () => void;
  /** Artículos en el carrito (badge). */
  totalItems: number;
  /** Dispara el destello del botón VIP (al agregar algo o sumar un sello). */
  brillarVIP: boolean;
}

/**
 * Barra de navegación flotante y modular (estilo Uber Eats):
 * círculos blancos flotantes para las secciones y una píldora central expandida
 * para Ñom AI. No ocupa el ancho completo ni empuja el contenido.
 */
export function BarraNavegacion({
  tab,
  onTab,
  onAbrirChat,
  onAbrirCarrito,
  totalItems,
  brillarVIP,
}: BarraNavegacionProps) {
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

      {/* 2) VIP / Premios — con micro-interacción de brillo */}
      <BotonCirculo
        activo={tab === "vip"}
        onClick={() => onTab("vip")}
        aria-label="Beneficios y premios"
        className={brillarVIP ? "animate-vip-glow" : ""}
      >
        <Gift className="h-5 w-5" />
      </BotonCirculo>

      {/* 3) Ñom AI — píldora expandida central */}
      <button
        type="button"
        onClick={onAbrirChat}
        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 shadow-lg ring-1 ring-black/5 transition active:scale-95"
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

      {/* 4) Carrito — con badge de notificaciones */}
      <BotonCirculo
        onClick={onAbrirCarrito}
        aria-label="Ver tu orden"
        badge={totalItems}
      >
        <ShoppingBag className="h-5 w-5" />
      </BotonCirculo>

      {/* 5) Perfil */}
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
