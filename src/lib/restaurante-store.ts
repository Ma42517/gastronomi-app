"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TAQUERIA_EL_PRIMO } from "@/lib/mock-data";
import type {
  GrupoModificador,
  MenuItemMock,
  ProgramaLealtad,
} from "@/lib/mock-data";

/**
 * STORE DEL RESTAURANTE — fuente única de verdad del MENÚ y de la LEALTAD.
 *
 * Es el puente entre el Panel Administrador y la Vista Cliente: el panel
 * escribe aquí y el cliente lee de aquí, así que un cambio de precio o de foto
 * se ve al instante al volver al menú.
 *
 * SOBRE LA HIDRATACIÓN (importante):
 * El estado inicial se siembra con el mock, igual que antes del panel, y
 * `persist` se configura con `skipHydration: true`. Sin eso, en el primer
 * render el cliente leería localStorage y el servidor el mock: dos árboles
 * distintos y un error de hidratación de React. Con skipHydration el primer
 * render coincide con el del servidor y los datos guardados entran justo
 * después, desde <HidratarRestaurante />.
 *
 * PERSISTENCIA: localStorage. Cuando exista Supabase, estas mismas acciones
 * pasan a ser llamadas a la base de datos sin tocar los componentes.
 */

/** Datos editables del programa de recompensas. */
export type LealtadEditable = ProgramaLealtad & {
  /** Foto del premio (opcional; el mock original no la tenía). */
  imagen_premio?: string;
};

interface RestauranteState {
  menu: MenuItemMock[];
  lealtad: LealtadEditable;

  /** Crea o actualiza un platillo (upsert por id). */
  guardarPlatillo: (platillo: MenuItemMock) => void;
  /** Elimina un platillo del menú. */
  eliminarPlatillo: (id: string) => void;
  /** Cambia disponible/agotado sin abrir el formulario. */
  alternarDisponibilidad: (id: string) => void;
  /** Guarda la configuración del premio. */
  guardarLealtad: (lealtad: LealtadEditable) => void;
  /** Devuelve el menú a los datos originales del mock. */
  restablecer: () => void;
}

/** Estado de arranque: exactamente los datos del mock. */
const ESTADO_INICIAL = {
  menu: TAQUERIA_EL_PRIMO.menu,
  lealtad: TAQUERIA_EL_PRIMO.lealtad as LealtadEditable,
};

export const useRestauranteStore = create<RestauranteState>()(
  persist(
    (set) => ({
      ...ESTADO_INICIAL,

      guardarPlatillo: (platillo) =>
        set((state) => {
          const existe = state.menu.some((m) => m.id === platillo.id);
          return {
            menu: existe
              ? state.menu.map((m) => (m.id === platillo.id ? platillo : m))
              : [...state.menu, platillo],
          };
        }),

      eliminarPlatillo: (id) =>
        set((state) => ({ menu: state.menu.filter((m) => m.id !== id) })),

      alternarDisponibilidad: (id) =>
        set((state) => ({
          menu: state.menu.map((m) =>
            m.id === id ? { ...m, disponible: !m.disponible } : m,
          ),
        })),

      guardarLealtad: (lealtad) => set({ lealtad }),

      restablecer: () => set({ ...ESTADO_INICIAL }),
    }),
    {
      name: "nom-restaurante",
      // Solo se persisten los datos, nunca las funciones.
      partialize: (state) => ({ menu: state.menu, lealtad: state.lealtad }),
      skipHydration: true,
    },
  ),
);

// ---------------------------------------------------------------------------
// Utilidades de dominio
// ---------------------------------------------------------------------------

/** Genera un id legible y único para un platillo nuevo. */
export function nuevoIdPlatillo(nombre: string): string {
  const base =
    nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 28) || "platillo";
  // El sufijo evita colisiones si se repite el nombre.
  return `${base}-${Date.now().toString(36).slice(-4)}`;
}

/** Platillo en blanco para el formulario de creación. */
export function platilloVacio(categoria: string): MenuItemMock {
  return {
    id: "",
    nombre: "",
    descripcion: "",
    precio: 0,
    categoria,
    emoji: "🍽️",
    disponible: true,
  };
}

/**
 * Redimensiona y comprime la foto antes de convertirla a data URL.
 *
 * Sin esto, una foto de celular de 4 MB en base64 (~5.3 MB) revienta la cuota
 * de localStorage (≈5 MB) y el guardado falla en silencio. Se limita el lado
 * mayor a 800 px y se recodifica en JPEG al 82 %.
 */
export function archivoAImagen(file: File, ladoMaximo = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error("No se pudo leer el archivo."));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("El archivo no es una imagen."));
      img.onload = () => {
        const escala = Math.min(1, ladoMaximo / Math.max(img.width, img.height));
        const ancho = Math.round(img.width * escala);
        const alto = Math.round(img.height * escala);

        const canvas = document.createElement("canvas");
        canvas.width = ancho;
        canvas.height = alto;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          // Sin canvas disponible se usa el data URL original.
          resolve(String(lector.result));
          return;
        }
        ctx.drawImage(img, 0, 0, ancho, alto);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(lector.result);
    };
    lector.readAsDataURL(file);
  });
}

/** Grupo de modificadores en blanco, para el editor del formulario. */
export function grupoVacio(indice: number): GrupoModificador {
  return {
    id: `grupo-${indice + 1}-${Date.now().toString(36).slice(-3)}`,
    titulo: "",
    tipo: "single",
    requerido: false,
    opciones: [],
  };
}
