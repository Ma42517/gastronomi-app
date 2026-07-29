"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, MessageSquare, Star } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

/**
 * CALIFICACIONES DEL SERVICIO — vista del dueño.
 *
 * Muestra el promedio, el reparto por estrellas y los comentarios recientes.
 *
 * Decisión de producto: los comentarios NEGATIVOS se destacan en lugar de
 * esconderse. Un panel que solo enseña las cinco estrellas es un adorno; lo que
 * hace falta es que el dueño vea rápido lo que hay que arreglar.
 */

interface Resumen {
  total: number;
  promedio: number;
  cinco: number;
  cuatro: number;
  tres: number;
  dos: number;
  una: number;
  propina_media: number;
}

interface Calificacion {
  id: string;
  mesa: string | null;
  estrellas: number;
  etiquetas: unknown;
  comentario: string | null;
  propina: number;
  created_at: string;
}

/** Traducción de los ids de etiqueta a texto legible. */
const ETIQUETAS: Record<string, string> = {
  amable: "Amable",
  rapido: "Rápido",
  atento: "Atento",
  "recomendo-bien": "Recomendó bien",
  "buen-ambiente": "Buen ambiente",
  lento: "Lento",
  distraido: "Distraído",
};

export function PanelCalificaciones() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [lista, setLista] = useState<Calificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/calificaciones");
        const data = (await res.json()) as {
          resumen?: Resumen;
          calificaciones?: Calificacion[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
        setResumen(data.resumen ?? null);
        setLista(data.calificaciones ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudieron cargar.");
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  if (cargando) {
    return (
      <div className="grid place-items-center rounded-2xl border border-white/10 py-20">
        <Loader2 className="h-6 w-6 animate-spin text-white/30" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs font-medium leading-relaxed text-amber-300">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        {error}
      </p>
    );
  }

  if (!resumen || resumen.total === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
        <Star className="mx-auto h-10 w-10 text-white/15" strokeWidth={1.5} />
        <p className="mt-3 text-sm text-white/40">
          Todavía no hay calificaciones.
        </p>
        <p className="mt-1 text-xs text-white/25">
          Aparecen cuando un cliente termina de pagar y valora el servicio.
        </p>
      </div>
    );
  }

  const promedio = Number(resumen.promedio);
  const reparto = [
    { estrellas: 5, n: Number(resumen.cinco) },
    { estrellas: 4, n: Number(resumen.cuatro) },
    { estrellas: 3, n: Number(resumen.tres) },
    { estrellas: 2, n: Number(resumen.dos) },
    { estrellas: 1, n: Number(resumen.una) },
  ];
  const total = Number(resumen.total);
  // Se cuentan las flojas por separado: es el número que exige acción.
  const flojas = Number(resumen.una) + Number(resumen.dos);

  return (
    <div className="space-y-4">
      {/* ===== Resumen ===== */}
      <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center">
          <p className="text-4xl font-extrabold text-white">
            {promedio.toFixed(1)}
          </p>
          <div className="mt-1.5 flex justify-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className="h-4 w-4"
                style={{
                  // Se rellena hasta el entero más cercano al promedio.
                  fill: n <= Math.round(promedio) ? "#f59e0b" : "transparent",
                  color: n <= Math.round(promedio) ? "#f59e0b" : "#4b5563",
                }}
                strokeWidth={1.5}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-white/40">
            {total} calificación{total === 1 ? "" : "es"}
          </p>
          <p className="mt-3 border-t border-white/10 pt-3 text-xs text-white/45">
            Propina media
            <span className="ml-1 font-bold text-white/80">
              {formatCurrency(Number(resumen.propina_media))}
            </span>
          </p>
        </div>

        {/* Reparto por estrellas */}
        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          {reparto.map((r) => {
            const pct = total > 0 ? (r.n / total) * 100 : 0;
            return (
              <div key={r.estrellas} className="flex items-center gap-2">
                <span className="w-8 shrink-0 text-xs font-bold text-white/50">
                  {r.estrellas}★
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: r.estrellas <= 2 ? "#f43f5e" : "#f59e0b",
                    }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs text-white/40">
                  {r.n}
                </span>
              </div>
            );
          })}

          {flojas > 0 && (
            <p className="mt-1 flex items-center gap-1.5 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-[11px] font-semibold text-rose-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {flojas} cliente{flojas === 1 ? "" : "s"} calificó el servicio con
              1 o 2 estrellas.
            </p>
          )}
        </div>
      </div>

      {/* ===== Comentarios recientes ===== */}
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-white">
          <MessageSquare className="h-4 w-4" />
          Últimas calificaciones
        </h3>

        <ul className="space-y-2">
          {lista.map((c) => {
            const etiquetas = Array.isArray(c.etiquetas)
              ? (c.etiquetas as string[])
              : [];
            const floja = c.estrellas <= 2;

            return (
              <li
                key={c.id}
                className={`rounded-2xl border p-3 ${
                  floja
                    ? "border-rose-500/25 bg-rose-500/[0.06]"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className="h-3.5 w-3.5"
                        style={{
                          fill: n <= c.estrellas ? "#f59e0b" : "transparent",
                          color: n <= c.estrellas ? "#f59e0b" : "#4b5563",
                        }}
                        strokeWidth={1.5}
                      />
                    ))}
                  </span>

                  {c.mesa && (
                    <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-white/45">
                      Mesa {c.mesa}
                    </span>
                  )}

                  {Number(c.propina) > 0 && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      {formatCurrency(Number(c.propina))} propina
                    </span>
                  )}

                  <span className="ml-auto shrink-0 text-[10px] text-white/25">
                    {new Date(c.created_at).toLocaleDateString("es-MX", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {etiquetas.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {etiquetas.map((e) => (
                      <span
                        key={e}
                        className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/50"
                      >
                        {ETIQUETAS[e] ?? e}
                      </span>
                    ))}
                  </div>
                )}

                {c.comentario && (
                  <p className="mt-1.5 text-sm leading-snug text-white/70">
                    “{c.comentario}”
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
