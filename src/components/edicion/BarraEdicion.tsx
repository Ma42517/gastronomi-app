"use client";

import { Eye, Pencil, ShieldCheck, Store } from "lucide-react";
import { useModoEdicion } from "@/lib/modo-edicion";

/**
 * BARRA FLOTANTE DEL MODO EDICIÓN.
 *
 * Solo existe para quien puede editar ESTE restaurante: si el servidor dice que
 * no, no se dibuja nada y el comensal ve su menú sin rastro de que esto exista.
 *
 * POR QUÉ ARRIBA Y NO ABAJO
 * Abajo ya vive la barra de navegación del comensal, con el botón de pagar. Una
 * barra flotante más en la misma zona competiría por el mismo pulgar en un
 * teléfono, y la que perdería sería la de pagar, que es la que da dinero. Va
 * centrada arriba, donde no hay nada táctil.
 */
export function BarraEdicion() {
  const rol = useModoEdicion((e) => e.rol);
  const email = useModoEdicion((e) => e.email);
  const modoEdicion = useModoEdicion((e) => e.modoEdicion);
  const alternar = useModoEdicion((e) => e.alternarModoEdicion);

  if (!rol) return null;

  const esSuperAdmin = rol === "super_admin";

  return (
    <div
      data-barra-edicion
      className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex justify-center px-4"
    >
      <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-zinc-900/90 px-2 py-1.5 shadow-2xl backdrop-blur-xl">
        {/* Rol: deja claro qué se puede tocar antes de encender nada. */}
        <span
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
            esSuperAdmin
              ? "bg-violet-500/20 text-violet-200"
              : "bg-emerald-500/15 text-emerald-200"
          }`}
          title={email ?? undefined}
        >
          {esSuperAdmin ? (
            <ShieldCheck className="h-3.5 w-3.5" />
          ) : (
            <Store className="h-3.5 w-3.5" />
          )}
          {esSuperAdmin ? "Plataforma" : "Mi restaurante"}
        </span>

        <button
          type="button"
          onClick={alternar}
          aria-pressed={modoEdicion}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition active:scale-95 ${
            modoEdicion
              ? "bg-white text-zinc-900"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          {modoEdicion ? (
            <>
              <Eye className="h-3.5 w-3.5" />
              Ver como cliente
            </>
          ) : (
            <>
              <Pencil className="h-3.5 w-3.5" />
              Modo edición
            </>
          )}
        </button>
      </div>
    </div>
  );
}
