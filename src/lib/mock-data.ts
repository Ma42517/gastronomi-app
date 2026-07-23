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

export interface RestauranteMock {
  id: string;
  tema: TemaRestaurante;
  lealtad: ProgramaLealtad;
  categorias: string[];
  menu: MenuItemMock[];
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
  },
  lealtad: {
    sellos_actuales: 3,
    sellos_para_recompensa: 5,
    descripcion_recompensa: "Orden de Pastor gratis",
  },
  categorias: ["Tacos", "Bebidas", "Extras"],
  menu: [
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
};
