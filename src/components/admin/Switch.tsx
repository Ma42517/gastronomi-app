"use client";

interface SwitchProps {
  activo: boolean;
  onCambiar: (valor: boolean) => void;
  /** Texto opcional a la derecha del control. */
  etiqueta?: string;
}

/**
 * Toggle accesible del panel. Es un `<button role="switch">` con
 * `aria-checked`, así los lectores de pantalla anuncian el estado real en
 * lugar de "botón" a secas.
 */
export function Switch({ activo, onCambiar, etiqueta }: SwitchProps) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={activo}
        onClick={() => onCambiar(!activo)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          activo ? "bg-emerald-500" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            activo ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
      {etiqueta && (
        <span className="text-xs font-semibold text-white/70">{etiqueta}</span>
      )}
    </label>
  );
}
