"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, X } from "lucide-react";
import type { TemaRestaurante } from "@/lib/mock-data";
import { useRestauranteStore } from "@/lib/restaurante-store";
import { MediaUploader } from "@/components/admin/MediaUploader";
import { BUCKET_RESTAURANTE } from "@/lib/subir-media";

/**
 * DISEÑO DEL RESTAURANTE — modal exclusivo del super admin.
 *
 * Se abre al pulsar la cabecera del menú en modo edición. Reúne lo que cambia el
 * ASPECTO y que por tanto no es del restaurantero: color de marca, portada y logo.
 *
 * YA NO HAY ESTILO DE CABECERA NI DISPOSICIÓN DEL MENÚ. Se retiraron a propósito:
 * el comensal tiene que reconocer la aplicación sin importar en qué restaurante
 * entre, y mantener cuatro combinaciones visuales impide mejorar el diseño una vez
 * para todos.
 *
 * El aspecto del modal es el de los demás formularios del panel (fondo #12121a,
 * bordes `white/10`, acento violeta) para que no parezca una pieza de otra app.
 * La única marca distinta es la insignia de "Plataforma", que recuerda que lo que
 * se toca aquí no lo puede tocar el dueño.
 *
 * El guardado es OPTIMISTA (ver `guardarTema`): el menú de detrás cambia mientras
 * el modal sigue abierto, que es el sentido de un editor en vivo.
 */

interface ModalDisenoProps {
  abierto: boolean;
  tema: TemaRestaurante;
  onCerrar: () => void;
}

export function ModalDiseno({ abierto, tema, onCerrar }: ModalDisenoProps) {
  const guardarTema = useRestauranteStore((s) => s.guardarTema);
  const errorNube = useRestauranteStore((s) => s.errorNube);
  const [guardando, setGuardando] = useState(false);

  // Copia local solo del color: el `<input type="color">` dispara un cambio por
  // cada pixel que se arrastra en la rueda, y mandar una petición por cada uno
  // saturaría la red. Se aplica al soltar.
  const [color, setColor] = useState(tema.color_primario);
  useEffect(() => setColor(tema.color_primario), [tema.color_primario]);

  if (!abierto) return null;

  const aplicar = async (cambios: Partial<TemaRestaurante>) => {
    setGuardando(true);
    await guardarTema(cambios);
    setGuardando(false);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onCerrar}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#12121a] text-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">Diseño del menú</h2>
            <p className="flex items-center gap-1.5 text-xs text-violet-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Solo plataforma
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {/* --- Color de marca --- */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">
              Color de marca
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                // `onBlur` y no `onChange`: se guarda al terminar de elegir.
                onBlur={() => void aplicar({ color_primario: color })}
                className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                onBlur={() => {
                  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
                    void aplicar({ color_primario: color });
                  }
                }}
                placeholder="#DC2626"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 font-mono text-sm text-white outline-none transition focus:border-violet-400/60"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-white/35">
              Tiñe la cabecera, los precios y los botones del menú.
            </p>
          </div>

          {/* --- Portada --- */}
          <MediaUploader
            tipo="imagen"
            bucket={BUCKET_RESTAURANTE}
            etiqueta="Foto de portada"
            valor={tema.portada_url}
            onCambiar={(url) => void aplicar({ portada_url: url ?? "" })}
            ayuda="Se ve a lo ancho en la cabecera, así que conviene horizontal."
          />

          {/* --- Logo --- */}
          <MediaUploader
            tipo="imagen"
            bucket={BUCKET_RESTAURANTE}
            etiqueta="Logo"
            opcional
            valor={tema.logo_url ?? undefined}
            emoji=""
            onCambiar={(url) => void aplicar({ logo_url: url ?? null })}
            ayuda="Si no hay logo se muestran las iniciales."
          />

          {errorNube && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs font-medium leading-relaxed text-rose-300">
              {errorNube}
            </p>
          )}
        </div>

        <footer className="flex items-center gap-3 border-t border-white/10 px-5 py-4">
          <p className="flex-1 text-[11px] leading-snug text-white/35">
            {guardando ? (
              <span className="flex items-center gap-1.5 text-white/60">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Guardando…
              </span>
            ) : (
              "Cada cambio se guarda al momento."
            )}
          </p>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500 active:scale-[0.98]"
          >
            Listo
          </button>
        </footer>
      </div>
    </div>
  );
}
