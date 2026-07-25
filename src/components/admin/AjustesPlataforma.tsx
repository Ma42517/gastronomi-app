"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Loader2,
  Lock,
  Megaphone,
  Percent,
  Type,
  Wallet,
} from "lucide-react";
import {
  CONFIG_POR_DEFECTO,
  FUENTES,
  METODOS_PAGO,
  pilaDeFuente,
  type ConfigPlataforma,
  type MetodoPago,
} from "@/lib/config-plataforma";
import { Switch } from "./Switch";

/**
 * AJUSTES DE LA APLICACIÓN — exclusivos del dueño de la plataforma.
 *
 * Reúne lo que NO pertenece a un restaurante concreto: tipografía, formas de
 * pago, promoción global, comisión y los candados que limitan lo que puede
 * editar un dueño en su propio panel.
 *
 * Los candados se muestran en NEGATIVO ("no puede…") aunque en la base se
 * guarden como permisos, porque activar una casilla debe sentirse como cerrar
 * una puerta: es más difícil bloquear algo por accidente.
 */
export function AjustesPlataforma() {
  const [config, setConfig] = useState<ConfigPlataforma | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/dev/config");
        const data = (await res.json()) as {
          config?: ConfigPlataforma;
          error?: string;
        };
        // Aun con error se usa la config devuelta (o la de defecto) para que el
        // formulario sea usable y el aviso explique qué falta.
        setConfig(data.config ?? CONFIG_POR_DEFECTO);
        if (!res.ok) setError(data.error ?? `Error ${res.status}`);
      } catch {
        setConfig(CONFIG_POR_DEFECTO);
        setError("No se pudieron leer los ajustes.");
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!guardado) return;
    const t = window.setTimeout(() => setGuardado(false), 2200);
    return () => window.clearTimeout(t);
  }, [guardado]);

  if (cargando || !config) {
    return (
      <div className="grid place-items-center rounded-2xl border border-white/10 py-20">
        <Loader2 className="h-6 w-6 animate-spin text-white/30" />
      </div>
    );
  }

  const set = <K extends keyof ConfigPlataforma>(
    k: K,
    v: ConfigPlataforma[K],
  ) => setConfig({ ...config, [k]: v });

  const alternarPago = (id: MetodoPago) => {
    const activos = config.pagos_habilitados;
    set(
      "pagos_habilitados",
      activos.includes(id)
        ? activos.filter((p) => p !== id)
        : [...activos, id],
    );
  };

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setGuardado(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <p className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs font-medium leading-relaxed text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ===== TIPOGRAFÍA ===== */}
        <Tarjeta icono={<Type className="h-4 w-4" />} titulo="Tipografía">
          <div className="space-y-2">
            {FUENTES.map((f) => {
              const activa = config.fuente === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => set("fuente", f.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                    activa
                      ? "border-violet-400/50 bg-violet-500/15"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-white/80">
                      {f.nombre}
                    </span>
                    {/* Muestra la fuente aplicada de verdad: elegir a ciegas por
                        el nombre no dice nada. */}
                    <span
                      className="block truncate text-sm text-white/50"
                      style={{ fontFamily: pilaDeFuente(f.id) }}
                    >
                      Taco al Pastor · $22.00
                    </span>
                  </span>
                  {activa && (
                    <Check
                      className="h-4 w-4 shrink-0 text-violet-300"
                      strokeWidth={3}
                    />
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-white/30">
            Son pilas de fuentes del sistema: se aplican al instante y sin
            descargar nada. Una tipografía de marca propia requeriría volver a
            desplegar.
          </p>
        </Tarjeta>

        {/* ===== FORMAS DE PAGO ===== */}
        <Tarjeta
          icono={<Wallet className="h-4 w-4" />}
          titulo="Formas de pago"
        >
          <div className="space-y-2">
            {METODOS_PAGO.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
              >
                <span className="flex items-center gap-2 text-sm">
                  <span className="text-base">{m.emoji}</span>
                  {m.nombre}
                </span>
                <Switch
                  activo={config.pagos_habilitados.includes(m.id)}
                  onCambiar={() => alternarPago(m.id)}
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-white/30">
            Aplica a todos los restaurantes. Debe quedar al menos una activa.
          </p>

          {/* ===== COMISIÓN ===== */}
          <div className="mt-4 border-t border-white/10 pt-4">
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-white/50">
              <Percent className="h-3.5 w-3.5" />
              Comisión de la plataforma
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={config.comision_pct}
                onChange={(e) => set("comision_pct", Number(e.target.value))}
                className="w-24 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold text-white outline-none focus:border-violet-400/60"
              />
              <span className="text-sm text-white/40">% por orden</span>
            </div>
          </div>
        </Tarjeta>

        {/* ===== PROMOCIÓN GLOBAL ===== */}
        <Tarjeta
          icono={<Megaphone className="h-4 w-4" />}
          titulo="Promoción global"
        >
          <div className="mb-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <span className="text-sm font-bold">
              {config.promo_activa ? "Activa" : "Apagada"}
            </span>
            <Switch
              activo={config.promo_activa}
              onCambiar={(v) => set("promo_activa", v)}
            />
          </div>

          <div className="space-y-2.5">
            <input
              type="text"
              value={config.promo_titulo ?? ""}
              onChange={(e) => set("promo_titulo", e.target.value)}
              placeholder="Título: 2x1 en tacos este martes"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-violet-400/60"
            />
            <textarea
              value={config.promo_mensaje ?? ""}
              onChange={(e) => set("promo_mensaje", e.target.value)}
              rows={2}
              placeholder="Mensaje que verá el comensal"
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-violet-400/60"
            />
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.promo_color}
                onChange={(e) => set("promo_color", e.target.value)}
                className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent"
              />
              <input
                type="text"
                value={config.promo_color}
                onChange={(e) => set("promo_color", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-violet-400/60"
              />
            </div>
          </div>

          {/* Vista previa del banner tal como lo verá el comensal */}
          {config.promo_activa && config.promo_titulo && (
            <div
              className="mt-3 rounded-xl px-3 py-2.5 text-white"
              style={{ background: config.promo_color }}
            >
              <p className="text-xs font-extrabold">{config.promo_titulo}</p>
              {config.promo_mensaje && (
                <p className="mt-0.5 text-[11px] opacity-90">
                  {config.promo_mensaje}
                </p>
              )}
            </div>
          )}
        </Tarjeta>

        {/* ===== CANDADOS ===== */}
        <Tarjeta
          icono={<Lock className="h-4 w-4" />}
          titulo="Bloqueado para los dueños"
          tono="peligro"
        >
          <p className="mb-3 text-[11px] leading-relaxed text-white/40">
            Activa un candado para que los dueños de restaurante NO puedan hacer
            esa acción en su panel. A ti no te afecta.
          </p>

          <div className="space-y-2">
            <Candado
              etiqueta="Cambiar precios"
              bloqueado={!config.dueno_puede_editar_precios}
              onCambiar={(b) => set("dueno_puede_editar_precios", !b)}
            />
            <Candado
              etiqueta="Agregar platillos nuevos"
              bloqueado={!config.dueno_puede_crear_platillos}
              onCambiar={(b) => set("dueno_puede_crear_platillos", !b)}
            />
            <Candado
              etiqueta="Borrar platillos"
              bloqueado={!config.dueno_puede_borrar_platillos}
              onCambiar={(b) => set("dueno_puede_borrar_platillos", !b)}
            />
            <Candado
              etiqueta="Editar el programa de recompensas"
              bloqueado={!config.dueno_puede_editar_recompensas}
              onCambiar={(b) => set("dueno_puede_editar_recompensas", !b)}
            />
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-white/30">
            Los candados se aplican en el servidor, no solo ocultando botones:
            tampoco se pueden saltar llamando a la API directamente.
          </p>
        </Tarjeta>
      </div>

      {/* ===== Guardar ===== */}
      <button
        type="button"
        onClick={() => void guardar()}
        disabled={guardando}
        className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-60 ${
          guardado
            ? "bg-emerald-600 shadow-emerald-600/25"
            : "bg-violet-600 shadow-violet-600/25 hover:bg-violet-500"
        }`}
      >
        {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
        {guardado ? (
          <>
            <Check className="h-4 w-4" strokeWidth={3} />
            Guardado
          </>
        ) : (
          "Guardar ajustes de la aplicación"
        )}
      </button>
    </div>
  );
}

function Tarjeta({
  icono,
  titulo,
  tono = "normal",
  children,
}: {
  icono: React.ReactNode;
  titulo: string;
  tono?: "normal" | "peligro";
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border p-4 ${
        tono === "peligro"
          ? "border-rose-500/25 bg-rose-500/[0.04]"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <h2
        className={`mb-3 flex items-center gap-2 text-sm font-bold ${
          tono === "peligro" ? "text-rose-300" : "text-white"
        }`}
      >
        {icono}
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Candado({
  etiqueta,
  bloqueado,
  onCambiar,
}: {
  etiqueta: string;
  bloqueado: boolean;
  onCambiar: (bloqueado: boolean) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition ${
        bloqueado
          ? "border-rose-500/30 bg-rose-500/10"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <span className="flex items-center gap-2 text-sm">
        {bloqueado && <Lock className="h-3.5 w-3.5 shrink-0 text-rose-400" />}
        <span className={bloqueado ? "text-rose-200" : "text-white/70"}>
          {etiqueta}
        </span>
      </span>
      <Switch activo={bloqueado} onCambiar={onCambiar} />
    </div>
  );
}
