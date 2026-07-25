import { Check, Gift, Sparkles } from "lucide-react";
import type { ProgramaLealtad } from "@/lib/mock-data";

interface TarjetaSellosProps {
  lealtad: ProgramaLealtad;
  /** Canjea el premio: lo agrega al carrito con precio $0.00. */
  onCanjear?: () => void;
  /** Si el premio ya fue añadido a la orden actual. */
  premioCanjeado?: boolean;
}

/**
 * Tarjeta de beneficios PREMIUM ("✨ Beneficios Ñom").
 * Gradiente rojo→naranja (derivado de --brand, white-label) + barra de progreso
 * que indica claramente en qué visita va el usuario y genera anticipación.
 */
export function TarjetaSellos({
  lealtad,
  onCanjear,
  premioCanjeado = false,
}: TarjetaSellosProps) {
  const { sellos_actuales, sellos_para_recompensa, descripcion_recompensa } =
    lealtad;
  const faltan = Math.max(sellos_para_recompensa - sellos_actuales, 0);
  const recompensaLista = sellos_actuales >= sellos_para_recompensa;
  const progreso = Math.min(
    Math.round((sellos_actuales / sellos_para_recompensa) * 100),
    100,
  );

  // Copy orientado al valor y a la anticipación.
  const mensaje =
    faltan === 0
      ? `¡Desbloqueaste tu ${descripcion_recompensa}! 🎉`
      : faltan === 1
        ? "¡Estás a una compra de desbloquear tu recompensa especial!"
        : `Te faltan ${faltan} visitas para tu ${descripcion_recompensa}.`;

  return (
    <section
      className="relative overflow-hidden rounded-3xl p-5 text-white shadow-lg"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--brand) 82%, black) 0%, var(--brand) 50%, #f59e0b 100%)",
      }}
    >
      {/* Halos decorativos */}
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-black/10 blur-2xl" />

      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Beneficios Ñom
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-black/20 px-2 py-1 text-[11px] font-bold backdrop-blur-sm">
            <Gift className="h-3.5 w-3.5" />
            {sellos_actuales}/{sellos_para_recompensa}
          </span>
        </div>

        <p className="text-lg font-extrabold leading-tight">
          Visita {Math.min(sellos_actuales, sellos_para_recompensa)} de{" "}
          {sellos_para_recompensa}
        </p>
        <p className="mt-0.5 text-sm font-medium text-white/90">{mensaje}</p>

        {/* Barra de progreso + marcadores de cada visita */}
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-black/20">
          <div
            className="h-full rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)] transition-[width] duration-700 ease-out"
            style={{ width: `${progreso}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between">
          {Array.from({ length: sellos_para_recompensa }).map((_, i) => {
            const logrado = i < sellos_actuales;
            return (
              <span
                key={i}
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-500 ${
                  logrado
                    ? "bg-white text-neutral-900 shadow-md"
                    : "bg-white/20 text-white/70 ring-1 ring-white/30"
                }`}
              >
                {logrado ? "✓" : i + 1}
              </span>
            );
          })}
        </div>

        {/* CANJE: solo al completar el ciclo (5/5) */}
        {recompensaLista && onCanjear && (
          <button
            type="button"
            onClick={onCanjear}
            disabled={premioCanjeado}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3.5 text-sm font-extrabold shadow-lg transition active:scale-[0.98] disabled:cursor-default disabled:opacity-90"
            style={{ color: premioCanjeado ? "#16a34a" : "var(--brand)" }}
          >
            {premioCanjeado ? (
              <>
                <Check className="h-4 w-4" strokeWidth={3} />
                Añadido a tu orden
              </>
            ) : (
              <>
                <Gift className="h-4 w-4" strokeWidth={2.5} />
                Añadir gratis a mi orden
              </>
            )}
          </button>
        )}
      </div>
    </section>
  );
}
