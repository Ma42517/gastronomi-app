"use client";

import { useState } from "react";
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

/** Foto realista del corte (SIN filtro: el término se aplica en un overlay). */
const IMG_RIBEYE =
  "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=800&q=80";

/** Términos de cocción (metadatos para el selector). */
const TERMINOS = [
  { id: "rare", nombre: "Rojo", sub: "Rare", glow: "#ef4444", punto: "#b81f1f" },
  { id: "medium", nombre: "Medio", sub: "Medium", glow: "#f87171", punto: "#d24b3d" },
  { id: "medium-well", nombre: "3/4", sub: "Medium Well", glow: "#fca5a5", punto: "#dda183" },
  { id: "well", nombre: "Bien Cocido", sub: "Well Done", glow: "#b45309", punto: "#8a5a3b" },
];

/**
 * Clases del overlay de término (bg con opacidad + blend mode).
 * Se aplican sobre un div con máscara radial para focalizar SOLO el centro.
 */
const TERMINO_OVERLAY: Record<string, string> = {
  rare: "bg-red-600/50 mix-blend-color-burn",
  medium: "bg-red-400/30 mix-blend-multiply",
  "medium-well": "bg-orange-900/40 mix-blend-multiply",
  well: "bg-stone-800/60 mix-blend-multiply",
};

/** Máscara radial: el efecto de término se ve solo en el centro de los cortes. */
const MASCARA_TERMINO =
  "radial-gradient(ellipse at 50% 55%, black 15%, transparent 60%)";

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
  // Guarda la última guarnición mostrada para que la PIP no se vacíe al hacer fade-out.
  const [pipData, setPipData] = useState<OpcionGuarnicion | null>(null);

  if (!abierto) return null;

  const termino = TERMINOS.find((t) => t.id === terminoId) ?? TERMINOS[1];
  const guarnicion = guarniciones.find((g) => g.id === guarnicionId) ?? null;
  const pipVisible = guarnicion !== null;
  const total = item.precio + (guarnicion?.precio_extra ?? 0);

  const seleccionarTermino = (id: string) => {
    setTerminoId(id);
    vibrar(10);
  };

  const seleccionarGuarnicion = (g: OpcionGuarnicion) => {
    setGuarnicionId((actual) => (actual === g.id ? null : g.id));
    setPipData(g); // se conserva para el fade-out
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
        {/* --- VISUALIZADOR: contenedor único a todo lo ancho --- */}
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-t-3xl bg-black">
          {/* Foto base del Ribeye — VIVA con Ken Burns, SIN filtro */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={IMG_RIBEYE}
            alt="Ribeye a la parrilla"
            className="animate-ken-burns absolute inset-0 h-full w-full object-cover"
          />

          {/* Capa de término — focalizada al centro con máscara CSS */}
          <div
            className={`pointer-events-none absolute inset-0 transition-colors duration-700 ${
              TERMINO_OVERLAY[terminoId] ?? TERMINO_OVERLAY.medium
            }`}
            style={{
              WebkitMaskImage: MASCARA_TERMINO,
              maskImage: MASCARA_TERMINO,
            }}
          />

          {/* Scrim superior para legibilidad de controles */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/55 to-transparent" />

          {/* Handle */}
          <div className="absolute left-1/2 top-2.5 -translate-x-1/2">
            <span className="block h-1.5 w-12 rounded-full bg-white/50" />
          </div>

          {/* Cerrar */}
          <button
            type="button"
            onClick={onCerrar}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur-md transition hover:bg-black/60"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Etiqueta del término actual */}
          <div className="absolute bottom-3 left-3">
            <span
              className="rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-md transition-all duration-500"
              style={{
                borderColor: `${termino.glow}80`,
                background: `${termino.glow}33`,
                color: "#fff",
              }}
            >
              {termino.nombre} · {termino.sub}
            </span>
          </div>

          {/* GUARNICIÓN — PIP flotante en la esquina inferior derecha */}
          <div
            className={`absolute bottom-4 right-4 h-24 w-24 overflow-hidden rounded-full border-2 border-white/20 shadow-xl transition-all duration-500 ${
              pipVisible
                ? "scale-100 opacity-100"
                : "pointer-events-none scale-90 opacity-0"
            }`}
          >
            <div className="absolute inset-0 bg-neutral-800" />
            {pipData?.imagen_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pipData.imagen_url}
                alt={pipData.nombre}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
                className="relative h-full w-full object-cover"
              />
            )}
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
                    onClick={() => seleccionarGuarnicion(g)}
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
