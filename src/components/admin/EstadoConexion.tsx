"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CloudOff,
  CloudUpload,
  Database,
  Loader2,
  RefreshCw,
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
export function EstadoConexion() {
  const estado = useRestauranteStore((s) => s.estadoNube);
  const error = useRestauranteStore((s) => s.errorNube);
  const publicarEnNube = useRestauranteStore((s) => s.publicarEnNube);
  const cargarDesdeNube = useRestauranteStore((s) => s.cargarDesdeNube);

  const [publicando, setPublicando] = useState(false);

  const publicar = async () => {
    setPublicando(true);
    await publicarEnNube();
    setPublicando(false);
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
              onClick={() => void cargarDesdeNube()}
              className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-white/50 transition hover:text-white/80"
              title="Vuelve a leer el menú desde la base de datos"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Recargar
            </button>
          </>
        )}
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
