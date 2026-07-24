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

/** Opción dentro de un grupo de modificadores (ej. "Roja", "Con todo"). */
export interface ModificadorOpcion {
  id: string;
  nombre: string;
  precio_extra?: number;
}

/** Grupo de modificadores de un platillo (ej. "Elige tu salsa"). */
export interface GrupoModificador {
  id: string;
  titulo: string;
  tipo: "single" | "multi";
  /**
   * Si es true, el cliente DEBE elegir al menos una opción para poder agregar
   * el platillo al carrito (se muestra la etiqueta "Obligatorio"). Ningún grupo
   * llega preseleccionado: el cliente elige manualmente.
   */
  requerido?: boolean;
  opciones: ModificadorOpcion[];
}

export interface MenuItemMock {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  emoji: string; // respaldo visual si la foto no carga
  disponible: boolean;
  /** Foto real del platillo (con placeholder de respaldo si falla). */
  imagen_url?: string;
  /** Complementos configurables del platillo (salsas, preparación, extras…). */
  modifiers?: GrupoModificador[];
}

/** Opción de guarnición para un platillo configurable (con costo extra). */
export interface OpcionGuarnicion {
  id: string;
  nombre: string;
  precio_extra: number;
  /** Emoji de respaldo si no hay imagen (o si esta falla al cargar). */
  emoji: string;
  /** Foto real de la guarnición (Unsplash). Opcional. */
  imagen_url?: string;
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
// Modificadores reutilizables
// ---------------------------------------------------------------------------
const MODIFICADORES_TACO: GrupoModificador[] = [
  {
    id: "salsa",
    titulo: "Elige tu salsa",
    tipo: "single",
    requerido: true,
    opciones: [
      { id: "roja", nombre: "Roja" },
      { id: "verde", nombre: "Verde" },
      { id: "habanero", nombre: "Habanero" },
    ],
  },
  {
    id: "prep",
    titulo: "Preparación",
    tipo: "single",
    opciones: [
      { id: "con-todo", nombre: "Con todo" },
      { id: "sin-cebolla", nombre: "Sin cebolla" },
    ],
  },
];

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
  categorias: ["Tacos", "Bebidas", "Extras", "Postres"],
  menu: [
    // --- Platillo Héroe (configurable, no se lista en las categorías) ---
    {
      id: "h-ribeye",
      nombre: "Ribeye Añejado",
      descripcion:
        "Corte de 400g madurado 30 días, sellado a la parrilla con mantequilla de ajo y romero. Personaliza tu término y guarnición.",
      precio: 320,
      categoria: "Especiales",
      emoji: "🥩",
      disponible: true,
      imagen_url:
        "https://images.unsplash.com/photo-1558030006-450675393462?q=80&w=800",
    },
    // --- Tacos ---
    {
      id: "t-pastor",
      nombre: "Taco al Pastor",
      descripcion:
        "Cerdo marinado en achiote y especias, cortado del trompo, con piña asada, cebolla y cilantro sobre tortilla de maíz.",
      precio: 22,
      categoria: "Tacos",
      emoji: "🌮",
      disponible: true,
      imagen_url:
        "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?q=80&w=800",
      modifiers: MODIFICADORES_TACO,
    },
    {
      id: "t-suadero",
      nombre: "Taco de Suadero",
      descripcion:
        "Res suave cocida lentamente y dorada en su jugo, con cebolla, cilantro y un toque de limón.",
      precio: 24,
      categoria: "Tacos",
      emoji: "🌮",
      disponible: true,
      imagen_url:
        "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?q=80&w=800",
      modifiers: MODIFICADORES_TACO,
    },
    {
      id: "t-campechano",
      nombre: "Taco Campechano",
      descripcion:
        "La mezcla perfecta de pastor y longaniza crujiente, con cebolla y cilantro. Para los que quieren todo.",
      precio: 26,
      categoria: "Tacos",
      emoji: "🌮",
      disponible: true,
      imagen_url:
        "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?q=80&w=800",
      modifiers: MODIFICADORES_TACO,
    },
    // --- Bebidas ---
    {
      id: "b-horchata",
      nombre: "Agua de Horchata",
      descripcion:
        "Bebida cremosa de arroz con canela y vainilla, servida bien fría en vaso de 500 ml.",
      precio: 35,
      categoria: "Bebidas",
      emoji: "🥤",
      disponible: true,
    },
    {
      id: "b-jamaica",
      nombre: "Agua de Jamaica",
      descripcion:
        "Flor de jamaica natural, refrescante y ligeramente ácida, sin azúcar añadida.",
      precio: 35,
      categoria: "Bebidas",
      emoji: "🧉",
      disponible: true,
    },
    {
      id: "b-cerveza",
      nombre: "Cerveza Artesanal",
      descripcion:
        "IPA local de barril, aromática y bien fría, 355 ml. El maridaje ideal para tus tacos.",
      precio: 55,
      categoria: "Bebidas",
      emoji: "🍺",
      disponible: true,
    },
    {
      id: "b-refresco",
      nombre: "Refresco de Cristal",
      descripcion: "Coca-Cola / Sidral / Manzanita en botella de vidrio.",
      precio: 30,
      categoria: "Bebidas",
      emoji: "🥤",
      disponible: false,
    },
    // --- Extras ---
    {
      id: "e-guacamole",
      nombre: "Guacamole",
      descripcion:
        "Aguacate machacado al momento con jitomate, cebolla, chile y cilantro, acompañado de totopos crujientes.",
      precio: 45,
      categoria: "Extras",
      emoji: "🥑",
      disponible: true,
    },
    {
      id: "e-quesofundido",
      nombre: "Queso Fundido",
      descripcion:
        "Queso Oaxaca derretido y burbujeante, servido en cazuela con tortillas recién hechas para compartir.",
      precio: 65,
      categoria: "Extras",
      emoji: "🧀",
      disponible: true,
      modifiers: [
        {
          id: "extras-queso",
          titulo: "Extras",
          tipo: "multi",
          opciones: [
            { id: "chorizo", nombre: "Chorizo", precio_extra: 15 },
            { id: "champinones", nombre: "Champiñones", precio_extra: 12 },
            { id: "doble", nombre: "Doble porción", precio_extra: 30 },
          ],
        },
      ],
    },
    // --- Postres ---
    {
      id: "p-flan",
      nombre: "Flan Napolitano",
      descripcion:
        "Flan casero cremoso bañado en caramelo, el cierre perfecto para tu comida.",
      precio: 55,
      categoria: "Postres",
      emoji: "🍮",
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
      {
        id: "g-pure",
        nombre: "Puré de Papa",
        precio_extra: 35,
        emoji: "🥔",
        imagen_url:
          "https://images.unsplash.com/photo-1593922146430-8199eb3c1a82?auto=format&fit=crop&w=600&q=80",
      },
      {
        id: "g-esparragos",
        nombre: "Espárragos a la Parrilla",
        precio_extra: 45,
        emoji: "🌿",
        imagen_url:
          "https://images.unsplash.com/photo-1554502078-ef0df4cf4df6?auto=format&fit=crop&w=600&q=80",
      },
      {
        id: "g-papas",
        nombre: "Papas Rústicas",
        precio_extra: 30,
        emoji: "🍟",
        imagen_url:
          "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80",
      },
      {
        id: "g-ensalada",
        nombre: "Ensalada Verde",
        precio_extra: 25,
        emoji: "🥗",
        imagen_url:
          "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80",
      },
    ],
  },
};
