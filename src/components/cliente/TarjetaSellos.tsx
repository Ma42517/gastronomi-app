import { Check, Gift } from "lucide-react";
import type { ProgramaLealtad } from "@/lib/mock-data";

/**
 * Tarjeta de lealtad ("tarjeta perforada digital").
 * El color se hereda de la CSS var --brand definida por el contenedor padre.
 */
export function TarjetaSellos({ lealtad }: { lealtad: ProgramaLealtad }) {
  const { sellos_actuales, sellos_para_recompensa, descripcion_recompensa } =
    lealtad;
  const faltan = Math.max(sellos_para_recompensa - sellos_actuales, 0);

  return (
    <section
      className="rounded-2xl p-4 text-white shadow-sm"
      style={{
        background:
          "linear-gradient(135deg, var(--brand) 0%, color-mix(in srgb, var(--brand) 75%, black) 100%)",
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        <Gift className="h-5 w-5" />
        <p className="text-sm font-semibold">
          {faltan > 0
            ? `${sellos_actuales}/${sellos_para_recompensa} sellos para tu ${descripcion_recompensa}`
            : `¡Tienes tu ${descripcion_recompensa} lista!`}
        </p>
      </div>

      <div className="flex items-center justify-between gap-1.5">
        {Array.from({ length: sellos_para_recompensa }).map((_, i) => {
          const conseguido = i < sellos_actuales;
          return (
            <div
              key={i}
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/60 transition"
              style={{
                background: conseguido ? "white" : "rgba(255,255,255,0.12)",
              }}
              aria-label={conseguido ? "sello obtenido" : "sello pendiente"}
            >
              {conseguido ? (
                <Check
                  className="h-4 w-4"
                  style={{ color: "var(--brand)" }}
                  strokeWidth={3}
                />
              ) : (
                <span className="text-xs font-bold text-white/70">
                  {i + 1}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
