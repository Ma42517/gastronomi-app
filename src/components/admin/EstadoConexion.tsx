"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  CloudOff,
  CloudUpload,
  Database,
  Loader2,
  RefreshCw,
  Stethoscope,
  X,
} from "lucide-react";
import { useRestauranteStore } from "@/lib/restaurante-store";

/**
 * INDICADOR DE CONEXIÓN CON SUPABASE.
 *
 * Sin esto, el panel mentiría: el dueño pulsaría "Guardar", vería el cambio en
 * pantalla (la escritura es optimista) y creería que quedó en la nube aunque la
 * base estuviera caída o sin sembrar. Aquí se hace visible dónde vive de verdad
 * cada cambio.
 */
/** Forma de la respuesta de /api/admin/diagnostico. */
interface Diagnostico {
  listo: boolean;
  resumen: string;
  chequeos: { paso: string; ok: boolean; detalle: string; que_hacer?: string }[];
}

export function EstadoConexion() {
  const estado = useRestauranteStore((s) => s.estadoNube);
  const error = useRestauranteStore((s) => s.errorNube);
  const publicarEnNube = useRestauranteStore((s) => s.publicarEnNube);
  const cargarDesdeNube = useRestauranteStore((s) => s.cargarDesdeNube);

  const [publicando, setPublicando] = useState(false);
  // Diagnóstico embebido: evita tener que teclear la URL de la API a mano, que
  // es donde más fácil se equivoca uno (y devuelve un 404 desconcertante).
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null);
  const [diagnosticando, setDiagnosticando] = useState(false);
  const [fallo404, setFallo404] = useState(false);
  /** Hora del diagnóstico: deja claro que es una foto y no el estado en vivo. */
  const [momento, setMomento] = useState<string | null>(null);

  const publicar = async () => {
    setPublicando(true);
    // El diagnóstico es una FOTO de un instante. Si se deja en pantalla después
    // de publicar, sigue diciendo "0 platillos" aunque ya se hayan subido, y
    // parece que la operación falló cuando en realidad funcionó.
    setDiagnostico(null);
    await publicarEnNube();
    setPublicando(false);
  };

  const recargar = () => {
    setDiagnostico(null);
    void cargarDesdeNube();
  };

  const revisar = async () => {
    setDiagnosticando(true);
    setFallo404(false);
    setDiagnostico(null);
    setMomento(null);
    try {
      const res = await fetch("/api/admin/diagnostico");
      if (res.status === 404) {
        // El navegador tiene una versión del panel más nueva que el servidor:
        // señal inequívoca de que el despliegue no se completó.
        setFallo404(true);
        return;
      }
      setDiagnostico((await res.json()) as Diagnostico);
      setMomento(
        new Date().toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    } catch {
      setFallo404(true);
    } finally {
      setDiagnosticando(false);
    }
  };

  return (
    <div className="mb-5 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* --- Insignia de estado --- */}
        {estado === "cargando" && (
          <Insignia tono="neutro">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Conectando con la base de datos…
          </Insignia>
        )}

        {estado === "sincronizado" && (
          <Insignia tono="ok">
            <Database className="h-3.5 w-3.5" />
            Sincronizado con Supabase
          </Insignia>
        )}

        {estado === "local" && (
          <Insignia tono="aviso">
            <CloudOff className="h-3.5 w-3.5" />
            Modo local — sin Supabase configurado
          </Insignia>
        )}

        {estado === "sin-sembrar" && (
          <Insignia tono="aviso">
            <AlertTriangle className="h-3.5 w-3.5" />
            Base de datos vacía
          </Insignia>
        )}

        {estado === "error" && (
          <Insignia tono="error">
            <AlertTriangle className="h-3.5 w-3.5" />
            Error de conexión
          </Insignia>
        )}

        {/* --- Acciones --- */}
        {estado !== "local" && (
          <>
            <button
              type="button"
              onClick={publicar}
              disabled={publicando}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-white/80 transition hover:bg-white/[0.12] disabled:opacity-50"
              title="Sube el menú completo de este dispositivo a Supabase"
            >
              {publicando ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CloudUpload className="h-3.5 w-3.5" />
              )}
              Publicar en Supabase
            </button>

            <button
              type="button"
              onClick={recargar}
              className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-white/50 transition hover:text-white/80"
              title="Vuelve a leer el menú desde la base de datos"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Recargar
            </button>
          </>
        )}

        {/* Disponible SIEMPRE, también en modo local: es justo cuando más se
            necesita saber qué variable falta. */}
        <button
          type="button"
          onClick={() => void revisar()}
          disabled={diagnosticando}
          className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-white/50 transition hover:text-white/80 disabled:opacity-50"
          title="Comprueba variables, conexión, tablas y datos"
        >
          {diagnosticando ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Stethoscope className="h-3.5 w-3.5" />
          )}
          Revisar conexión
        </button>
      </div>

      {/* --- Explicaciones accionables --- */}
      {estado === "sin-sembrar" && (
        <p className="text-xs leading-relaxed text-amber-300/80">
          Estás conectado, pero el menú todavía no existe en Supabase. Pulsa{" "}
          <strong>Publicar en Supabase</strong> para subirlo. Mientras tanto se
          muestra el menú de este dispositivo.
        </p>
      )}

      {estado === "local" && (
        <p className="text-xs leading-relaxed text-amber-300/80">
          Los cambios se guardan solo en este navegador. Para compartirlos entre
          dispositivos, define <code>NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> y{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code>.
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium leading-relaxed text-rose-300">
          {error}
        </p>
      )}

      {/* --- Despliegue incompleto ---
          El panel que ves en el navegador es más nuevo que el servidor. */}
      {fallo404 && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs leading-relaxed text-rose-300">
          <p className="font-bold">El servidor no tiene la ruta de diagnóstico.</p>
          <p className="mt-1 text-rose-300/80">
            Estás viendo una versión del panel más nueva que la del servidor: el
            despliegue no se completó. En Vercel, entra a{" "}
            <strong>Deployments</strong> y revisa que el último diga{" "}
            <strong>Ready</strong> (no <em>Error</em> ni <em>Building</em>).
          </p>
        </div>
      )}

      {/* --- Resultado del diagnóstico --- */}
      {diagnostico && (
        <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-baseline justify-between gap-2">
            <p
              className={`text-xs font-bold ${
                diagnostico.listo ? "text-emerald-300" : "text-amber-300"
              }`}
            >
              {diagnostico.resumen}
            </p>
            {momento && (
              <span className="shrink-0 text-[10px] text-white/30">
                revisado {momento}
              </span>
            )}
          </div>

          <ul className="space-y-1.5">
            {diagnostico.chequeos.map((c) => (
              <li key={c.paso} className="flex gap-2 text-[11px] leading-snug">
                <span
                  className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${
                    c.ok
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-rose-500/20 text-rose-300"
                  }`}
                >
                  {c.ok ? (
                    <Check className="h-2.5 w-2.5" strokeWidth={4} />
                  ) : (
                    <X className="h-2.5 w-2.5" strokeWidth={4} />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="font-semibold text-white/80">{c.paso}</span>
                  <span className="text-white/45"> — {c.detalle}</span>
                  {c.que_hacer && (
                    <span className="mt-0.5 block text-amber-300/80">
                      → {c.que_hacer}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Insignia({
  tono,
  children,
}: {
  tono: "ok" | "aviso" | "error" | "neutro";
  children: React.ReactNode;
}) {
  const tonos = {
    ok: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    aviso: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    error: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    neutro: "border-white/10 bg-white/[0.06] text-white/60",
  } as const;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${tonos[tono]}`}
    >
      {children}
    </span>
  );
}
