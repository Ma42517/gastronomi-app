import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases de Tailwind resolviendo conflictos.
 * Uso: cn("px-2", condicion && "px-4") -> "px-4"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea un número como moneda (MXN por defecto). */
export function formatCurrency(amount: number, currency = "MXN", locale = "es-MX") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}
