"use client";

import type { ReactNode } from "react";
import { NomAIProvider } from "@/components/cliente/NomAIContext";
import { NomAIAssistant } from "@/components/cliente/NomAIAssistant";

/**
 * Layout del grupo (cliente).
 * Monta Ñom AI UNA sola vez, de forma persistente: al navegar entre pantallas
 * el asistente no se recarga, solo cambia su mensaje contextual.
 */
export default function ClienteLayout({ children }: { children: ReactNode }) {
  return (
    <NomAIProvider>
      {/* La hidratación NO va aquí: este layout no conoce el slug de la URL.
          La monta VistaClienteMesa, que sí lo recibe, para poder cargar el
          restaurante correcto y no siempre el configurado por defecto. */}
      {children}
      <NomAIAssistant />
    </NomAIProvider>
  );
}
