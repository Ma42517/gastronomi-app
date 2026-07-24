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

/** Recomendación complementaria mostrada en la barra (con acción de 1 tap). */
export interface RecomendacionBar {
  id: string;
  nombre: string;
  precio: number;
  emoji?: string;
}

/**
 * Acción principal de "Agregar al carrito" expuesta en la barra global. La
 * ficha del platillo la publica cuando el cliente ya eligió todo lo obligatorio,
 * de modo que el botón esté siempre accesible (nunca tapado por otros elementos).
 */
export interface AccionBar {
  etiqueta: string;
  onAgregar: () => void;
}



interface NomAIContextValue {
  escena: EscenaNomAI;
  setEscena: (e: EscenaNomAI) => void;
  restauranteNombre: string;
  setRestauranteNombre: (n: string) => void;
  platilloActual: string;
  setPlatilloActual: (n: string) => void;
  categoriaActual: string;
  setCategoriaActual: (c: string) => void;
  /** Mensaje contextual de la barra (null = mensaje de bienvenida por default). */
  barMensaje: string | null;
  setBarMensaje: (m: string | null) => void;
  /** Recomendación con botón de acción directa en la barra (State D). */
  barRecomendacion: RecomendacionBar | null;
  setBarRecomendacion: (r: RecomendacionBar | null) => void;
  /** Acción "Agregar al carrito" en la barra (se muestra al completar la elección). */
  barAccion: AccionBar | null;
  setBarAccion: (a: AccionBar | null) => void;
  /** Drawer del carrito (bottom sheet), independiente del chat. */
  carritoAbierto: boolean;
  abrirCarrito: () => void;
  cerrarCarrito: () => void;
  /** Control del chat (compartido: la barra global lo abre/cierra). */
  chatAbierto: boolean;
  abrirChat: () => void;
  cerrarChat: () => void;
}

const NomAIContext = createContext<NomAIContextValue | null>(null);

/**
 * Estado global de Ñom AI. Vive en el layout del cliente para que la barra
 * sea única y persistente en TODAS las pantallas (home, menú, detalle, carrito).
 */
export function NomAIProvider({ children }: { children: ReactNode }) {
  const [escena, setEscena] = useState<EscenaNomAI>("categorias");
  const [restauranteNombre, setRestauranteNombre] = useState("");
  const [platilloActual, setPlatilloActual] = useState("");
  const [categoriaActual, setCategoriaActual] = useState("");
  const [chatAbierto, setChatAbierto] = useState(false);
  const [barMensaje, setBarMensaje] = useState<string | null>(null);
  const [barRecomendacion, setBarRecomendacion] =
    useState<RecomendacionBar | null>(null);
  const [barAccion, setBarAccion] = useState<AccionBar | null>(null);
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  const abrirChat = () => setChatAbierto(true);
  const cerrarChat = () => setChatAbierto(false);
  const abrirCarrito = () => setCarritoAbierto(true);
  const cerrarCarrito = () => setCarritoAbierto(false);

  const value = useMemo(
    () => ({
      escena,
      setEscena,
      restauranteNombre,
      setRestauranteNombre,
      platilloActual,
      setPlatilloActual,
      categoriaActual,
      setCategoriaActual,
      barMensaje,
      setBarMensaje,
      barRecomendacion,
      setBarRecomendacion,
      barAccion,
      setBarAccion,
      carritoAbierto,
      abrirCarrito,
      cerrarCarrito,
      chatAbierto,
      abrirChat,
      cerrarChat,
    }),
    [
      escena,
      restauranteNombre,
      platilloActual,
      categoriaActual,
      barMensaje,
      barRecomendacion,
      barAccion,
      carritoAbierto,
      chatAbierto,
    ],
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
      categoriaActual: "",
      setCategoriaActual: () => {},
      barMensaje: null,
      setBarMensaje: () => {},
      barRecomendacion: null,
      setBarRecomendacion: () => {},
      barAccion: null,
      setBarAccion: () => {},
      carritoAbierto: false,
      abrirCarrito: () => {},
      cerrarCarrito: () => {},
      chatAbierto: false,
      abrirChat: () => {},
      cerrarChat: () => {},
    };
  }
  return ctx;
}
