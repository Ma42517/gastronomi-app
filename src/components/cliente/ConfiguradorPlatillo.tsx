"use client";

import { useEffect, useState } from "react";
import { Check, Flame, Plus, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { MenuItemMock, OpcionGuarnicion } from "@/lib/mock-data";
import { useNomAI } from "./NomAIContext";

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

/** Mensaje de invitación (Estado B) mientras el cliente no elige nada. */
const INVITE_TERMINO = "¡Buena elección! Ahora elige tu término 👇";

/** Reacciones de Ñom AI por término (Estado C: solo tras un clic real). */
const REACCIONES_TERMINO: Record<string, string> = {
  rare: "Término Rojo: centro rojo y muy jugoso, la carne en su punto más suave. Para quien ama la textura tierna.",
  medium:
    "Término Medio: centro rosado y jugoso, el equilibrio perfecto entre sabor y textura.",
  "medium-well":
    "Término 3/4: apenas un toque rosado, más cocido pero conservando su jugosidad.",
  well: "Bien Cocido: cocción completa y sin rosado, para quien prefiere la carne bien hecha.",
};

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
  const { setBarMensaje, setBarRecomendacion, setBarAccion } = useNomAI();

  // Ninguna opción llega preseleccionada: el término empieza sin elegir.
  const [terminoId, setTerminoId] = useState<string | null>(null);
  const [guarnicionId, setGuarnicionId] = useState<string | null>(null);
  // Guarda la última guarnición mostrada para que la PIP no se vacíe al hacer fade-out.
  const [pipData, setPipData] = useState<OpcionGuarnicion | null>(null);

  const termino = TERMINOS.find((t) => t.id === terminoId) ?? null;
  const guarnicion = guarniciones.find((g) => g.id === guarnicionId) ?? null;
  const total = item.precio + (guarnicion?.precio_extra ?? 0);
  // El término de cocción es OBLIGATORIO: sin él no se puede agregar.
  const puedeConfirmar = terminoId !== null;

  const confirmar = () => {
    vibrar(22);
    onConfirmar();
    onCerrar();
  };

  // Estado B: al abrir el configurador, la barra global invita a elegir el
  // término (sin describir la opción preseleccionada por default). Al cerrar,
  // la barra vuelve al mensaje de bienvenida.
  useEffect(() => {
    if (!abierto) return;
    setBarMensaje(INVITE_TERMINO);
    setBarRecomendacion(null);
    setBarAccion(null);
    return () => {
      setBarMensaje(null);
      setBarRecomendacion(null);
      setBarAccion(null);
    };
  }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  // Publica/limpia "Agregar al carrito" en la barra global: aparece en cuanto el
  // cliente elige el término (obligatorio) y desaparece al cerrar el configurador.
  useEffect(() => {
    if (!abierto) return;
    setBarAccion(
      puedeConfirmar
        ? { etiqueta: `Agregar · ${formatCurrency(total)}`, onAgregar: confirmar }
        : null,
    );
  }, [abierto, puedeConfirmar, total]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!abierto) return null;

  // Estado C: describe el término SOLO tras un clic real del cliente.
  const seleccionarTermino = (id: string) => {
    setTerminoId(id);
    setBarMensaje(REACCIONES_TERMINO[id] ?? "¡Buena elección!");
    vibrar(10);
  };

  // Estado C: describe la guarnición elegida; al quitarla, vuelve a invitar.
  const seleccionarGuarnicion = (g: OpcionGuarnicion) => {
    setGuarnicionId((actual) => {
      const quitar = actual === g.id;
      setBarMensaje(
        quitar
          ? INVITE_TERMINO
          : `${g.nombre}: una guarnición que combina muy bien con tu corte. 🔥`,
      );
      return quitar ? null : g.id;
    });
    setPipData(g); // se conserva para el fade-out
    vibrar(8);
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
        {/* --- VISUALIZADOR: layout dinámico Split-Screen --- */}
        <div className="relative flex aspect-video w-full shrink-0 overflow-hidden rounded-t-3xl bg-zinc-900">
          {/* MITAD IZQUIERDA — Carne (100% sin guarnición, 50% con guarnición) */}
          <div
            className={`relative h-full shrink-0 overflow-hidden transition-all duration-500 ease-in-out ${
              guarnicion ? "w-1/2" : "w-full"
            }`}
          >
            {/* Foto base del Ribeye — VIVA con Ken Burns, SIN filtro */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={IMG_RIBEYE}
              alt="Ribeye a la parrilla"
              className="animate-ken-burns absolute inset-0 h-full w-full object-cover"
            />

            {/* Capa de término — focalizada al centro con máscara CSS (solo sobre
                la carne). Solo se aplica cuando el cliente ya eligió un término. */}
            {terminoId && (
              <div
                className={`pointer-events-none absolute inset-0 transition-colors duration-700 ${
                  TERMINO_OVERLAY[terminoId] ?? TERMINO_OVERLAY.medium
                }`}
                style={{
                  WebkitMaskImage: MASCARA_TERMINO,
                  maskImage: MASCARA_TERMINO,
                }}
              />
            )}

            {/* Etiqueta del término actual (o invitación a elegir) */}
            <div className="absolute bottom-3 left-3">
              <span
                className="rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-md transition-all duration-500"
                style={{
                  borderColor: `${termino?.glow ?? "#ffffff"}80`,
                  background: `${termino?.glow ?? "#ffffff"}33`,
                  color: "#fff",
                }}
              >
                {termino ? `${termino.nombre} · ${termino.sub}` : "Elige tu término 👇"}
              </span>
            </div>
          </div>

          {/* MITAD DERECHA — Guarnición (0% oculta, 50% visible), cambia dinámicamente */}
          <div
            className={`relative h-full shrink-0 overflow-hidden transition-all duration-500 ease-in-out ${
              guarnicion ? "w-1/2" : "w-0"
            }`}
          >
            {pipData?.imagen_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={pipData.id}
                src={pipData.imagen_url}
                alt={pipData.nombre}
                onError={(e) => {
                  e.currentTarget.style.opacity = "0";
                }}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            {/* Separador sutil entre las dos mitades */}
            <div className="absolute inset-y-0 left-0 w-px bg-white/15" />
            {/* Nombre de la guarnición */}
            {pipData && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
                <p className="text-xs font-bold leading-tight text-white">
                  {pipData.nombre}
                </p>
                <p className="text-[10px] text-white/65">
                  +{formatCurrency(pipData.precio_extra)}
                </p>
              </div>
            )}
          </div>

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
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80">
              <span className="flex items-center gap-1.5">
                <Flame className="h-4 w-4" style={{ color: "var(--brand)" }} />
                Término de la carne
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{
                  background: "color-mix(in srgb, var(--brand) 22%, transparent)",
                  color: "color-mix(in srgb, var(--brand) 70%, white)",
                }}
              >
                Obligatorio
              </span>
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
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80">
              Elige tu guarnición
              <span className="text-xs font-normal text-white/40">(opcional)</span>
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

        {/* --- BARRA INFERIOR: precio en vivo + agregar ---
            pb amplio para que el botón quede POR ENCIMA de la barra global de
            Ñom AI (que va fija abajo) y siempre sea utilizable en desktop. */}
        <div className="shrink-0 border-t border-white/10 bg-neutral-900/60 p-4 pb-24 backdrop-blur-md">
          <button
            type="button"
            onClick={confirmar}
            disabled={!puedeConfirmar}
            className="flex w-full items-center justify-between rounded-3xl px-6 py-4 text-white shadow-lg transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              background: puedeConfirmar
                ? "linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 60%, #f59e0b))"
                : "#3f3f46",
            }}
          >
            <span className="flex items-center gap-2 text-base font-bold">
              <Plus className="h-5 w-5" strokeWidth={2.5} />
              {puedeConfirmar ? "Agregar al carrito" : "Elige tu término"}
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
