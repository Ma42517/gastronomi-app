"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Loader2,
  LockKeyhole,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigurado } from "@/lib/supabase/config";

/**
 * ENTRADA AL PANEL — /admin/login
 *
 * Inicia sesión con el cliente de NAVEGADOR a propósito: `createBrowserClient`
 * guarda la sesión en cookies, que es justo lo que el middleware y las rutas
 * /api/admin/* leen después en el servidor. Si se hiciera con el cliente básico
 * de supabase-js, el token quedaría solo en memoria y el servidor no vería nada.
 */
function FormularioLogin() {
  const router = useRouter();
  const params = useSearchParams();
  // A dónde volver tras entrar; lo pone el middleware al redirigir.
  const destino = params.get("redirigir") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Aviso verde tras desbloquear el modo plataforma. */
  const [desbloqueado, setDesbloqueado] = useState(false);

  const hayBaseDeDatos = supabaseConfigurado();

  /**
   * DESBLOQUEO DEL MODO PLATAFORMA.
   *
   * Se dispara cuando lo escrito en el primer campo NO es un correo (no lleva
   * "@"): entonces se interpreta como el usuario de plataforma y la contraseña
   * como el código. No abre sesión, solo activa el menú de super admin.
   */
  const desbloquearPlataforma = async (usuario: string) => {
    const res = await fetch("/api/dev/acceso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, clave: password }),
    });
    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      setError(data.error ?? "No se pudo activar el modo plataforma.");
      return;
    }

    setDesbloqueado(true);
    // Se limpian las credenciales del desbloqueo: lo siguiente que toca es
    // entrar con el correo real, y dejar el código en pantalla invita a
    // pulsar "Entrar" otra vez sin cambiar nada.
    setEmail("");
    setPassword("");
  };

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEntrando(true);

    try {
      // UN SOLO FORMULARIO, DOS CAMINOS. Se decide por el contenido del campo:
      // con "@" es un correo (login de Supabase); sin "@" es el usuario de
      // plataforma. Antes esto vivía en una sección aparte y plegada, que nadie
      // encontraba: lo natural es teclear "admin" aquí mismo.
      if (!email.includes("@")) {
        await desbloquearPlataforma(email);
        return;
      }

      const supabase = createClient();
      const { error: errorAuth } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (errorAuth) {
        // Los mensajes de Supabase vienen en inglés y son crípticos para el
        // dueño de una taquería; se traducen los dos casos frecuentes.
        setError(
          /invalid login credentials/i.test(errorAuth.message)
            ? "Correo o contraseña incorrectos."
            : /email not confirmed/i.test(errorAuth.message)
              ? "Tu cuenta no está confirmada. En Supabase, Authentication > Users, marca el usuario como confirmado."
              : errorAuth.message,
        );
        return;
      }

      // `refresh()` fuerza a que el servidor vuelva a evaluar la sesión recién
      // creada; sin él, el middleware podría seguir viendo al visitante sin
      // sesión y rebotar de vuelta al login.
      router.replace(destino);
      router.refresh();
    } catch {
      setError("No se pudo conectar con Supabase. Revisa tu conexión.");
    } finally {
      setEntrando(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0f] px-5 py-10 text-white">
      {/* Halos ambientales, como en la landing y el panel */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-float-slow absolute -left-24 -top-10 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />
        <div
          className="animate-float-slow absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-white/40 transition hover:text-white/70"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver al inicio
        </Link>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <span className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/15 text-violet-300">
            <LockKeyhole className="h-5 w-5" />
          </span>

          <h1 className="text-xl font-extrabold leading-tight">
            Panel Administrador
          </h1>
          <p className="mt-1 text-sm text-white/45">
            Entra con la cuenta de dueño de tu restaurante.
          </p>

          {/* Sin Supabase no hay a quién autenticar: se explica en lugar de
              mostrar un formulario que no puede funcionar. */}
          {!hayBaseDeDatos ? (
            <div className="mt-5 space-y-3">
              <p className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Supabase no está configurado, así que no hay cuentas que
                  validar. El panel funciona en modo local, sin contraseña.
                </span>
              </p>
              <Link
                href="/admin"
                className="block rounded-xl bg-violet-600 py-3 text-center text-sm font-bold text-white transition hover:bg-violet-500"
              >
                Entrar en modo local
              </Link>
            </div>
          ) : (
            <form onSubmit={entrar} className="mt-5 space-y-3">
              {desbloqueado && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    Modo plataforma activado
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-emerald-200/70">
                    Ahora entra con tu correo y contraseña. Verás el acceso a
                    Plataforma en el panel.
                  </p>
                </div>
              )}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50"
                >
                  Correo o usuario
                </label>
                {/* type="text" y NO "email": con type="email" el navegador
                    rechazaba "admin" con su propio aviso ("falta un @") y no
                    dejaba ni enviar el formulario. */}
                <input
                  id="email"
                  type="text"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dueno@mirestaurante.com"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-400/60"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50"
                >
                  Contraseña o código
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-400/60"
                />
              </div>

              {error && (
                <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium leading-relaxed text-rose-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={entrando}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500 active:scale-[0.98] disabled:opacity-60"
              >
                {entrando && <Loader2 className="h-4 w-4 animate-spin" />}
                {entrando ? "Entrando…" : "Entrar"}
              </button>
            </form>
          )}

        </div>

        {hayBaseDeDatos && (
          <p className="mt-4 text-center text-[11px] leading-relaxed text-white/30">
            Las cuentas se crean en Supabase:{" "}
            <span className="text-white/45">Authentication &gt; Users</span>.
            <br />
            Para activar el modo plataforma, escribe tu usuario de administrador
            (sin arroba) y su código.
          </p>
        )}
      </div>
    </main>
  );
}


/**
 * `useSearchParams()` obliga a renderizar en cliente, así que Next.js exige un
 * límite de Suspense: sin él, la compilación falla al prerenderizar esta página
 * ("should be wrapped in a suspense boundary"). El fallback replica el marco de
 * la tarjeta para que no haya un salto de layout al hidratar.
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-5">
          <div className="h-72 w-full max-w-sm animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
        </main>
      }
    >
      <FormularioLogin />
    </Suspense>
  );
}
