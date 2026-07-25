"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, UserCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigurado } from "@/lib/supabase/config";

/**
 * Identidad del dueño en el panel: su correo y el botón de salir.
 *
 * Sin esto no habría forma de cerrar sesión desde la interfaz: la sesión vive en
 * cookies y duraría hasta caducar, lo cual es un problema real si el panel se
 * abre en la tablet del mostrador, a la vista de todo el personal.
 */
export function SesionDueno() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [saliendo, setSaliendo] = useState(false);
  /** null mientras se comprueba; evita parpadear el aviso de "sin sesión". */
  const [haySesion, setHaySesion] = useState<boolean | null>(null);

  const conBaseDeDatos = supabaseConfigurado();

  useEffect(() => {
    // En modo local no hay sesión que mostrar ni que exigir.
    if (!conBaseDeDatos) {
      setHaySesion(false);
      return;
    }

    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setHaySesion(Boolean(data.user));
    });
  }, [conBaseDeDatos]);

  /**
   * AVISO DE SESIÓN AUSENTE.
   *
   * Con Supabase configurado, el middleware debería haber redirigido al login
   * antes de llegar aquí. Si el panel se ve igualmente, es que el middleware no
   * está actuando —casi siempre porque el despliegue que lo incluye todavía no
   * ha salido— y el panel estaría abierto a cualquiera. Callarse eso sería lo
   * peor que podría hacer esta interfaz.
   */
  if (conBaseDeDatos && haySesion === false) {
    return (
      <a
        href="/admin/login"
        className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-300 transition hover:bg-rose-500/25"
        title="El panel se abrió sin sesión: el middleware no está activo"
      >
        <UserCircle2 className="h-3.5 w-3.5" />
        Sin sesión — entrar
      </a>
    );
  }

  if (!email) return null;

  const salir = async () => {
    setSaliendo(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    // `refresh()` obliga al middleware a reevaluar: ya sin cookie, redirige al
    // login. Sin él se quedaría el panel en pantalla con la sesión ya cerrada.
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-flex max-w-[190px] items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white/70"
        title={email}
      >
        <UserCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{email}</span>
      </span>

      <button
        type="button"
        onClick={() => void salir()}
        disabled={saliendo}
        className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-white/50 transition hover:border-rose-400/40 hover:text-rose-300 disabled:opacity-50"
        title="Cerrar sesión"
      >
        <LogOut className="h-3.5 w-3.5" />
        Salir
      </button>
    </div>
  );
}
