"use client";

import { useState } from "react";
import { Gift, PartyPopper, Phone, Sparkles, User, X } from "lucide-react";

interface ModalRegistroPremioProps {
  abierto: boolean;
  /** Premio desbloqueado (ej. "Orden de Pastor gratis"). */
  premio: string;
  /**
   * "premio" = clímax de la 5ª visita (celebración).
   * "proactivo" = registro voluntario desde el header (mensaje invitador).
   */
  modo?: "premio" | "proactivo";
  /** Permite cerrar el modal (solo en modo proactivo). */
  onCerrar?: () => void;
  /** Se dispara al registrar correctamente: devuelve nombre y WhatsApp. */
  onRegistrar: (datos: { nombre: string; whatsapp: string }) => void;
}

/**
 * Modal de celebración + captura de datos (Lead Gen) al completar las visitas.
 * Es el clímax del programa de lealtad: intercepta el premio para registrar al
 * cliente. Nombre y WhatsApp son OBLIGATORIOS (con validación en línea).
 * No tiene botón de cerrar: el premio se reclama registrándose.
 */
export function ModalRegistroPremio({
  abierto,
  premio,
  modo = "premio",
  onCerrar,
  onRegistrar,
}: ModalRegistroPremioProps) {
  const esProactivo = modo === "proactivo";
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [errores, setErrores] = useState<{ nombre?: string; whatsapp?: string }>(
    {},
  );

  if (!abierto) return null;

  const validar = () => {
    const e: { nombre?: string; whatsapp?: string } = {};
    if (nombre.trim().length < 2) e.nombre = "Escribe tu nombre.";
    // Al menos 10 dígitos (formato mexicano), ignorando espacios y guiones.
    const digitos = whatsapp.replace(/\D/g, "");
    if (digitos.length < 10) e.whatsapp = "Escribe tus 10 dígitos de WhatsApp.";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validar()) return;
    onRegistrar({ nombre: nombre.trim(), whatsapp: whatsapp.trim() });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      {esProactivo && onCerrar ? (
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onCerrar}
          className="animate-backdrop-in absolute inset-0 bg-black/70 backdrop-blur-sm"
        />
      ) : (
        <div className="animate-backdrop-in absolute inset-0 bg-black/70 backdrop-blur-sm" />
      )}

      <form
        onSubmit={handleSubmit}
        className="animate-sheet-up relative m-0 w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:m-4 sm:rounded-3xl"
      >
        {/* Header de celebración */}
        <div
          className="relative overflow-hidden px-5 py-6 text-center text-white"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--brand) 82%, black) 0%, var(--brand) 50%, #f59e0b 100%)",
          }}
        >
          <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
          <div className="relative">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              {esProactivo ? (
                <Sparkles className="h-7 w-7" />
              ) : (
                <PartyPopper className="h-7 w-7" />
              )}
            </span>
            <h2 className="text-xl font-extrabold leading-tight">
              {esProactivo
                ? "Únete a Beneficios Ñom ✨"
                : "¡Felicidades! Completaste tus 5 visitas 🌮🎉"}
            </h2>
          </div>

          {/* Cerrar (solo en registro voluntario) */}
          {esProactivo && onCerrar && (
            <button
              type="button"
              onClick={onCerrar}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white/90 backdrop-blur-sm transition hover:bg-black/35"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          <p className="text-sm leading-relaxed text-gray-600">
            {esProactivo ? (
              <>
                Crea tu cuenta para guardar tus favoritos y acumular puntos VIP
                en cada compra.
              </>
            ) : (
              <>
                Regístrate rápido para guardar tu premio (
                <span className="font-bold text-gray-900">{premio}</span>) en tu
                cuenta y usarlo ahora o en tu próxima visita.
              </>
            )}
          </p>

          {/* Nombre */}
          <div>
            <label
              htmlFor="reg-nombre"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500"
            >
              Nombre
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="reg-nombre"
                type="text"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  if (errores.nombre) setErrores((p) => ({ ...p, nombre: undefined }));
                }}
                placeholder="Tu nombre"
                autoComplete="name"
                className={`w-full rounded-2xl border bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:bg-white ${
                  errores.nombre
                    ? "border-red-400 focus:border-red-500"
                    : "border-gray-200 focus:border-gray-400"
                }`}
              />
            </div>
            {errores.nombre && (
              <p className="mt-1 text-xs font-medium text-red-500">
                {errores.nombre}
              </p>
            )}
          </div>

          {/* WhatsApp */}
          <div>
            <label
              htmlFor="reg-whatsapp"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500"
            >
              Número de WhatsApp
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="reg-whatsapp"
                type="tel"
                inputMode="tel"
                value={whatsapp}
                onChange={(e) => {
                  setWhatsapp(e.target.value);
                  if (errores.whatsapp)
                    setErrores((p) => ({ ...p, whatsapp: undefined }));
                }}
                placeholder="10 dígitos"
                autoComplete="tel"
                className={`w-full rounded-2xl border bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:bg-white ${
                  errores.whatsapp
                    ? "border-red-400 focus:border-red-500"
                    : "border-gray-200 focus:border-gray-400"
                }`}
              />
            </div>
            {errores.whatsapp && (
              <p className="mt-1 text-xs font-medium text-red-500">
                {errores.whatsapp}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-3xl px-6 py-4 text-base font-bold text-white shadow-lg transition active:scale-[0.98]"
            style={{ background: "var(--brand)" }}
          >
            {esProactivo ? (
              <>
                <Sparkles className="h-5 w-5" />
                Crear mi cuenta
              </>
            ) : (
              <>
                <Gift className="h-5 w-5" />
                Reclamar mi premio
              </>
            )}
          </button>

          <p className="text-center text-[11px] leading-relaxed text-gray-400">
            Usaremos tus datos solo para guardar tu recompensa y avisarte de tus
            beneficios.
          </p>
        </div>
      </form>
    </div>
  );
}
