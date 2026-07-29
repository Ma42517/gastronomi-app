"use client";

import { useState } from "react";
import { Check, Heart, Loader2, Star } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

/**
 * CALIFICACIÓN DEL MESERO + PROPINA — pantalla de cierre del pedido.
 *
 * Aparece después del pago, cuando el comensal ya vivió el servicio completo:
 * preguntarlo antes (en el carrito) es pedir una opinión sobre algo que todavía
 * no ha pasado.
 *
 * Estructura pensada para que responder cueste un solo toque:
 *   1. Estrellas  — obligatorio, es lo único que se pide de verdad.
 *   2. Etiquetas  — opcionales, y CAMBIAN según la nota: con 1-2 estrellas no
 *      tiene sentido ofrecer "Amable", y con 5 no se ofrece "Lento".
 *   3. Comentario — opcional, solo se despliega si hay algo que matizar.
 *   4. Propina    — si no dejó nada al pagar, este es el segundo (y último)
 *      momento natural para pedirla.
 */

interface CalificacionMeseroProps {
  /** Monto que ya se pagó (base para calcular los porcentajes de propina). */
  total: number;
  /** Propina que YA dejó en el checkout. Si es > 0 no se vuelve a pedir. */
  propinaPrevia: number;
  /** Slug del restaurante, para guardar la valoración donde corresponde. */
  slug?: string;
  mesa?: string;
  /** Se llama al enviar o al omitir: en ambos casos el flujo debe continuar. */
  onListo: () => void;
}

/** Etiquetas para experiencias buenas (4-5 estrellas). */
const ETIQUETAS_BUENAS = [
  { id: "amable", texto: "Amable 😊" },
  { id: "rapido", texto: "Rápido ⚡" },
  { id: "atento", texto: "Atento 👀" },
  { id: "recomendo-bien", texto: "Recomendó bien 👌" },
  { id: "buen-ambiente", texto: "Buen ambiente ✨" },
];

/** Etiquetas para experiencias flojas (1-3 estrellas). */
const ETIQUETAS_MALAS = [
  { id: "lento", texto: "Lento 🐌" },
  { id: "distraido", texto: "Distraído 😕" },
  { id: "amable", texto: "Amable, pero…" },
];

/** Porcentajes sugeridos de propina. */
const PORCENTAJES = [10, 15, 20];

export function CalificacionMesero({
  total,
  propinaPrevia,
  slug,
  mesa,
  onListo,
}: CalificacionMeseroProps) {
  const [estrellas, setEstrellas] = useState(0);
  const [hover, setHover] = useState(0);
  const [etiquetas, setEtiquetas] = useState<string[]>([]);
  const [comentario, setComentario] = useState("");
  const [propina, setPropina] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const yaDioPropina = propinaPrevia > 0;
  const catalogo = estrellas >= 4 ? ETIQUETAS_BUENAS : ETIQUETAS_MALAS;

  const alternarEtiqueta = (id: string) =>
    setEtiquetas((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    );

  const enviar = async () => {
    setEnviando(true);
    try {
      await fetch("/api/calificacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          mesa,
          estrellas,
          etiquetas,
          comentario,
          propina: propinaPrevia + propina,
          total,
        }),
      });
    } catch {
      // La opinión del comensal no debe quedar bloqueada por un fallo de red:
      // se le agradece igual y el pedido continúa. Perder una valoración es
      // mucho menos grave que dejarlo atrapado en esta pantalla.
    } finally {
      setEnviado(true);
      // Un momento para que lea el agradecimiento antes de volver al menú.
      window.setTimeout(onListo, 1800);
    }
  };

  // --- Agradecimiento ---
  if (enviado) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <span
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg"
          style={{
            background:
              "linear-gradient(135deg, #16a34a, color-mix(in srgb, #16a34a 55%, #4ade80))",
          }}
        >
          <Heart className="h-8 w-8" strokeWidth={2.5} />
        </span>
        <h3 className="text-lg font-extrabold text-gray-900">¡Gracias!</h3>
        <p className="mt-1 max-w-[18rem] text-sm leading-relaxed text-gray-500">
          {estrellas >= 4
            ? "Tu opinión ayuda a que el equipo siga así."
            : "Lo compartiremos con el restaurante para que mejore."}
        </p>
        {propina > 0 && (
          <p className="mt-3 text-xs font-semibold text-gray-400">
            Propina adicional: {formatCurrency(propina)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="py-1">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-extrabold text-gray-900">
          ¿Cómo te atendieron?
        </h3>
        <p className="mt-0.5 text-sm text-gray-500">
          Tu opinión llega directo al restaurante.
        </p>
      </div>

      {/* ===== 1) ESTRELLAS ===== */}
      <div
        className="mb-4 flex justify-center gap-1.5"
        role="radiogroup"
        aria-label="Calificación del servicio"
      >
        {[1, 2, 3, 4, 5].map((n) => {
          // El hover pinta hasta donde está el dedo/cursor, para que se entienda
          // que la calificación es acumulativa y no una estrella suelta.
          const marcada = n <= (hover || estrellas);
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={estrellas === n}
              aria-label={`${n} estrella${n === 1 ? "" : "s"}`}
              onClick={() => {
                setEstrellas(n);
                // Al cambiar de tramo bueno/malo el catálogo cambia, así que se
                // limpian las etiquetas para no dejar una incoherente marcada.
                setEtiquetas([]);
              }}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="transition-transform active:scale-90"
            >
              <Star
                className={`h-9 w-9 transition-all duration-150 ${
                  marcada ? "scale-110" : "scale-100"
                }`}
                style={{
                  fill: marcada ? "#f59e0b" : "transparent",
                  color: marcada ? "#f59e0b" : "#d1d5db",
                }}
                strokeWidth={1.5}
              />
            </button>
          );
        })}
      </div>

      {/* El resto solo aparece tras elegir nota: pedir todo de golpe abruma. */}
      {estrellas > 0 && (
        <div className="animate-fade-in space-y-4">
          {/* ===== 2) ETIQUETAS ===== */}
          <div className="flex flex-wrap justify-center gap-2">
            {catalogo.map((e) => {
              const activa = etiquetas.includes(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => alternarEtiqueta(e.id)}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95"
                  style={
                    activa
                      ? {
                          borderColor: "var(--brand)",
                          background:
                            "color-mix(in srgb, var(--brand) 12%, white)",
                          color: "color-mix(in srgb, var(--brand) 85%, black)",
                        }
                      : {
                          borderColor: "#e5e7eb",
                          color: "#6b7280",
                        }
                  }
                >
                  {e.texto}
                </button>
              );
            })}
          </div>

          {/* ===== 3) COMENTARIO ===== */}
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder={
              estrellas >= 4
                ? "¿Algo que quieras destacar? (opcional)"
                : "¿Qué salió mal? (opcional)"
            }
            className="w-full resize-none rounded-2xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400"
          />

          {/* ===== 4) PROPINA ===== */}
          {yaDioPropina ? (
            <p className="flex items-center justify-center gap-1.5 rounded-2xl bg-green-50 px-3 py-2.5 text-xs font-semibold text-green-700">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
              Ya dejaste {formatCurrency(propinaPrevia)} de propina. ¡Gracias!
            </p>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3">
              <p className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-gray-500">
                ¿Dejas propina al mesero?
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {PORCENTAJES.map((pct) => {
                  const monto = Math.round(total * (pct / 100) * 100) / 100;
                  const activo = propina === monto && monto > 0;
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setPropina(activo ? 0 : monto)}
                      className="rounded-xl border py-2 text-center transition active:scale-95"
                      style={
                        activo
                          ? {
                              borderColor: "var(--brand)",
                              background:
                                "color-mix(in srgb, var(--brand) 12%, white)",
                            }
                          : { borderColor: "#e5e7eb", background: "#fff" }
                      }
                    >
                      <span className="block text-sm font-bold text-gray-900">
                        {pct}%
                      </span>
                      <span className="block text-[10px] text-gray-500">
                        {formatCurrency(monto)}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setPropina(0)}
                  className="rounded-xl border py-2 text-center text-xs font-semibold text-gray-500 transition active:scale-95"
                  style={{
                    borderColor: propina === 0 ? "#9ca3af" : "#e5e7eb",
                    background: "#fff",
                  }}
                >
                  No
                </button>
              </div>
              {propina > 0 && (
                <p className="mt-2 text-center text-[11px] leading-relaxed text-gray-500">
                  Se cobrará por separado al confirmar.
                </p>
              )}
            </div>
          )}

          {/* ===== ENVIAR ===== */}
          <button
            type="button"
            onClick={() => void enviar()}
            disabled={enviando}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60"
            style={{ background: "var(--brand)" }}
          >
            {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
            {propina > 0
              ? `Enviar y dar ${formatCurrency(propina)}`
              : "Enviar calificación"}
          </button>
        </div>
      )}

      {/* Omitir siempre disponible: obligar a calificar produce cinco estrellas
          sin valor y deja al comensal atrapado en una pantalla. */}
      <button
        type="button"
        onClick={onListo}
        className="mt-3 w-full text-center text-xs font-semibold text-gray-400 transition hover:text-gray-600"
      >
        Ahora no, gracias
      </button>
    </div>
  );
}
