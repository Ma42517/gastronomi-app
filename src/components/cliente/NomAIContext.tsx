"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** Escena activa dentro de la experiencia del cliente. */
export type EscenaNomAI = "categorias" | "platillo" | "carrito";

interface NomAIContextValue {
  escena: EscenaNomAI;
  setEscena: (e: EscenaNomAI) => void;
  restauranteNombre: string;
  setRestauranteNombre: (n: string) => void;
  /** Nombre del platillo que el cliente está viendo (para contexto de la IA). */
  platilloActual: string;
  setPlatilloActual: (n: string) => void;
  /** Mensaje de venta cruzada disparado al agregar un platillo. */
  crossSell: { mensaje: string; nonce: number } | null;
  dispararCrossSell: (mensaje: string) => void;
}

const NomAIContext = createContext<NomAIContextValue | null>(null);

/**
 * Provee la "escena" contextual y el nombre del restaurante a Ñom AI.
 * Vive en el layout del cliente para que el asistente NO se recargue al
 * cambiar de pantalla, solo actualice su mensaje.
 */
export function NomAIProvider({ children }: { children: ReactNode }) {
  const [escena, setEscena] = useState<EscenaNomAI>("categorias");
  const [restauranteNombre, setRestauranteNombre] = useState("");
  const [platilloActual, setPlatilloActual] = useState("");
  const [crossSell, setCrossSell] = useState<{
    mensaje: string;
    nonce: number;
  } | null>(null);

  const dispararCrossSell = (mensaje: string) =>
    setCrossSell((prev) => ({ mensaje, nonce: (prev?.nonce ?? 0) + 1 }));

  const value = useMemo(
    () => ({
      escena,
      setEscena,
      restauranteNombre,
      setRestauranteNombre,
      platilloActual,
      setPlatilloActual,
      crossSell,
      dispararCrossSell,
    }),
    [escena, restauranteNombre, platilloActual, crossSell],
  );

  return <NomAIContext.Provider value={value}>{children}</NomAIContext.Provider>;
}

/** Hook de acceso. Devuelve valores seguros si se usa fuera del provider. */
export function useNomAI(): NomAIContextValue {
  const ctx = useContext(NomAIContext);
  if (!ctx) {
    return {
      escena: "categorias",
      setEscena: () => {},
      restauranteNombre: "",
      setRestauranteNombre: () => {},
      platilloActual: "",
      setPlatilloActual: () => {},
      crossSell: null,
      dispararCrossSell: () => {},
    };
  }
  return ctx;
}
