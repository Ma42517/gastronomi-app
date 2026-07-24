/**
 * Datos MOCK para desarrollo de UI (sin Supabase todavía).
 *
 * Arquitectura "Marca Blanca" (Camaleón / White-Label):
 * el componente de la vista cliente NO hardcodea colores ni nombres.
 * Todo se inyecta desde `TemaRestaurante`, de modo que el mismo código
 * sirve para cualquier restaurante cambiando solo estos datos.
 */

// ---------------------------------------------------------------------------
// Tipos de UI (mock). Cuando conectemos Supabase se mapearán desde src/types.
// ---------------------------------------------------------------------------
export interface TemaRestaurante {
  nombre_restaurante: string;
  /** HEX del color de marca. Se inyecta como CSS var --brand. */
  color_primario: string;
  logo_url: string | null;
  /** Fallback cuando no hay logo (se muestran las iniciales). */
  iniciales: string;
  eslogan?: string;
  /** Imagen de portada del header (con gradiente de respaldo si no carga). */
  portada_url: string;
}

/** Sugerencia de maridaje generada por "Ñom AI". */
export interface SugerenciaSommelier {
  titulo: string;
  descripcion: string;
  /** id del platillo/bebida que agrega el botón del banner. */
  item_id: string;
}

export interface ProgramaLealtad {
  sellos_actuales: number;
  sellos_para_recompensa: number;
  descripcion_recompensa: string;
}

export interface MenuItemMock {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  emoji: string; // placeholder visual mientras no hay fotos reales
  disponible: boolean;
}

/** Opción de guarnición para un platillo configurable (con costo extra). */
export interface OpcionGuarnicion {
  id: string;
  nombre: string;
  precio_extra: number;
}

/**
 * Configuración de un "Platillo Héroe" personalizable (experiencia tipo
 * configurador de autos). Referencia un MenuItemMock por id para el carrito.
 */
export interface PlatilloHeroConfig {
  item_id: string;
  etiqueta: string;
  guarniciones: OpcionGuarnicion[];
}

export interface RestauranteMock {
  id: string;
  tema: TemaRestaurante;
  lealtad: ProgramaLealtad;
  categorias: string[];
  menu: MenuItemMock[];
  sommelier: SugerenciaSommelier;
  hero: PlatilloHeroConfig;
}

/** Línea del carrito: un platillo con su cantidad. */
export interface CarritoLinea {
  item: MenuItemMock;
  cantidad: number;
}

// ---------------------------------------------------------------------------
// MOCK: "Taquería El Primo"
// ---------------------------------------------------------------------------
export const TAQUERIA_EL_PRIMO: RestauranteMock = {
  id: "el-primo",
  tema: {
    nombre_restaurante: "Taquería El Primo",
    color_primario: "#DC2626", // rojo fuego
    logo_url: null,
    iniciales: "EP",
    eslogan: "Los tacos que unen a la familia",
    portada_url:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80",
  },
  lealtad: {
    sellos_actuales: 3,
    sellos_para_recompensa: 5,
    descripcion_recompensa: "Orden de Pastor gratis",
  },
  categorias: ["Tacos", "Bebidas", "Extras"],
  menu: [
    // --- Platillo Héroe (configurable, no se lista en las categorías) ---
    {
      id: "h-ribeye",
      nombre: "Ribeye Añejado",
      descripcion:
        "Corte de 400g madurado 30 días, sellado a la parrilla. Personaliza tu término y guarnición.",
      precio: 320,
      categoria: "Especiales",
      emoji: "🥩",
      disponible: true,
    },
    // --- Tacos ---
    {
      id: "t-pastor",
      nombre: "Taco al Pastor",
      descripcion: "Cerdo marinado, piña, cebolla y cilantro.",
      precio: 22,
      categoria: "Tacos",
      emoji: "🌮",
      disponible: true,
    },
    {
      id: "t-suadero",
      nombre: "Taco de Suadero",
      descripcion: "Res suave dorada en su jugo.",
      precio: 24,
      categoria: "Tacos",
      emoji: "🌮",
      disponible: true,
    },
    {
      id: "t-campechano",
      nombre: "Taco Campechano",
      descripcion: "Mezcla de pastor y longaniza.",
      precio: 26,
      categoria: "Tacos",
      emoji: "🌮",
      disponible: true,
    },
    // --- Bebidas ---
    {
      id: "b-horchata",
      nombre: "Agua de Horchata",
      descripcion: "Vaso de 500 ml, bien fría.",
      precio: 35,
      categoria: "Bebidas",
      emoji: "🥤",
      disponible: true,
    },
    {
      id: "b-jamaica",
      nombre: "Agua de Jamaica",
      descripcion: "Natural, sin azúcar añadida.",
      precio: 35,
      categoria: "Bebidas",
      emoji: "🧉",
      disponible: true,
    },
    {
      id: "b-cerveza",
      nombre: "Cerveza Artesanal",
      descripcion: "IPA local de barril, 355 ml.",
      precio: 55,
      categoria: "Bebidas",
      emoji: "🍺",
      disponible: true,
    },
    {
      id: "b-refresco",
      nombre: "Refresco de Cristal",
      descripcion: "Coca-Cola / Sidral / Manzanita.",
      precio: 30,
      categoria: "Bebidas",
      emoji: "🥤",
      disponible: false,
    },
    // --- Extras ---
    {
      id: "e-guacamole",
      nombre: "Guacamole",
      descripcion: "Recién hecho con totopos.",
      precio: 45,
      categoria: "Extras",
      emoji: "🥑",
      disponible: true,
    },
    {
      id: "e-quesofundido",
      nombre: "Queso Fundido",
      descripcion: "Con chorizo, para compartir.",
      precio: 65,
      categoria: "Extras",
      emoji: "🧀",
      disponible: true,
    },
  ],
  sommelier: {
    titulo: "Maridaje ideal",
    descripcion: "Cerveza Artesanal con tus Tacos al Pastor",
    item_id: "b-cerveza",
  },
  hero: {
    item_id: "h-ribeye",
    etiqueta: "Selección del Chef",
    guarniciones: [
      { id: "g-pure", nombre: "Puré de Papa", precio_extra: 35 },
      { id: "g-esparragos", nombre: "Espárragos a la Parrilla", precio_extra: 45 },
      { id: "g-papas", nombre: "Papas Rústicas", precio_extra: 30 },
      { id: "g-ensalada", nombre: "Ensalada Verde", precio_extra: 25 },
    ],
  },
};
