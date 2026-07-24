import { Sparkles } from "lucide-react";
import type { ProgramaLealtad } from "@/lib/mock-data";

/**
 * Tarjeta de lealtad PREMIUM ("Club VIP").
 * Gradiente elegante (derivado de --brand: de oscuro a un naranja brillante)
 * + barra de progreso moderna. El color se hereda del tema (white-label).
 */
export function TarjetaSellos({ lealtad }: { lealtad: ProgramaLealtad }) {
  const { sellos_actuales, sellos_para_recompensa, descripcion_recompensa } =
    lealtad;
  const faltan = Math.max(sellos_para_recompensa - sellos_actuales, 0);
  const progreso = Math.min(
    Math.round((sellos_actuales / sellos_para_recompensa) * 100),
    100,
  );

  const mensaje =
    faltan === 0
      ? `¡Desbloqueaste tu ${descripcion_recompensa}! 🎉`
      : faltan === 1
        ? `¡Casi desbloqueas tu ${descripcion_recompensa}!`
        : `Sigue así para tu ${descripcion_recompensa}`;

  return (
    <section
      className="relative overflow-hidden rounded-3xl p-5 text-white shadow-lg"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--brand) 78%, black) 0%, var(--brand) 55%, color-mix(in srgb, var(--brand) 55%, #f59e0b) 100%)",
      }}
    >
      {/* Halos decorativos */}
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-black/10 blur-2xl" />

      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Club Ñom VIP
          </span>
          <span className="text-xs font-medium text-white/80">
            {sellos_actuales}/{sellos_para_recompensa}
          </span>
        </div>

        <p className="text-lg font-bold leading-tight">
          {sellos_actuales} de {sellos_para_recompensa} visitas
        </p>
        <p className="mt-0.5 text-sm text-white/85">{mensaje}</p>

        {/* Barra de progreso moderna */}
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)] transition-[width] duration-700 ease-out"
            style={{ width: `${progreso}%` }}
          />
        </div>
      </div>
    </section>
  );
}
