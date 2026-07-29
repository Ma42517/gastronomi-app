"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  RefreshCw,
  Wrench,
} from "lucide-react";
import { useRestauranteStore } from "@/lib/restaurante-store";

/**
 * AVISOS Y ERRORES DE GUARDADO, CON SU SOLUCIÓN.
 *
 * Se muestra en los DOS sitios donde se edita: el panel de listas y el editor
 * visual. Vivía metido dentro de `EstadoConexion`, que solo existe en `/admin`,
 * así que en el editor un guardado incompleto no dejaba ningún rastro: el dueño
 * subía un video, lo veía en pantalla —la escritura es optimista— y se iba
 * convencido de que había quedado guardado.
 *
 * Dos canales, con colores distintos porque significan cosas distintas:
 *   ROJO   — no se guardó nada.
 *   ÁMBAR  — se guardó, pero incompleto (falta una columna en la base).
 */
export function AvisoEsquema() {
  const error = useRestauranteStore((s) => s.errorNube);
  const aviso = useRestauranteStore((s) => s.avisoNube);

  const [esquema, setEsquema] = useState<Esquema | null>(null);
  const [revisando, setRevisando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const revisar = async () => {
    setRevisando(true);
    try {
      const res = await fetch("/api/admin/esquema");
      const datos = (await res.json()) as Esquema & { error?: string };
      setEsquema(
        datos.error
          ? { listo: false, sql: "", resumen: datos.error, faltantes: [] }
          : datos,
      );
    } catch {
      setEsquema({
        listo: false,
        sql: "",
        resumen: "No se pudo consultar la base de datos.",
        faltantes: [],
      });
    } finally {
      setRevisando(false);
    }
  };

  if (!error && !aviso) return null;

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium leading-relaxed text-rose-300">
          {error}
        </p>
      )}

      {aviso && (
        <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
          <p className="flex gap-2 text-xs font-medium leading-relaxed text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {aviso}
          </p>

          {/* SALIDA CONCRETA, EN LUGAR DE "corre dos archivos SQL".
              Se pregunta a la base qué columnas faltan de verdad y se entrega solo
              ese SQL. Pedirle a alguien que abra dos migraciones del repositorio y
              adivine qué parte ya está aplicada es trasladarle el trabajo. */}
          {!esquema && (
            <button
              type="button"
              onClick={() => void revisar()}
              disabled={revisando}
              className="flex items-center gap-1.5 rounded-full border border-amber-400/30 px-3 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50"
            >
              {revisando ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wrench className="h-3.5 w-3.5" />
              )}
              Ver qué falta exactamente
            </button>
          )}

          {esquema && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-amber-200">
                {esquema.resumen}
              </p>

              {esquema.sql && (
                <>
                  <p className="text-[11px] leading-relaxed text-amber-300/80">
                    Pega esto en <strong>Supabase &gt; SQL Editor</strong> y pulsa
                    Run. Es lo único que falta, y se puede correr dos veces sin
                    romper nada.
                  </p>

                  <pre className="max-h-40 overflow-auto rounded-lg bg-black/50 p-3 text-[11px] leading-relaxed text-white/80">
                    {esquema.sql}
                  </pre>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(esquema.sql);
                        setCopiado(true);
                        window.setTimeout(() => setCopiado(false), 2000);
                      }}
                      className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-100 transition hover:bg-amber-500/30"
                    >
                      {copiado ? (
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copiado ? "Copiado" : "Copiar el SQL"}
                    </button>

                    <button
                      type="button"
                      onClick={() => void revisar()}
                      className="flex items-center gap-1.5 rounded-full border border-amber-400/30 px-3 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/20"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Ya lo corrí, comprobar
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Respuesta de /api/admin/esquema. */
interface Esquema {
  listo: boolean;
  resumen: string;
  sql: string;
  faltantes: { tabla: string; columna: string; para: string; migracion: string }[];
}
