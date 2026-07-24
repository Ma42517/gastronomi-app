"use client";

import { useRef, useState } from "react";
import { Check, Flame, Plus, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { MenuItemMock, OpcionGuarnicion } from "@/lib/mock-data";

interface ConfiguradorPlatilloProps {
  abierto: boolean;
  item: MenuItemMock;
  guarniciones: OpcionGuarnicion[];
  onCerrar: () => void;
  onConfirmar: () => void;
}

/** Foto realista del corte (base sobre la que actúan los filtros CSS). */
const IMG_RIBEYE =
  "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=800&q=80";

/**
 * Términos de cocción. En lugar de dibujar la carne, aplicamos filtros CSS
 * avanzados sobre una fotografía real para simular cada término.
 *  - filtro: filter CSS de la imagen base.
 *  - tint: color sólido superpuesto (mix-blend multiply) — transiciona suave.
 *  - glowOpacity: opacidad del brillo rojizo central (mix-blend screen).
 *  - punto: color representativo para el swatch del selector.
 */
const TERMINOS = [
  {
    id: "rare",
    nombre: "Rojo",
    sub: "Rare",
    glow: "#ef4444",
    punto: "#b81f1f",
    filtro: "saturate(1.55) contrast(1.08) brightness(1.05)",
    tint: "rgba(140,15,20,0.18)",
    glowOpacity: 0.85,
  },
  {
    id: "medium",
    nombre: "Medio",
    sub: "Medium",
    glow: "#f87171",
    punto: "#d24b3d",
    filtro: "saturate(1.15) contrast(1.18) brightness(1)",
    tint: "rgba(90,20,15,0.10)",
    glowOpacity: 0.45,
  },
  {
    id: "medium-well",
    nombre: "3/4",
    sub: "Medium Well",
    glow: "#fca5a5",
    punto: "#dda183",
    filtro: "saturate(0.92) contrast(1.06) brightness(0.9) sepia(0.18)",
    tint: "rgba(110,70,32,0.34)",
    glowOpacity: 0.15,
  },
  {
    id: "well",
    nombre: "Bien Cocido",
    sub: "Well Done",
    glow: "#b45309",
    punto: "#8a5a3b",
    filtro: "grayscale(0.32) saturate(0.7) contrast(1.12) brightness(0.78) sepia(0.4)",
    tint: "rgba(48,26,12,0.55)",
    glowOpacity: 0,
  },
];

/** Respuesta háptica sutil (solo dispositivos compatibles). */
function vibrar(ms = 8) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(ms);
  }
}

/** Precio con animación de rebote al cambiar (remount por key). */
function PrecioAnimado({ value }: { value: number }) {
  return (
    <span key={value} className="animate-number-pop inline-block tabular-nums">
      {formatCurrency(value)}
    </span>
  );
}

export function ConfiguradorPlatillo({
  abierto,
  item,
  guarniciones,
  onCerrar,
  onConfirmar,
}: ConfiguradorPlatilloProps) {
  const [terminoId, setTerminoId] = useState("medium");
  const [guarnicionId, setGuarnicionId] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  if (!abierto) return null;

  const termino = TERMINOS.find((t) => t.id === terminoId) ?? TERMINOS[1];
  const guarnicion = guarniciones.find((g) => g.id === guarnicionId) ?? null;
  const total = item.precio + (guarnicion?.precio_extra ?? 0);

  const seleccionarTermino = (id: string) => {
    setTerminoId(id);
    vibrar(10);
    // Re-dispara el micro-zoom sin recargar la imagen (truco de reflow).
    const el = imgRef.current;
    if (el) {
      el.classList.remove("animate-hero-zoom");
      void el.offsetWidth;
      el.classList.add("animate-hero-zoom");
    }
  };

  const seleccionarGuarnicion = (id: string) => {
    setGuarnicionId((actual) => (actual === id ? null : id));
    vibrar(8);
  };

  const confirmar = () => {
    vibrar(22);
    onConfirmar();
    onCerrar();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onCerrar}
        className="animate-backdrop-in absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* Bottom sheet — glassmorphism oscuro */}
      <div className="animate-sheet-up relative mt-auto flex max-h-[95vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-neutral-900/85 text-white shadow-2xl backdrop-blur-2xl">
        {/* Handle + cerrar */}
        <div className="relative flex shrink-0 items-center justify-center pt-3">
          <span className="h-1.5 w-12 rounded-full bg-white/25" />
          <button
            type="button"
            onClick={onCerrar}
            className="absolute right-4 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* --- VISUALIZADOR FOTOGRÁFICO INTERACTIVO --- */}
        <div className="relative mx-4 mt-3 h-52 shrink-0 overflow-hidden rounded-3xl border border-white/10 bg-black">
          {/* Fotografía base del corte (los filtros simulan el término) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={IMG_RIBEYE}
            alt="Ribeye a la parrilla"
            className="absolute inset-0 h-full w-full object-cover will-change-transform"
            style={{
              filter: termino.filtro,
              transition: "filter 0.7s ease-in-out",
            }}
          />

          {/* Tinte de cocción (color sólido, mezcla multiply) */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: termino.tint,
              mixBlendMode: "multiply",
              transition: "background-color 0.7s ease-in-out",
            }}
          />

          {/* Brillo rojizo central (para el término rojo/medio, mezcla screen) */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 42%, rgba(220,40,35,0.9), rgba(180,20,20,0.15) 45%, transparent 66%)",
              mixBlendMode: "screen",
              opacity: termino.glowOpacity,
              transition: "opacity 0.7s ease-in-out",
            }}
          />

          {/* Degradado inferior para legibilidad de la etiqueta */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />

          {/* Vapor */}
          <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center gap-7">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="steam-line h-12 w-1 rounded-full bg-white/25 blur-[2px]"
                style={{ animationDelay: `${i * 0.6}s` }}
              />
            ))}
          </div>

          {/* Etiqueta del término actual */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
            <span
              className="rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-md transition-all duration-500"
              style={{
                borderColor: `${termino.glow}80`,
                background: `${termino.glow}22`,
                color: "#fff",
              }}
            >
              {termino.nombre} · {termino.sub}
            </span>
          </div>
        </div>

        {/* --- CONTENIDO CONFIGURABLE (scroll) --- */}
        <div className="flex-1 space-y-6 overflow-y-auto px-5 pb-4 pt-5">
          <div>
            <h2 className="text-2xl font-extrabold leading-tight">{item.nombre}</h2>
            <p className="mt-1 text-sm leading-relaxed text-white/55">
              {item.descripcion}
            </p>
          </div>

          {/* Selector de término */}
          <div>
            <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-white/80">
              <Flame className="h-4 w-4" style={{ color: "var(--brand)" }} />
              Término de la carne
            </p>
            <div className="grid grid-cols-4 gap-2">
              {TERMINOS.map((t) => {
                const activo = t.id === terminoId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => seleccionarTermino(t.id)}
                    className="flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 transition-all duration-300"
                    style={{
                      borderColor: activo ? t.glow : "rgba(255,255,255,0.1)",
                      background: activo ? `${t.glow}1f` : "rgba(255,255,255,0.04)",
                      boxShadow: activo ? `0 0 20px -4px ${t.glow}88` : "none",
                    }}
                  >
                    <span
                      className="h-5 w-5 rounded-full border border-black/20 transition-colors duration-300"
                      style={{ background: t.punto }}
                    />
                    <span className="text-[13px] font-bold leading-none">
                      {t.nombre}
                    </span>
                    <span className="text-[10px] leading-none text-white/45">
                      {t.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Guarnición */}
          <div>
            <p className="mb-3 text-sm font-semibold text-white/80">
              Elige tu guarnición
            </p>
            <div className="flex flex-wrap gap-2">
              {guarniciones.map((g) => {
                const activa = g.id === guarnicionId;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => seleccionarGuarnicion(g.id)}
                    className="flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-300"
                    style={{
                      borderColor: activa
                        ? "var(--brand)"
                        : "rgba(255,255,255,0.12)",
                      background: activa
                        ? "color-mix(in srgb, var(--brand) 22%, transparent)"
                        : "rgba(255,255,255,0.04)",
                      color: activa ? "#fff" : "rgba(255,255,255,0.7)",
                    }}
                  >
                    {activa && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    {g.nombre}
                    <span className="text-xs text-white/50">
                      +{formatCurrency(g.precio_extra)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* --- BARRA INFERIOR: precio en vivo + agregar --- */}
        <div className="shrink-0 border-t border-white/10 bg-neutral-900/60 p-4 pb-6 backdrop-blur-md">
          <button
            type="button"
            onClick={confirmar}
            className="flex w-full items-center justify-between rounded-3xl px-6 py-4 text-white shadow-lg transition-all duration-300 active:scale-[0.98]"
            style={{
              background:
                "linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 60%, #f59e0b))",
            }}
          >
            <span className="flex items-center gap-2 text-base font-bold">
              <Plus className="h-5 w-5" strokeWidth={2.5} />
              Agregar al carrito
            </span>
            <span className="text-lg font-extrabold">
              <PrecioAnimado value={total} />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
