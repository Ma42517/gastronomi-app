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
  | "sin-sembrar" // Conectado, pero este restaurante no tiene platillos.
  | "no-existe" // El slug de la URL no corresponde a ningún restaurante.
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
  /**
   * Secciones que el dueño guardó explícitamente, en su orden (migración 011).
   *
   * NO es la lista que se pinta: esa sale de `categoriasVisibles`, que une esta
   * con las que ya usan los platillos. Aquí solo vive lo que el dueño decidió,
   * incluidas las categorías vacías que acaba de crear.
   */
  categoriasGuardadas: string[];

  // --- Estado de la sincronización con Supabase ---
  estadoNube: EstadoNube;
  /** Último error de escritura, para mostrarlo en el panel. */
  errorNube: string | null;
  /**
   * Advertencia NO bloqueante de la última escritura: se guardó, pero algo se
   * quedó fuera. Hoy la produce un solo caso —falta una migración y la columna
   * no existe— y es distinta de `errorNube`, que significa "no se guardó nada".
   * Sin este canal, el dueño subiría un video y lo vería desaparecer sin motivo.
   */
  avisoNube: string | null;

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
  /**
   * Guarda cambios del tema del restaurante (nombre, eslogan, color, portada,
   * cabecera, disposición). Optimista: la vista se actualiza al instante.
   */
  guardarTema: (cambios: Partial<TemaRestaurante>) => Promise<boolean>;
  /** Renombra una categoría en todos los platillos que la usan. */
  renombrarCategoria: (anterior: string, nueva: string) => Promise<void>;
  /** Añade una sección vacía al final del menú. */
  crearCategoria: (nombre: string) => Promise<string | null>;
  /**
   * Borra una categoría Y TODOS SUS PLATILLOS.
   *
   * Devuelve cuántos platillos se llevó por delante, para poder confirmarlo en la
   * interfaz. Quien llama debe haber avisado antes: esto no pregunta.
   */
  eliminarCategoria: (nombre: string) => Promise<number>;
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
      categoriasGuardadas: [],
      estadoNube: supabaseConfigurado() ? "cargando" : "local",
      errorNube: null,
      avisoNube: null,

      // --- LECTURA ---------------------------------------------------------
      cargarDesdeNube: async (slug) => {
        if (!supabaseConfigurado()) {
          set({ estadoNube: "local" });
          return;
        }

        // ===== AISLAMIENTO ENTRE RESTAURANTES =====
        // La caché de localStorage y el menú semilla del mock pertenecen a OTRO
        // negocio, así que se descartan ANTES de pedir el nuevo menú.
        //
        // Aquí estaba el bug de los menús cruzados. Antes solo se limpiaba
        // cuando ya había un `slugActual` distinto, de modo que en una pestaña
        // recién abierta —`slugActual` a null y el menú sembrado con el mock de
        // la Taquería El Primo— cualquier restaurante heredaba esa carta.
        //
        // Ahora se limpia en cuanto el slug pedido no coincide con el que hay en
        // memoria, incluido el caso `null`. Nótese que este código solo se
        // alcanza con Supabase configurado (arriba hay un return): en modo
        // demostración el mock sigue siendo legítimo y no se toca.
        const anterior = get().slugActual;
        const cambioDeRestaurante = slug !== anterior;

        if (cambioDeRestaurante) {
          set({
            menu: [],
            tema: null,
            categoriasGuardadas: [],
            slugActual: slug ?? null,
          });
        }

        set({ estadoNube: "cargando", errorNube: null });
        const remoto = await leerRestauranteRemoto(slug);

        // --- El slug de la URL no es de nadie ---
        // Se deja la carta vacía a propósito. Servir aquí el menú del último
        // restaurante visto sería el peor resultado posible: el comensal pediría
        // de una carta que no es la de su mesa.
        if (remoto.estado === "no-existe") {
          set({
            menu: [],
            tema: null,
            categoriasGuardadas: [],
            slugActual: slug ?? null,
            estadoNube: "no-existe",
          });
          return;
        }

        // --- Error de red o Supabase apagado a media sesión ---
        // Se conservan los datos locales, que para este slug ya están limpios si
        // hubo cambio de restaurante.
        if (remoto.estado === "error" || remoto.estado === "sin-supabase") {
          set({
            estadoNube: remoto.estado === "error" ? "error" : "local",
            slugActual: slug ?? anterior ?? null,
          });
          return;
        }

        const { datos } = remoto;

        set({
          // El menú remoto MANDA, incluso si viene vacío: un restaurante recién
          // creado tiene la carta en blanco, y mostrar la de otro para rellenar
          // el hueco es exactamente el fallo que se está corrigiendo.
          menu: datos.menu,
          tema: datos.tema,
          categoriasGuardadas: datos.categorias,
          slugActual: slug ?? null,
          // El progreso de sellos del comensal es local; de la nube solo vienen
          // la meta y el premio.
          lealtad: {
            ...datos.lealtad,
            sellos_actuales: get().lealtad.sellos_actuales,
          },
          estadoNube: datos.menu.length > 0 ? "sincronizado" : "sin-sembrar",
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
        set({ estadoNube: "sincronizado", avisoNube: res.aviso ?? null });
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
        await sincronizarPlatillo(platillo, set, get().slugActual);
      },

      eliminarPlatillo: async (id) => {
        const slug = get().slugActual;
        set((state) => ({
          menu: state.menu.filter((m) => m.id !== id),
          errorNube: null,
        }));

        if (!supabaseConfigurado()) return;
        const res = await escribirEnNube(
          `/api/admin/menu?slug=${encodeURIComponent(id)}${
            slug ? `&restaurante=${encodeURIComponent(slug)}` : ""
          }`,
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
        await sincronizarPlatillo(nuevo, set, get().slugActual);
      },

      guardarLealtad: async (lealtad) => {
        set({ lealtad, errorNube: null });

        if (!supabaseConfigurado()) return;
        const res = await escribirEnNube("/api/admin/lealtad", "PUT", {
          lealtad,
          restauranteSlug: get().slugActual,
        });
        if (!res.ok) set({ errorNube: res.error });
        else set({ avisoNube: res.aviso ?? null });
      },

      // --- TEMA DEL RESTAURANTE (editor en vivo) ---------------------------
      guardarTema: async (cambios) => {
        // El tema puede ser null si no hay Supabase: se parte del mock para que
        // el editor también funcione en modo demostración.
        const base = get().tema ?? TAQUERIA_EL_PRIMO.tema;
        const nuevo = { ...base, ...cambios };

        // Optimista: primero se ve, luego se manda. El editor en vivo pierde su
        // razón de ser si hay que esperar a la red para ver el resultado.
        set({ tema: nuevo, errorNube: null, avisoNube: null });

        if (!supabaseConfigurado()) return true;

        // Del tema de la app a las columnas de la tabla. Solo se mandan los
        // campos que de verdad cambiaron: así el servidor puede repartir
        // permisos por campo y el dueño no recibe un 403 por reenviarse un color
        // que no tocó.
        const columnas: Record<string, string | null> = {};
        if (cambios.nombre_restaurante !== undefined)
          columnas.nombre = cambios.nombre_restaurante;
        if (cambios.eslogan !== undefined) columnas.eslogan = cambios.eslogan ?? null;
        if (cambios.color_primario !== undefined)
          columnas.color_primario = cambios.color_primario;
        if (cambios.portada_url !== undefined)
          columnas.portada_url = cambios.portada_url || null;
        if (cambios.logo_url !== undefined) columnas.logo_url = cambios.logo_url;

        if (Object.keys(columnas).length === 0) return true;

        const res = await escribirEnNube("/api/admin/restaurante", "PATCH", {
          slug: get().slugActual,
          ...columnas,
        });

        if (!res.ok) {
          // Se revierte: dejar en pantalla un cambio que el servidor rechazó
          // haría creer que se guardó, y el siguiente refresco lo desharía sin
          // explicación.
          set({ tema: base, errorNube: res.error });
          return false;
        }

        set({ avisoNube: res.aviso ?? null });
        return true;
      },

      // --- CATEGORÍAS ------------------------------------------------------
      crearCategoria: async (nombre) => {
        const limpio = nombre.trim();
        if (!limpio) return "El nombre no puede quedar vacío.";

        // Se compara contra las VISIBLES, no solo contra las guardadas: si ya hay
        // platillos en "Postres", crear otra "Postres" produciría dos secciones
        // con el mismo título y ninguna forma de distinguirlas.
        const yaExiste = categoriasVisibles(get()).some(
          (c) => c.toLowerCase() === limpio.toLowerCase(),
        );
        if (yaExiste) return `Ya existe una sección llamada "${limpio}".`;

        const nuevas = [...get().categoriasGuardadas, limpio];
        set({ categoriasGuardadas: nuevas, errorNube: null, avisoNube: null });

        const fallo = await guardarCategorias(nuevas, get, set);
        if (fallo) {
          // Se revierte: dejarla en pantalla haría creer que quedó guardada.
          set({ categoriasGuardadas: get().categoriasGuardadas.filter((c) => c !== limpio) });
          return fallo;
        }
        return null;
      },

      eliminarCategoria: async (nombre) => {
        const afectados = get().menu.filter((m) => m.categoria === nombre);
        const previas = get().categoriasGuardadas;

        set({
          categoriasGuardadas: previas.filter((c) => c !== nombre),
          menu: get().menu.filter((m) => m.categoria !== nombre),
          errorNube: null,
        });

        if (!supabaseConfigurado()) return afectados.length;

        await guardarCategorias(
          get().categoriasGuardadas,
          get,
          set,
        );

        // Los platillos se borran uno a uno: es la operación que expone la API, y
        // van en paralelo porque son independientes entre sí.
        const slug = get().slugActual;
        const resultados = await Promise.all(
          afectados.map((m) =>
            escribirEnNube(
              `/api/admin/menu?slug=${encodeURIComponent(m.id)}${
                slug ? `&restaurante=${encodeURIComponent(slug)}` : ""
              }`,
              "DELETE",
            ),
          ),
        );

        const fallo = resultados.find((r) => !r.ok);
        if (fallo && !fallo.ok) set({ errorNube: fallo.error });

        return afectados.length;
      },

      renombrarCategoria: async (anterior, nueva) => {
        const limpio = nueva.trim();
        if (!limpio || limpio === anterior) return;

        const afectados = get().menu.filter((m) => m.categoria === anterior);

        set((state) => ({
          menu: state.menu.map((m) =>
            m.categoria === anterior ? { ...m, categoria: limpio } : m,
          ),
          // El nombre también cambia en la lista guardada, conservando su
          // posición: si se quitara y se volviera a añadir, la sección saltaría
          // al final del menú sin que nadie lo hubiera pedido.
          categoriasGuardadas: state.categoriasGuardadas.map((c) =>
            c === anterior ? limpio : c,
          ),
          errorNube: null,
        }));

        if (!supabaseConfigurado()) return;

        await guardarCategorias(get().categoriasGuardadas, get, set);

        // La categoría no es una tabla: vive como texto en cada platillo, así que
        // renombrarla son N escrituras. Van en paralelo porque son
        // independientes; con las decenas de platillos de una carta real el coste
        // es irrelevante y evita una espera secuencial larga.
        const resultados = await Promise.all(
          afectados.map((m) =>
            escribirEnNube("/api/admin/menu", "POST", {
              platillo: { ...m, categoria: limpio },
              restauranteSlug: get().slugActual,
            }),
          ),
        );

        const fallo = resultados.find((r) => !r.ok);
        if (fallo && !fallo.ok) set({ errorNube: fallo.error });
      },

      restablecer: () =>
        set({
          ...ESTADO_INICIAL,
          tema: null,
          categoriasGuardadas: [],
          slugActual: null,
          errorNube: null,
          avisoNube: null,
        }),
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
        categoriasGuardadas: state.categoriasGuardadas,
        slugActual: state.slugActual,
      }),
      skipHydration: true,
    },
  ),
);

// ---------------------------------------------------------------------------
// Auxiliares de red
// ---------------------------------------------------------------------------

type Resultado = { ok: true; aviso?: string } | { ok: false; error: string };
type Set = (parcial: Partial<RestauranteState>) => void;

/** Llama a una ruta /api/admin/* y normaliza el error para la interfaz. */
async function escribirEnNube(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  cuerpo?: unknown,
): Promise<Resultado> {
  try {
    const res = await fetch(url, {
      method,
      headers: cuerpo ? { "Content-Type": "application/json" } : undefined,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });

    if (res.ok) {
      // El cuerpo se lee también cuando todo va bien: puede traer un `aviso`
      // (por ejemplo, se guardó el platillo pero no su video porque falta la
      // migración 009). Descartarlo dejaría al dueño sin explicación.
      const data = (await res.json().catch(() => ({}))) as { aviso?: string };
      return { ok: true, aviso: data.aviso };
    }

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

/**
 * CATEGORÍAS QUE SE PINTAN EN EL MENÚ.
 *
 * Une las que el dueño guardó con las que ya usan los platillos, en ese orden.
 *
 * ⚠️ POR QUÉ HAY QUE UNIRLAS
 * Son dos fuentes que dicen cosas distintas y ninguna sobra. La lista guardada
 * aporta el ORDEN y las secciones VACÍAS —una categoría recién creada no aparece
 * en ningún platillo todavía—. Los platillos aportan las categorías de las cartas
 * que ya existían antes de la migración 011, que nunca pasaron por esa lista. Si
 * se usara solo una de las dos, o desaparecerían las vacías o desaparecería la
 * carta entera de los restaurantes anteriores.
 */
export function categoriasVisibles(estado: {
  categoriasGuardadas: string[];
  menu: MenuItemMock[];
}): string[] {
  const guardadas = estado.categoriasGuardadas;
  const enPlatillos = Array.from(
    new Set(estado.menu.map((m) => m.categoria).filter(Boolean)),
  );

  // Las guardadas primero, en su orden; después las que solo viven en platillos.
  return [...guardadas, ...enPlatillos.filter((c) => !guardadas.includes(c))];
}

/** Persiste la lista de categorías. Devuelve el mensaje de error, o null. */
async function guardarCategorias(
  categorias: string[],
  get: () => RestauranteState,
  set: Set,
): Promise<string | null> {
  if (!supabaseConfigurado()) return null;

  const res = await escribirEnNube("/api/admin/restaurante", "PATCH", {
    slug: get().slugActual,
    categorias,
  });

  if (!res.ok) {
    set({ errorNube: res.error });
    return res.error;
  }

  set({ avisoNube: res.aviso ?? null });
  return null;
}

/** Manda un platillo a Supabase (creación, edición o cambio de disponibilidad). */
async function sincronizarPlatillo(
  platillo: MenuItemMock,
  set: Set,
  restauranteSlug: string | null,
) {
  if (!supabaseConfigurado()) return;
  const res = await escribirEnNube("/api/admin/menu", "POST", {
    platillo,
    // A QUÉ restaurante pertenece este platillo. Sin esto el servidor usaría el
    // restaurante "activo" de la cookie, que al editar desde /mesa/<slug> puede
    // ser otro: el cambio se guardaría en el negocio equivocado.
    restauranteSlug,
  });
  if (!res.ok) {
    set({ errorNube: res.error });
    return;
  }
  set({ avisoNube: res.aviso ?? null });
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
