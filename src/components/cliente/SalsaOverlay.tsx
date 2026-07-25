"use client";

/** Paleta real de cada salsa (base y su reflejo de luz). */
const SALSAS: Record<string, { base: string; borde: string }> = {
  roja: { base: "#b91c1c", borde: "#7f1d1d" },
  verde: { base: "#4d7c0f", borde: "#365314" },
  habanero: { base: "#c2410c", borde: "#7c2d12" },
};

interface SalsaOverlayProps {
  /** ID de la salsa elegida (roja | verde | habanero). */
  salsaId: string | null;
  /**
   * Cambia en cada clic real del cliente para reiniciar el trazo.
   * (Se usa como `key` para volver a dibujar la animación.)
   */
  trigger: number;
}

/**
 * Chorro de salsa que "cae" sobre la FOTOGRAFÍA REAL del platillo.
 *
 * Es estrictamente un overlay transparente (`pointer-events-none`): la foto de
 * abajo nunca se altera ni se reemplaza. Para que no parezca un dibujo plano,
 * el trazo usa técnica de "líquido 3D": dos paths empalmados (cuerpo grueso con
 * sombra proyectada + reflejo delgado semitransparente encima) y ligera
 * transparencia para que se asome la textura de la comida real.
 */
export function SalsaOverlay({ salsaId, trigger }: SalsaOverlayProps) {
  if (!salsaId || !SALSAS[salsaId]) return null;
  const { base, borde } = SALSAS[salsaId];

  // Zigzag orgánico (como se sirve la salsa a mano sobre el platillo).
  const trazo =
    "M14,74 C26,58 40,86 54,68 C68,50 82,80 96,62 C110,44 124,74 138,56 C152,38 166,68 180,50";

  return (
    <div
      key={trigger}
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 200 120"
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        {/* 1) CUERPO DE LA SALSA — grueso, con sombra para dar profundidad
               (parece descansar sobre la comida, no dibujada encima). */}
        <path
          d={trazo}
          fill="none"
          stroke={borde}
          strokeWidth={11}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="salsa-trazo"
          style={{
            opacity: 0.55,
            filter: "drop-shadow(0px 4px 3px rgba(0,0,0,0.55))",
          }}
        />
        <path
          d={trazo}
          fill="none"
          stroke={base}
          strokeWidth={9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="salsa-trazo"
          style={{
            opacity: 0.9, // deja asomar la textura real del platillo
            filter: "drop-shadow(0px 3px 2px rgba(0,0,0,0.35))",
          }}
        />

        {/* 2) REFLEJO ESPECULAR — trazo delgado y blanco translúcido,
               ligeramente desplazado para simular el brillo del líquido. */}
        <path
          d={trazo}
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="salsa-trazo"
          style={{ transform: "translateY(-1.6px)" }}
        />

        {/* 3) Punto de brillo intenso donde termina el chorro (gota) */}
        <circle
          cx={180}
          cy={50}
          r={3.2}
          fill={base}
          className="salsa-gota"
          style={{ filter: "drop-shadow(0px 2px 2px rgba(0,0,0,0.5))" }}
        />
        <circle
          cx={179}
          cy={48.6}
          r={1.1}
          fill="rgba(255,255,255,0.65)"
          className="salsa-gota"
        />
      </svg>
    </div>
  );
}
