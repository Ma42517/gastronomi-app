import type { MenuItemMock } from "./mock-data";

/**
 * MARIDAJES — venta cruzada CON RAZÓN.
 *
 * Cada platillo declara qué complementos combinan de verdad (en orden de
 * afinidad) y el motivo gastronómico. Si algo NO combina, simplemente no se
 * incluye: Ñom AI nunca debe recomendar una bebida que no va con el platillo.
 */
interface Maridaje {
  /** IDs de complementos que SÍ combinan, del mejor al aceptable. */
  ids: string[];
  /** Motivo real del maridaje (se muestra como micro-copy). */
  motivo: string;
}

/**
 * Reglas por platillo. Notas de criterio:
 * - Picante/grasoso (pastor, campechano, arrachera): refresco con gas corta la
 *   grasa; la horchata calma el picor.
 * - Carnes asadas (bistec, asada): refresco de cola, el clásico de la taquería.
 * - Suaves/cremosos (quesadilla sencilla, papa con mantequilla): horchata o
 *   naranja aportan contraste dulce sin pelearse con el queso.
 * - Postre (flan): NO se recomienda refresco (dulce sobre dulce). Sin sugerencia.
 */
const MARIDAJES: Record<string, Maridaje> = {
  // --- Tacos ---
  "t-pastor": {
    ids: ["b-coca", "b-horchata"],
    motivo: "el gas corta lo grasoso del pastor y la horchata calma el picor",
  },
  "t-bistec": {
    ids: ["b-coca"],
    motivo: "una cola bien fría es el clásico con carne asada",
  },

  // --- Tortas ---
  "to-suadero": {
    ids: ["b-coca", "b-horchata"],
    motivo: "algo frío para bajar una torta bien servida",
  },
  "to-especial": {
    ids: ["b-coca", "b-fanta"],
    motivo: "con una torta tan completa, un refresco con gas cae perfecto",
  },

  // --- Quesadillas ---
  "q-asada": {
    ids: ["b-coca", "b-horchata"],
    motivo: "el queso fundido con arrachera pide algo frío que refresque",
  },
  "q-sencilla": {
    ids: ["b-horchata", "b-fanta"],
    motivo: "la horchata suaviza el queso; la naranja le da contraste dulce",
  },

  // --- Volcanes ---
  "v-pastor": {
    ids: ["b-coca", "b-horchata"],
    motivo: "queso gratinado y pastor: el gas limpia el paladar",
  },
  "v-campechano": {
    ids: ["b-coca", "b-horchata"],
    motivo: "es contundente y picosito: la horchata baja el picor",
  },

  // --- Papas Rellenas ---
  "pa-mantequilla": {
    ids: ["b-fanta", "b-coca"],
    motivo: "algo burbujeante contrasta con lo cremoso de la papa",
  },
  "pa-arrachera": {
    ids: ["b-coca", "b-fanta"],
    motivo: "papa con arrachera y tocino: el gas corta lo pesado",
  },

  // --- Postres: NO se sugiere refresco (dulce sobre dulce) ---
  "p-flan": { ids: [], motivo: "" },

  // --- Bebidas: lo que falta es la comida ---
  "b-coca": {
    ids: ["t-pastor", "q-asada"],
    motivo: "una cola pide unos tacos o una quesadilla recién hecha",
  },
  "b-fanta": {
    ids: ["pa-arrachera", "to-especial"],
    motivo: "lo dulce combina con algo salado y contundente",
  },
  "b-horchata": {
    ids: ["t-pastor", "v-campechano"],
    motivo: "la horchata es ideal con algo picosito",
  },
};

/** Respaldo por categoría cuando un platillo nuevo no tiene regla propia. */
const POR_CATEGORIA: Record<string, Maridaje> = {
  Tacos: {
    ids: ["b-coca", "b-horchata"],
    motivo: "algo frío que corte lo grasoso y calme el picor",
  },
  Tortas: {
    ids: ["b-coca", "b-horchata"],
    motivo: "un refresco frío para acompañar",
  },
  Quesadillas: {
    ids: ["b-horchata", "b-coca"],
    motivo: "algo refrescante para el queso fundido",
  },
  Volcanes: {
    ids: ["b-coca", "b-horchata"],
    motivo: "el gas limpia el paladar del queso gratinado",
  },
  "Papas Rellenas": {
    ids: ["b-fanta", "b-coca"],
    motivo: "algo burbujeante contrasta con lo cremoso",
  },
  Bebidas: {
    ids: ["t-pastor", "q-asada"],
    motivo: "acompáñala con algo recién hecho",
  },
  Especiales: {
    ids: ["b-coca"],
    motivo: "un refresco frío para acompañar el corte",
  },
  Postres: { ids: [], motivo: "" },
};

/**
 * Devuelve los complementos que REALMENTE combinan con el platillo (máx. 3)
 * junto con el motivo. Si no hay maridaje sensato, regresa lista vacía.
 */
export function obtenerMaridaje(
  item: MenuItemMock,
  menu: MenuItemMock[],
): { items: MenuItemMock[]; motivo: string } {
  const regla = MARIDAJES[item.id] ?? POR_CATEGORIA[item.categoria];
  if (!regla || regla.ids.length === 0) return { items: [], motivo: "" };

  const items = regla.ids
    .map((id) => menu.find((m) => m.id === id))
    .filter(
      (m): m is MenuItemMock =>
        Boolean(m) && m!.disponible && m!.id !== item.id,
    )
    .slice(0, 3);

  return { items, motivo: items.length > 0 ? regla.motivo : "" };
}
