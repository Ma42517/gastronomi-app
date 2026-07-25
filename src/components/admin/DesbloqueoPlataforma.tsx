"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Loader2, Terminal } from "lucide-react";

/**
 * DESBLOQUEO DEL MODO PLATAFORMA — dentro de la misma pantalla de login.
 *
 * Va plegado y discreto bajo el formulario normal: no es una puerta alternativa,
 * es un interruptor. El código NO inicia sesión; marca el navegador y después
 * hay que entrar con el correo y la contraseña reales. Por eso, al desbloquear,
 * el mensaje empuja explícitamente a continuar con el login de arriba: si no,
 * cualquiera esperaría estar ya dentro.
 *
 * La sección solo aparece si el servidor confirma que el modo está configurado
 * (`SUPER_ADMIN_CLAVE`). Ofrecer un campo que no puede funcionar sería peor que
 * no ofrecerlo.
 */
export function DesbloqueoPlataforma() {
  const [disponible, setDisponible] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/dev/acceso")
      .then((r) => r.json() as Promise<{ disponible?: boolean }>)
      .then((d) => setDisponible(Boolean(d.disponible)))
      .catch(() => setDisponible(false));
  }, []);

  if (!disponible) return null;

  const desbloquear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/dev/acceso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, clave }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo desbloquear.");
      setListo(true);
      setClave("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo desbloquear.");
    } finally {
      setEnviando(false);
    }
  };

  // --- Ya desbloqueado: se explica que falta iniciar sesión ---
  if (listo) {
    return (
      <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
          Modo plataforma desbloqueado
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-emerald-200/70">
          Ahora inicia sesión arriba con tu correo y contraseña. Al entrar verás
          el acceso a <strong>Plataforma</strong> en el panel.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      {!abierto ? (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="flex w-full items-center justify-center gap-1.5 text-[11px] font-semibold text-white/30 transition hover:text-white/60"
        >
          <Terminal className="h-3 w-3" />
          Acceso de plataforma
          <ChevronDown className="h-3 w-3" />
        </button>
      ) : (
        <form onSubmit={desbloquear} className="space-y-2.5">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-white/40">
            <Terminal className="h-3 w-3" />
            Acceso de plataforma
          </p>

          <input
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="Usuario"
            autoComplete="off"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-400/60"
          />

          <input
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder="Código"
            autoComplete="off"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-400/60"
          />

          {error && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] font-medium text-rose-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando || !usuario.trim() || !clave.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-violet-500/15 py-2.5 text-xs font-bold text-violet-200 transition hover:bg-violet-500/25 disabled:opacity-40"
          >
            {enviando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Activar modo plataforma
          </button>

          <p className="text-center text-[10px] leading-relaxed text-white/25">
            Esto solo activa el menú. Después inicia sesión con tu correo.
          </p>
        </form>
      )}
    </div>
  );
}
