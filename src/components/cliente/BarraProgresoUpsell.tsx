"use client";

import { Gift } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

/** Meta de compra para desbloquear la recompensa. */
export const META_RECOMPENSA = 150;

/** Recompensa que se desbloquea al alcanzar la meta. */
const RECOMPENSA = "Agua Fresca GRATIS";

interface BarraProgresoUpsellProps {
  /** Total actual del carrito. */
  total: number;
  /** Meta a alcanzar (default: META_RECOMPENSA). */
  meta?: number;
}

/**
 * Gatillo de upselling: barra de progreso hacia una recompensa gratis.
 * - Por debajo de la meta: colores cálidos (naranja→rojo) + cuánto falta.
 * - Al alcanzarla: barra al 100% en verde (success) + mensaje de felicitación.
 * La barra se llena con una transición suave al agregar productos.
 */
export function BarraProgresoUpsell({
  total,
  meta = META_RECOMPENSA,
}: BarraProgresoUpsellProps) {
  const logrado = total >= meta;
  const restante = Math.max(meta - total, 0);
  const progreso = Math.min((total / meta) * 100, 100);

  return (
    <div
      className={`rounded-2xl border p-3 transition-all duration-500 ${
        logrado
          ? "border-green-200 bg-green-50"
          : "border-orange-200 bg-orange-50"
      }`}
    >
      <p
        className={`mb-2 flex items-center gap-1.5 text-xs font-bold leading-snug transition-colors duration-500 ${
          logrado ? "text-green-700" : "text-orange-700"
        }`}
      >
        <Gift className="h-4 w-4 shrink-0" />
        {logrado ? (
          <span>
            ¡Felicidades! Te has ganado un{" "}
            <span className="font-extrabold">{RECOMPENSA}</span>. 🎁
          </span>
        ) : (
          <span>
            ¡Te faltan{" "}
            <span className="font-extrabold">{formatCurrency(restante)}</span>{" "}
            para llevarte un {RECOMPENSA}!
          </span>
        )}
      </p>

      {/* Riel de la barra */}
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-white/80 ring-1 ring-black/5"
        role="progressbar"
        aria-valuenow={Math.round(progreso)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progreso hacia ${RECOMPENSA}`}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progreso}%`,
            background: logrado
              ? "linear-gradient(90deg, #16a34a, #4ade80)"
              : "linear-gradient(90deg, #f97316, #ef4444)",
          }}
        />
      </div>
    </div>
  );
}
