"use client";

import { useEffect, useState } from "react";
import { Check, Gift, Minus, Plus } from "lucide-react";
import {
  useRestauranteStore,
  type LealtadEditable,
} from "@/lib/restaurante-store";
import { CampoImagen } from "./CampoImagen";

/**
 * MÓDULO DE RECOMPENSAS.
 *
 * Configura el premio del programa de lealtad: título, foto y cuántas visitas
 * hacen falta para canjearlo. Igual que el formulario de platillos, trabaja
 * sobre un borrador y solo escribe en el store al guardar.
 *
 * Incluye una vista previa de la tarjeta de sellos tal como la verá el cliente,
 * porque cambiar "5 visitas" a "8" en un input no transmite lo lejos que queda
 * el premio; verlo dibujado, sí.
 */
export function PanelRecompensas() {
  const lealtad = useRestauranteStore((s) => s.lealtad);
  const guardarLealtad = useRestauranteStore((s) => s.guardarLealtad);

  const [borrador, setBorrador] = useState<LealtadEditable>(lealtad);
  const [guardado, setGuardado] = useState(false);

  // Si el store se rehidrata (o cambia por otra vía), el borrador se sincroniza.
  useEffect(() => setBorrador(lealtad), [lealtad]);

  // El aviso de "guardado" se apaga solo.
  useEffect(() => {
    if (!guardado) return;
    const t = window.setTimeout(() => setGuardado(false), 2200);
    return () => window.clearTimeout(t);
  }, [guardado]);

  const sellos = borrador.sellos_para_recompensa;
  const cambiarSellos = (valor: number) =>
    setBorrador((b) => ({
      ...b,
      // Rango razonable: menos de 2 no es un programa y más de 20 desmotiva.
      sellos_para_recompensa: Math.min(20, Math.max(2, valor)),
    }));

  const guardar = () => {
    guardarLealtad({
      ...borrador,
      descripcion_recompensa:
        borrador.descripcion_recompensa.trim() || "Premio sorpresa",
      // El progreso del cliente nunca puede exceder la nueva meta.
      sellos_actuales: Math.min(borrador.sellos_actuales, sellos),
    });
    setGuardado(true);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      {/* --- Formulario --- */}
      <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <Gift className="h-5 w-5 text-violet-400" />
            Programa de lealtad
          </h2>
          <p className="mt-1 text-sm text-white/45">
            Define el premio que gana el cliente al acumular visitas.
          </p>
        </div>

        <CampoImagen
          valor={borrador.imagen_premio}
          emoji="🎁"
          etiqueta="Imagen del premio"
          onCambiar={(img) =>
            setBorrador((b) => ({ ...b, imagen_premio: img }))
          }
        />

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">
            Título del premio
          </label>
          <input
            type="text"
            value={borrador.descripcion_recompensa}
            onChange={(e) =>
              setBorrador((b) => ({
                ...b,
                descripcion_recompensa: e.target.value,
              }))
            }
            placeholder="Ej. Orden de Pastor gratis"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-400/60"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">
            Visitas necesarias para canjear
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => cambiarSellos(sellos - 1)}
              disabled={sellos <= 2}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/10 disabled:opacity-30"
              aria-label="Quitar una visita"
            >
              <Minus className="h-4 w-4" strokeWidth={3} />
            </button>
            <span className="w-14 text-center text-2xl font-extrabold text-white">
              {sellos}
            </span>
            <button
              type="button"
              onClick={() => cambiarSellos(sellos + 1)}
              disabled={sellos >= 20}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/10 disabled:opacity-30"
              aria-label="Agregar una visita"
            >
              <Plus className="h-4 w-4" strokeWidth={3} />
            </button>
            <p className="ml-1 text-xs leading-snug text-white/35">
              Entre 2 y 20 visitas.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={guardar}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-lg transition active:scale-[0.98] ${
            guardado
              ? "bg-emerald-600 shadow-emerald-600/25"
              : "bg-violet-600 shadow-violet-600/25 hover:bg-violet-500"
          }`}
        >
          {guardado ? (
            <>
              <Check className="h-4 w-4" strokeWidth={3} />
              Guardado
            </>
          ) : (
            "Guardar recompensa"
          )}
        </button>
      </div>

      {/* --- Vista previa de la tarjeta del cliente --- */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-white/40">
          Así lo verá el cliente
        </p>

        <div
          className="rounded-3xl p-5 text-white shadow-xl"
          style={{
            background:
              "linear-gradient(135deg, #DC2626, color-mix(in srgb, #DC2626 60%, #f59e0b))",
          }}
        >
          <div className="flex items-center gap-3">
            {borrador.imagen_premio ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={borrador.imagen_premio}
                alt="Premio"
                className="h-12 w-12 shrink-0 rounded-xl object-cover ring-2 ring-white/30"
              />
            ) : (
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-black/20 text-2xl">
                🎁
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">
                Tu recompensa
              </p>
              <p className="truncate text-base font-extrabold leading-tight">
                {borrador.descripcion_recompensa || "Sin título"}
              </p>
            </div>
          </div>

          {/* Sellos */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {Array.from({ length: sellos }, (_, i) => (
              <span
                key={i}
                className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold ${
                  i < borrador.sellos_actuales
                    ? "bg-white text-red-600"
                    : "bg-black/20 text-white/50"
                }`}
              >
                {i < borrador.sellos_actuales ? "✓" : i + 1}
              </span>
            ))}
          </div>

          <p className="mt-3 text-xs text-white/80">
            {Math.max(0, sellos - borrador.sellos_actuales)} visitas para tu
            premio.
          </p>
        </div>
      </div>
    </div>
  );
}
