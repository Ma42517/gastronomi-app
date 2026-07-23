"use client";

import { useState } from "react";
import { CheckCircle2, CreditCard, Minus, Plus, Users, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ModalPagoProps {
  abierto: boolean;
  total: number;
  onCerrar: () => void;
  /** Se dispara al confirmar el pago (aquí sumaríamos el sello de lealtad). */
  onPagoExitoso: () => void;
}

type Modo = "completo" | "dividir";
type Fase = "seleccion" | "procesando" | "exito";

export function ModalPago({
  abierto,
  total,
  onCerrar,
  onPagoExitoso,
}: ModalPagoProps) {
  const [modo, setModo] = useState<Modo>("completo");
  const [personas, setPersonas] = useState(2);
  const [fase, setFase] = useState<Fase>("seleccion");

  if (!abierto) return null;

  const montoAPagar = modo === "dividir" ? total / personas : total;

  const procesarPago = () => {
    setFase("procesando");
    // Simulación de la pasarela de pago (Mercado Pago / Stripe).
    setTimeout(() => {
      setFase("exito");
      // Tras confirmar, notificamos para sumar el sello de lealtad.
      setTimeout(() => {
        onPagoExitoso();
        cerrarYReset();
      }, 1600);
    }, 1400);
  };

  const cerrarYReset = () => {
    onCerrar();
    // Reset diferido para no ver el cambio durante la animación de salida.
    setTimeout(() => {
      setFase("seleccion");
      setModo("completo");
      setPersonas(2);
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={fase === "seleccion" ? cerrarYReset : undefined}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Sheet */}
      <div className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl">
        {fase === "exito" ? (
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2
              className="h-16 w-16"
              style={{ color: "var(--brand)" }}
            />
            <h3 className="mt-4 text-xl font-bold text-gray-900">
              ¡Pago exitoso!
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Sumaste 1 sello a tu tarjeta de lealtad. 🎉
            </p>
          </div>
        ) : fase === "procesando" ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div
              className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200"
              style={{ borderTopColor: "var(--brand)" }}
            />
            <p className="mt-4 text-sm font-medium text-gray-600">
              Procesando pago…
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Pagar cuenta</h3>
              <button
                type="button"
                onClick={cerrarYReset}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Selector de modo */}
            <div className="mb-5 grid grid-cols-2 gap-2">
              <ModoBoton
                activo={modo === "completo"}
                onClick={() => setModo("completo")}
                icon={<CreditCard className="h-4 w-4" />}
                label="Pagar todo"
              />
              <ModoBoton
                activo={modo === "dividir"}
                onClick={() => setModo("dividir")}
                icon={<Users className="h-4 w-4" />}
                label="Dividir cuenta"
              />
            </div>

            {/* Selector de personas (solo en modo dividir) */}
            {modo === "dividir" && (
              <div className="mb-5 flex items-center justify-between rounded-2xl bg-gray-50 p-4">
                <span className="text-sm font-medium text-gray-700">
                  ¿Entre cuántas personas?
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPersonas((p) => Math.max(2, p - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 transition active:scale-95"
                    style={{ borderColor: "var(--brand)", color: "var(--brand)" }}
                    aria-label="Menos personas"
                  >
                    <Minus className="h-4 w-4" strokeWidth={3} />
                  </button>
                  <span className="w-5 text-center font-bold text-gray-900">
                    {personas}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPersonas((p) => Math.min(12, p + 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white transition active:scale-95"
                    style={{ background: "var(--brand)" }}
                    aria-label="Más personas"
                  >
                    <Plus className="h-4 w-4" strokeWidth={3} />
                  </button>
                </div>
              </div>
            )}

            {/* Resumen de montos */}
            <div className="mb-5 space-y-1 rounded-2xl border border-gray-100 p-4">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Total de la mesa</span>
                <span>{formatCurrency(total)}</span>
              </div>
              {modo === "dividir" && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Dividido entre {personas}</span>
                  <span>{personas} pagos</span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
                <span className="font-semibold text-gray-900">
                  {modo === "dividir" ? "Tu parte" : "A pagar"}
                </span>
                <span
                  className="text-xl font-bold"
                  style={{ color: "var(--brand)" }}
                >
                  {formatCurrency(montoAPagar)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={procesarPago}
              className="w-full rounded-2xl py-3.5 font-semibold text-white shadow-sm transition active:scale-[0.99]"
              style={{ background: "var(--brand)" }}
            >
              Pagar {formatCurrency(montoAPagar)}
            </button>
            <p className="mt-3 text-center text-xs text-gray-400">
              Pago seguro procesado por Mercado Pago / Stripe
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function ModoBoton({
  activo,
  onClick,
  icon,
  label,
}: {
  activo: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-2xl border-2 py-3 text-sm font-semibold transition"
      style={
        activo
          ? {
              borderColor: "var(--brand)",
              background: "color-mix(in srgb, var(--brand) 8%, white)",
              color: "color-mix(in srgb, var(--brand) 85%, black)",
            }
          : { borderColor: "#e5e7eb", color: "#6b7280" }
      }
    >
      {icon}
      {label}
    </button>
  );
}
