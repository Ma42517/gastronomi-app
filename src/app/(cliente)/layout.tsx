"use client";

import type { ReactNode } from "react";
import { NomAIProvider } from "@/components/cliente/NomAIContext";
import { NomAIAssistant } from "@/components/cliente/NomAIAssistant";
import { HidratarRestaurante } from "@/components/HidratarRestaurante";

/**
 * Layout del grupo (cliente).
 * Monta Ñom AI UNA sola vez, de forma persistente: al navegar entre pantallas
 * el asistente no se recarga, solo cambia su mensaje contextual.
 */
export default function ClienteLayout({ children }: { children: ReactNode }) {
  return (
    <NomAIProvider>
      {/* Trae los cambios guardados por el Panel Administrador. */}
      <HidratarRestaurante />
      {children}
      <NomAIAssistant />
    </NomAIProvider>
  );
}
