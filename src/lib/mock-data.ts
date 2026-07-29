/**
 * Datos MOCK para desarrollo de UI (sin Supabase todavía).
 *
 * Arquitectura "Marca Blanca" (Camaleón / White-Label):
 * el componente de la vista cliente NO hardcodea colores ni nombres.
 * Todo se inyecta desde `TemaRestaurante`, de modo que el mismo código
 * sirve para cualquier restaurante cambiando solo estos datos.
 */

import type {
  DisposicionMenu,
  EstiloEncabezado,
  TipoMedia,
} from "@/types/database";

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
  // --- Personalización que elige el dueño (migración 010) ---
  /**
   * Obligatorios y no opcionales a propósito: si pudieran faltar, cada
   * componente tendría que decidir su propio valor de respaldo y antes o después
   * dos pantallas discreparían. El respaldo se aplica UNA vez, al traducir la
   * fila de la base (`filaATema`).
   */
  header_style: EstiloEncabezado;
  menu_layout: DisposicionMenu;
  whatsapp_number?: string;
  instagram_url?: string;
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
  /**
   * Video corto del platillo (opcional). Si existe, se reproduce en lugar de la
   * foto; la foto se conserva como `poster` y como respaldo si el video falla.
   */
  video_url?: string;
  /**
   * Cómo pintar `video_url`: archivo de video, GIF o enlace externo. Si falta,
   * se deduce (compatibilidad con los platillos anteriores a la migración 010).
   */
  media_type?: TipoMedia;
  /** Si es true, aparece en el carrusel "Populares" del home. */
  isPopular?: boolean;
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
    tipo: "multi",
    requerido: true,
    opciones: [
      { id: "con-todo", nombre: "Con todo" },
      { id: "sin-cebolla", nombre: "Sin cebolla" },
      { id: "sin-cilantro", nombre: "Sin cilantro" },
      { id: "sencillo", nombre: "Sencillo" },
    ],
  },
];

/** Modificadores de las papas rellenas: el queso es obligatorio (sí/no). */
const MODIFICADORES_PAPA: GrupoModificador[] = [
  {
    id: "queso",
    titulo: "Queso",
    tipo: "single",
    requerido: true,
    opciones: [
      { id: "con-queso", nombre: "Con Queso" },
      { id: "sin-queso", nombre: "Sin Queso" },
    ],
  },
];

/**
 * Modificadores del Ribeye. El término es OBLIGATORIO (nadie sirve un corte
 * sin preguntarlo) y la guarnición es opcional. Con esto el Ribeye deja de
 * necesitar su propio configurador y usa el MISMO modal y el MISMO botón de
 * confirmación estandarizado que los tacos.
 */
const MODIFICADORES_RIBEYE: GrupoModificador[] = [
  {
    id: "termino",
    titulo: "Elige tu término",
    tipo: "single",
    requerido: true,
    opciones: [
      { id: "rojo", nombre: "Rojo" },
      { id: "medio", nombre: "Medio" },
      { id: "tres-cuartos", nombre: "3/4" },
      { id: "bien-cocido", nombre: "Bien cocido" },
    ],
  },
  {
    id: "guarnicion",
    titulo: "Guarnición",
    tipo: "single",
    opciones: [
      { id: "papas-francesa", nombre: "Papas a la francesa" },
      { id: "pure-papa", nombre: "Puré de papa" },
      { id: "verduras-vapor", nombre: "Verduras al vapor" },
    ],
  },
];

/** Modificadores de quesadillas/volcanes: salsa obligatoria. */
const MODIFICADORES_SALSA: GrupoModificador[] = [
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
];

// ---------------------------------------------------------------------------
// Fotos — UNA IMAGEN DISTINTA POR PLATILLO.
//
// Antes se reutilizaban 4 constantes en 10 platillos (IMG_TACOS aparecía 3
// veces, IMG_MEX 3, IMG_FRIES 2, IMG_POTATO 2), así que el menú mostraba la
// misma foto repetida. Además IMG_POTATO devolvía 404 y caía al emoji.
//
// Todas las URLs de abajo se verificaron con HTTP 200 antes de escribirlas.
// El respaldo de emoji sigue activo por si alguna dejara de estar disponible.
// ---------------------------------------------------------------------------
const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`;

// --- Especial ---
const IMG_RIBEYE = U("1558030006-450675393462");
// --- Tacos ---
const IMG_TACO_PASTOR = U("1551504734-5ee1c4a1479b");
const IMG_TACO_BISTEC = U("1613514785940-daed07799d9b");
// --- Tortas ---
const IMG_TORTA_SUADERO = U("1565299624946-b28f40a0ae38");
const IMG_TORTA_ESPECIAL = U("1627308595229-7830a5c91f9f");
// --- Quesadillas ---
const IMG_QUESADILLA_ASADA = U("1552332386-f8dd00dc2f85");
const IMG_QUESADILLA_SENCILLA = U("1504674900247-0877df9cc836");
// --- Volcanes ---
const IMG_VOLCAN_PASTOR = U("1512058564366-18510be2db19");
const IMG_VOLCAN_CAMPECHANO = U("1466637574441-749b8f19452f");
// --- Papas rellenas ---
const IMG_PAPA_MANTEQUILLA = U("1600891964092-4316c288032e");
const IMG_PAPA_ARRACHERA = U("1626700051175-6818013e1d4f");
// --- Bebidas ---
const IMG_COCA = U("1554866585-cd94860890b7");
const IMG_FANTA = U("1624552184280-9e9631bbeee9");
const IMG_HORCHATA = U("1497534446932-c925b458314e");
// --- Postre ---
const IMG_FLAN = U("1608039829572-78524f79c4c7");
// --- Guarniciones ---
const IMG_PURE = U("1541014741259-de529411b96a");
const IMG_VERDURAS = U("1601050690597-df0568f70950");
const IMG_PAPAS_FRITAS = U("1573080496219-bb080dd4f877");
const IMG_ENSALADA = U("1567620905732-2d1ec7ab7445");

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
    // Los valores que reproducen el aspecto que el menú ya tenía.
    header_style: "solid",
    menu_layout: "grid",
  },
  lealtad: {
    sellos_actuales: 3,
    sellos_para_recompensa: 5,
    descripcion_recompensa: "Orden de Pastor gratis",
  },
  categorias: [
    // "Especiales" NO se lista aquí a propósito: el corte del chef tiene su
    // propia tarjeta destacada arriba del menú (PlatilloHeroCard). Si además
    // apareciera como sección del grid, saldría duplicado.
    // El nombre de la categoría no se puede cambiar: `maridajes.ts` lo usa
    // como clave para calcular las sugerencias de bebida del Ribeye.
    "Tacos",
    "Tortas",
    "Quesadillas",
    "Volcanes",
    "Papas Rellenas",
    "Bebidas",
  ],
  menu: [
    // --- Corte del chef: se lista en "Especiales" como cualquier otro ---
    {
      id: "h-ribeye",
      nombre: "Ribeye Añejado",
      // NO se renderiza en ninguna parte: la UI muestra únicamente el texto de
      // Ñom AI debajo del título. Este campo queda solo como fuente de
      // ingredientes para el copiloto (sin él, la IA inventaría el corte).
      // Se limpió la coletilla "Personaliza tu término y guarnición", que era
      // residuo del configurador viejo.
      descripcion:
        "Corte de 400g madurado 30 días, sellado a la parrilla con mantequilla de ajo y romero.",
      precio: 320,
      categoria: "Especiales",
      emoji: "🥩",
      disponible: true,
      imagen_url: IMG_RIBEYE,
      modifiers: MODIFICADORES_RIBEYE,
    },

    // --- Tacos ---
    {
      id: "t-pastor",
      nombre: "Taco al Pastor",
      descripcion:
        "Cerdo marinado en achiote cortado del trompo, con piña asada, cebolla y cilantro sobre tortilla de maíz.",
      precio: 22,
      categoria: "Tacos",
      emoji: "🌮",
      disponible: true,
      isPopular: true,
      imagen_url: IMG_TACO_PASTOR,
      modifiers: MODIFICADORES_TACO,
    },
    {
      id: "t-bistec",
      nombre: "Taco de Bistec",
      descripcion:
        "Bistec de res a la plancha finamente picado, con cebolla, cilantro y salsa al gusto.",
      precio: 24,
      categoria: "Tacos",
      emoji: "🌮",
      disponible: true,
      imagen_url: IMG_TACO_BISTEC,
      modifiers: MODIFICADORES_TACO,
    },

    // --- Tortas ---
    {
      id: "to-suadero",
      nombre: "Torta de Suadero",
      descripcion:
        "Telera crujiente rellena de suadero dorado, con frijoles, aguacate, jitomate y chipotle.",
      precio: 58,
      categoria: "Tortas",
      emoji: "🥪",
      disponible: true,
      imagen_url: IMG_TORTA_SUADERO,
    },
    {
      id: "to-especial",
      nombre: "Torta Especial",
      descripcion:
        "La grande: milanesa, jamón, queso, aguacate, frijoles y chorizo. Para un hambre de campeones.",
      precio: 79,
      categoria: "Tortas",
      emoji: "🥪",
      disponible: true,
      isPopular: true,
      imagen_url: IMG_TORTA_ESPECIAL,
    },

    // --- Quesadillas ---
    {
      id: "q-asada",
      nombre: "Quesadilla de Asada",
      descripcion:
        "Tortilla de maíz hecha a mano con queso Oaxaca fundido y arrachera asada jugosa.",
      precio: 48,
      categoria: "Quesadillas",
      emoji: "🫓",
      disponible: true,
      imagen_url: IMG_QUESADILLA_ASADA,
      modifiers: MODIFICADORES_SALSA,
    },
    {
      id: "q-sencilla",
      nombre: "Quesadilla Sencilla",
      descripcion:
        "Clásica de queso Oaxaca derretido en tortilla recién hecha. Simple y deliciosa.",
      precio: 32,
      categoria: "Quesadillas",
      emoji: "🫓",
      disponible: true,
      imagen_url: IMG_QUESADILLA_SENCILLA,
    },

    // --- Volcanes ---
    {
      id: "v-pastor",
      nombre: "Volcán de Pastor",
      descripcion:
        "Tostada de maíz cubierta con queso gratinado y pastor del trompo, con piña y cebolla.",
      precio: 34,
      categoria: "Volcanes",
      emoji: "🌋",
      disponible: true,
      isPopular: true,
      imagen_url: IMG_VOLCAN_PASTOR,
      modifiers: MODIFICADORES_SALSA,
    },
    {
      id: "v-campechano",
      nombre: "Volcán Campechano",
      descripcion:
        "Base crujiente con queso fundido, pastor y longaniza. La combinación más pedida.",
      precio: 38,
      categoria: "Volcanes",
      emoji: "🌋",
      disponible: true,
      imagen_url: IMG_VOLCAN_CAMPECHANO,
      modifiers: MODIFICADORES_SALSA,
    },

    // --- Papas Rellenas ---
    {
      id: "pa-mantequilla",
      nombre: "Papa al Horno con Mantequilla",
      descripcion:
        "Papa horneada esponjosa abierta con mantequilla derretida, crema, queso y cebollín.",
      precio: 65,
      categoria: "Papas Rellenas",
      emoji: "🥔",
      disponible: true,
      imagen_url: IMG_PAPA_MANTEQUILLA,
      modifiers: MODIFICADORES_PAPA,
    },
    {
      id: "pa-arrachera",
      nombre: "Papa Especial con Arrachera",
      descripcion:
        "Papa gigante rellena de arrachera, queso gratinado, tocino y aderezo de la casa.",
      precio: 95,
      categoria: "Papas Rellenas",
      emoji: "🥔",
      disponible: true,
      isPopular: true,
      imagen_url: IMG_PAPA_ARRACHERA,
      modifiers: MODIFICADORES_PAPA,
    },

    // --- Bebidas (complemento ideal para tacos/tortas/antojitos) ---
    {
      id: "b-coca",
      nombre: "Coca-Cola",
      descripcion:
        "Refresco de cristal bien frío, 355 ml. El clásico que nunca falla con unos tacos.",
      precio: 30,
      categoria: "Bebidas",
      emoji: "🥤",
      disponible: true,
      imagen_url: IMG_COCA,
    },
    {
      id: "b-fanta",
      nombre: "Fanta",
      descripcion:
        "Refresco de naranja bien frío, 355 ml. Dulce y burbujeante para bajar los antojitos.",
      precio: 30,
      categoria: "Bebidas",
      emoji: "🍊",
      disponible: true,
      imagen_url: IMG_FANTA,
    },
    {
      id: "b-horchata",
      nombre: "Agua de Horchata",
      descripcion:
        "Bebida cremosa de arroz con canela y vainilla, servida bien fría en vaso de 500 ml.",
      precio: 35,
      categoria: "Bebidas",
      emoji: "🧉",
      disponible: true,
      imagen_url: IMG_HORCHATA,
    },

    // --- Postre (no se lista en categorías: solo cross-sell / drawer) ---
    {
      id: "p-flan",
      nombre: "Flan Napolitano",
      descripcion:
        "Flan casero cremoso bañado en caramelo, el cierre perfecto para tu comida.",
      precio: 55,
      categoria: "Postres",
      emoji: "🍮",
      disponible: true,
      imagen_url: IMG_FLAN,
    },
  ],
  sommelier: {
    titulo: "Maridaje ideal",
    descripcion: "Un Volcán de Pastor para acompañar tus tacos",
    item_id: "v-pastor",
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
        // Antes apuntaba a una foto que devolvía 404.
        imagen_url: IMG_PURE,
      },
      {
        id: "g-verduras",
        nombre: "Verduras al Vapor",
        precio_extra: 45,
        emoji: "🥦",
        imagen_url: IMG_VERDURAS,
      },
      {
        id: "g-papas",
        nombre: "Papas a la Francesa",
        precio_extra: 30,
        emoji: "🍟",
        imagen_url: IMG_PAPAS_FRITAS,
      },
      {
        id: "g-ensalada",
        nombre: "Ensalada Verde",
        precio_extra: 25,
        emoji: "🥗",
        imagen_url: IMG_ENSALADA,
      },
    ],
  },
};
