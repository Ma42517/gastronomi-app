import Link from "next/link";
import { ArrowLeft, ShieldAlert, Terminal } from "lucide-react";
import { verificarSuperAdmin } from "@/lib/dev-auth";
import { PanelPlataforma } from "@/components/admin/PanelPlataforma";

/**
 * PANEL DE PLATAFORMA — /admin/dev
 *
 * Server Component a propósito: la comprobación de super admin se hace en el
 * servidor ANTES de enviar nada al navegador. Si se hiciera en el cliente, el
 * marcado del panel viajaría igual y bastaría con abrir las herramientas de
 * desarrollo para ver la estructura completa.
 *
 * El middleware ya garantiza que hay sesión (protege /admin/:path*); aquí se
 * comprueba el privilegio, que es otra cosa.
 */

export const dynamic = "force-dynamic";

export default async function PaginaDev() {
  const auth = await verificarSuperAdmin();

  if (!auth.ok) {
    // Se lee el motivo real de la guardia para poder explicarlo, en lugar de un
    // "no autorizado" genérico que dejaría al usuario sin saber qué hacer.
    const datos = (await auth.respuesta.json()) as { error?: string };

    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0f] px-5 py-10 text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float-slow absolute -left-24 -top-10 h-72 w-72 rounded-full bg-rose-600/15 blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <span className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-rose-500/15 text-rose-300">
            <ShieldAlert className="h-5 w-5" />
          </span>

          <h1 className="text-xl font-extrabold leading-tight">
            Acceso restringido
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/55">
            {datos.error ?? "No tienes permiso para entrar aquí."}
          </p>

          <div className="mt-5 space-y-2 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-relaxed text-white/45">
            <p className="font-bold text-white/70">Cómo darte acceso</p>
            <p>
              1. Corre{" "}
              <code className="text-violet-300">
                supabase/migrations/006_super_admin.sql
              </code>{" "}
              en el SQL Editor de Supabase.
            </p>
            <p>
              2. O añade tu correo a la variable{" "}
              <code className="text-violet-300">SUPER_ADMIN_EMAILS</code> en
              Vercel y vuelve a desplegar.
            </p>
          </div>

          <div className="mt-5 flex gap-2">
            <Link
              href="/admin"
              className="flex-1 rounded-xl border border-white/10 py-3 text-center text-sm font-bold text-white/70 transition hover:bg-white/5"
            >
              Ir al panel del dueño
            </Link>
            <Link
              href="/admin/login"
              className="flex-1 rounded-xl bg-violet-600 py-3 text-center text-sm font-bold text-white transition hover:bg-violet-500"
            >
              Cambiar de cuenta
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0f] text-white">
      {/* Halos ambientales, igual que la landing y el panel del dueño */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-float-slow absolute -left-24 -top-10 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />
        <div
          className="animate-float-slow absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-6 sm:px-8">
        <header className="mb-6">
          <Link
            href="/admin"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-white/40 transition hover:text-white/70"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al panel del dueño
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-2xl font-extrabold leading-tight sm:text-3xl">
                <Terminal className="h-6 w-6 text-violet-400" />
                Plataforma
              </h1>
              <p className="text-sm text-white/45">
                Todos los restaurantes, sus dueños y sus datos.
              </p>
            </div>

            <span
              className="shrink-0 rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-2 text-xs font-bold text-violet-200"
              title={`Acceso concedido vía ${auth.via}`}
            >
              {auth.email ?? "super admin"}
            </span>
          </div>
        </header>

        {/* Toda la interactividad vive en el componente de cliente. */}
        <PanelPlataforma />
      </div>
    </main>
  );
}
