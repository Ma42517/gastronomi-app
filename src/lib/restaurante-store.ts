"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { leerRestauranteRemoto } from "@/lib/supabase/leer-menu";
import { TAQUERIA_EL_PRIMO } from "@/lib/mock-data";
import type {
  GrupoModificador,
  MenuItemMock,
  ProgramaLealtad,
  TemaRestaurante,
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

/** Estado de la conexión con la base de datos, para avisar en la interfaz. */
export type EstadoNube =
  | "local" // Sin Supabase configurado: todo vive en el navegador.
  | "cargando"
  | "sincronizado"
  | "sin-sembrar" // Conectado, pero la base todavía no tiene el menú.
  | "error";

interface RestauranteState {
  menu: MenuItemMock[];
  lealtad: LealtadEditable;
  /**
   * Tema del restaurante que se está sirviendo (nombre, color, portada).
   * `null` mientras no llega de la base: la vista usa entonces el del mock.
   */
  tema: TemaRestaurante | null;
  /** Slug servido actualmente. Evita mezclar el menú de dos restaurantes. */
  slugActual: string | null;

  // --- Estado de la sincronización con Supabase ---
  estadoNube: EstadoNube;
  /** Último error de escritura, para mostrarlo en el panel. */
  errorNube: string | null;

  /** Trae un restaurante desde Supabase y reemplaza el estado local. */
  cargarDesdeNube: (slug?: string) => Promise<void>;
  /** Sube el menú completo a Supabase (arranque en frío). */
  publicarEnNube: () => Promise<boolean>;

  /** Crea o actualiza un platillo (upsert por id). */
  guardarPlatillo: (platillo: MenuItemMock) => Promise<void>;
  /** Elimina un platillo del menú. */
  eliminarPlatillo: (id: string) => Promise<void>;
  /** Cambia disponible/agotado sin abrir el formulario. */
  alternarDisponibilidad: (id: string) => Promise<void>;
  /** Guarda la configuración del premio. */
  guardarLealtad: (lealtad: LealtadEditable) => Promise<void>;
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
    (set, get) => ({
      ...ESTADO_INICIAL,
      tema: null,
      slugActual: null,
      estadoNube: supabaseConfigurado() ? "cargando" : "local",
      errorNube: null,

      // --- LECTURA ---------------------------------------------------------
      cargarDesdeNube: async (slug) => {
        if (!supabaseConfigurado()) {
          set({ estadoNube: "local" });
          return;
        }

        // CAMBIO DE RESTAURANTE: la caché de localStorage pertenece a OTRO
        // negocio, así que se descarta antes de pedir el nuevo menú.
        //
        // No es cosmético. Sin esto, el panel pintaría los platillos del
        // restaurante anterior durante el viaje de red, y quien pulsara "Editar"
        // en ese instante guardaría un platillo ajeno DENTRO del restaurante
        // recién seleccionado. Se compara contra `slugActual` y solo se limpia
        // cuando de verdad cambia: en la carga normal (mismo slug, o el primero
        // de la sesión) se conserva la caché y el menú aparece al instante.
        const anterior = get().slugActual;
        if (slug && anterior && slug !== anterior) {
          set({ menu: [], tema: null, slugActual: slug });
        }

        set({ estadoNube: "cargando", errorNube: null });
        const remoto = await leerRestauranteRemoto(slug);

        if (!remoto) {
          // Conectado pero sin datos (o error ya registrado en consola): se
          // conserva el menú local para no dejar al cliente con la carta vacía.
          //
          // `slugActual` se anota igualmente: es la marca de "a qué restaurante
          // pertenece lo que hay en memoria". Sin ella, un restaurante todavía
          // sin sembrar no dejaría rastro y el siguiente cambio no detectaría
          // que hubo un salto, saltándose la limpieza de la caché.
          set({ estadoNube: "sin-sembrar", slugActual: slug ?? anterior ?? null });
          return;
        }

        set({
          menu: remoto.menu,
          tema: remoto.tema,
          slugActual: slug ?? null,
          // El progreso de sellos del comensal es local; de la nube solo vienen
          // la meta y el premio.
          lealtad: {
            ...remoto.lealtad,
            sellos_actuales: get().lealtad.sellos_actuales,
          },
          estadoNube: "sincronizado",
        });
      },

      // --- SIEMBRA ---------------------------------------------------------
      publicarEnNube: async () => {
        const { menu, lealtad } = get();
        set({ errorNube: null });

        const res = await escribirEnNube("/api/admin/sembrar", "POST", {
          menu,
          lealtad,
        });

        if (!res.ok) {
          set({ estadoNube: "error", errorNube: res.error });
          return false;
        }
        set({ estadoNube: "sincronizado" });
        return true;
      },

      // --- ESCRITURAS ------------------------------------------------------
      // Todas son OPTIMISTAS: primero se actualiza la interfaz y luego se
      // manda el cambio. Si la escritura falla, el estado local se conserva
      // (queda en la caché) y se expone `errorNube` para avisar en el panel,
      // en lugar de descartar en silencio lo que el dueño acaba de escribir.
      guardarPlatillo: async (platillo) => {
        set((state) => {
          const existe = state.menu.some((m) => m.id === platillo.id);
          return {
            menu: existe
              ? state.menu.map((m) => (m.id === platillo.id ? platillo : m))
              : [...state.menu, platillo],
            errorNube: null,
          };
        });
        await sincronizarPlatillo(platillo, set);
      },

      eliminarPlatillo: async (id) => {
        set((state) => ({
          menu: state.menu.filter((m) => m.id !== id),
          errorNube: null,
        }));

        if (!supabaseConfigurado()) return;
        const res = await escribirEnNube(
          `/api/admin/menu?slug=${encodeURIComponent(id)}`,
          "DELETE",
        );
        if (!res.ok) set({ errorNube: res.error });
      },

      alternarDisponibilidad: async (id) => {
        const actualizado = get().menu.find((m) => m.id === id);
        if (!actualizado) return;

        const nuevo = { ...actualizado, disponible: !actualizado.disponible };
        set((state) => ({
          menu: state.menu.map((m) => (m.id === id ? nuevo : m)),
          errorNube: null,
        }));
        await sincronizarPlatillo(nuevo, set);
      },

      guardarLealtad: async (lealtad) => {
        set({ lealtad, errorNube: null });

        if (!supabaseConfigurado()) return;
        const res = await escribirEnNube("/api/admin/lealtad", "PUT", {
          lealtad,
        });
        if (!res.ok) set({ errorNube: res.error });
      },

      restablecer: () =>
        set({ ...ESTADO_INICIAL, tema: null, slugActual: null, errorNube: null }),
    }),
    {
      name: "nom-restaurante",
      /**
       * Con Supabase conectado, localStorage deja de ser la fuente de verdad y
       * pasa a ser una CACHÉ: permite pintar el menú al instante mientras llega
       * la respuesta de la red, y que la carta siga visible si el comensal se
       * queda sin cobertura a mitad de la comida.
       *
       * Nunca se persisten las funciones ni el estado de conexión.
       */
      partialize: (state) => ({
        menu: state.menu,
        lealtad: state.lealtad,
        tema: state.tema,
        slugActual: state.slugActual,
      }),
      skipHydration: true,
    },
  ),
);

// ---------------------------------------------------------------------------
// Auxiliares de red
// ---------------------------------------------------------------------------

type Resultado = { ok: true } | { ok: false; error: string };
type Set = (parcial: Partial<RestauranteState>) => void;

/** Llama a una ruta /api/admin/* y normaliza el error para la interfaz. */
async function escribirEnNube(
  url: string,
  method: "POST" | "PUT" | "DELETE",
  cuerpo?: unknown,
): Promise<Resultado> {
  try {
    const res = await fetch(url, {
      method,
      headers: cuerpo ? { "Content-Type": "application/json" } : undefined,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });

    if (res.ok) return { ok: true };

    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return {
      ok: false,
      error:
        data.error ??
        `La base de datos respondió ${res.status}. El cambio quedó solo en este dispositivo.`,
    };
  } catch {
    return {
      ok: false,
      error:
        "Sin conexión con la base de datos. El cambio quedó solo en este dispositivo.",
    };
  }
}

/** Manda un platillo a Supabase (creación, edición o cambio de disponibilidad). */
async function sincronizarPlatillo(platillo: MenuItemMock, set: Set) {
  if (!supabaseConfigurado()) return;
  const res = await escribirEnNube("/api/admin/menu", "POST", { platillo });
  if (!res.ok) set({ errorNube: res.error });
}

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
