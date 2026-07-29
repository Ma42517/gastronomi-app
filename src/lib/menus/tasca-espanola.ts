import type { MenuItemMock } from "@/lib/mock-data";

/**
 * MENÚ DE LA TASCA ESPAÑOLA — datos para sembrar.
 *
 * ⚠️ LOS TAMAÑOS Y LOS EXTRAS NO SON PLATILLOS
 * "Sándwich Grande" no existe como producto: existe el Sándwich Clásico con la
 * opción Grande, que suma $30. La diferencia importa por tres motivos:
 *
 *   1. El menú se lee. Con seis variantes del mismo sándwich como platillos
 *      sueltos, el comensal tiene que comparar seis tarjetas casi idénticas para
 *      entender que es un solo producto.
 *   2. Cambiar el precio base se hace UNA vez. Con variantes sueltas hay que
 *      recordar tocar las seis, y la que se olvide queda mal cobrada.
 *   3. Los extras se combinan. "Doble carne" y "4 quesos" a la vez son una sola
 *      elección de dos opciones; como platillos habría que crear una tarjeta por
 *      cada combinación posible.
 *
 * CÓMO SE GUARDA LA RELACIÓN
 * Cada platillo lleva sus grupos en la columna `modifiers` (jsonb) de
 * `menu_items`, así que el vínculo entre el platillo y sus opciones es la propia
 * fila: no hay ids que puedan quedar huérfanos ni que haya que resolver al
 * insertar. Es el modelo que ya usa el resto de la aplicación —el término del
 * Ribeye o las salsas del taco— y por eso el menú del comensal y el editor
 * funcionan con esto sin tocar nada.
 */

/** Grupo de tamaño. El importe va en la opción, no en el nombre. */
const tamano = (
  chico: string,
  grande: string,
  extraGrande: number,
): MenuItemMock["modifiers"] => [
  {
    id: "tamano",
    titulo: "Tamaño",
    tipo: "single",
    // Obligatorio: sin tamaño elegido la cocina no sabe qué preparar.
    requerido: true,
    opciones: [
      { id: "mediano", nombre: chico, precio_extra: 0 },
      { id: "grande", nombre: grande, precio_extra: extraGrande },
    ],
  },
];

/** Grupo de extras: opcional y combinable. */
const extras = (
  dobleCarne: number,
  cuatroQuesos: number,
  jamon: number,
): NonNullable<MenuItemMock["modifiers"]>[number] => ({
  id: "extras",
  titulo: "Extras",
  tipo: "multi",
  requerido: false,
  opciones: [
    { id: "doble-carne", nombre: "Con doble carne", precio_extra: dobleCarne },
    { id: "cuatro-quesos", nombre: "Con 4 quesos", precio_extra: cuatroQuesos },
    { id: "jamon", nombre: "Con jamón", precio_extra: jamon },
  ],
});

/** Secciones en el orden en que se leerán en el menú. */
export const CATEGORIAS_TASCA = [
  "Platos de Entrada",
  "Sandwich",
  "Hamburguesa",
  "Bebidas",
];

export const MENU_TASCA: MenuItemMock[] = [
  // ===== SANDWICH =====
  {
    id: "sandwich-clasico",
    nombre: "Sándwich Clásico",
    descripcion:
      "Pan artesano, con opción de tamaño mediano o grande y extras de carne, quesos o jamón.",
    precio: 95,
    categoria: "Sandwich",
    emoji: "🥪",
    disponible: true,
    modifiers: [
      ...(tamano("Mediano", "Grande", 30) ?? []),
      extras(45, 35, 25),
    ],
  },

  // ===== HAMBURGUESA =====
  {
    id: "hamburguesa-clasica",
    nombre: "Hamburguesa Clásica",
    descripcion:
      "Carne a la parrilla en pan brioche, con opción de tamaño y extras.",
    precio: 115,
    categoria: "Hamburguesa",
    emoji: "🍔",
    disponible: true,
    modifiers: [
      ...(tamano("Mediana", "Grande", 40) ?? []),
      extras(55, 40, 30),
    ],
  },

  // ===== PLATOS DE ENTRADA (sin opciones) =====
  {
    id: "tortilla-patata",
    nombre: "Tortilla de patata",
    descripcion: "Patata, huevo y cebolla, cuajada al punto.",
    precio: 110,
    categoria: "Platos de Entrada",
    emoji: "🥘",
    disponible: true,
  },
  {
    id: "jamon-iberico",
    nombre: "Jamón Ibérico",
    descripcion: "Cortado a cuchillo, con pan de cristal.",
    precio: 220,
    categoria: "Platos de Entrada",
    emoji: "🍖",
    disponible: true,
  },
  {
    id: "salmorejo-cordobes",
    nombre: "Salmorejo cordobés",
    descripcion: "Tomate, pan, aceite de oliva y ajo. Se sirve frío.",
    precio: 95,
    categoria: "Platos de Entrada",
    emoji: "🍅",
    disponible: true,
  },
  {
    id: "gazpacho-andaluz",
    nombre: "Gazpacho andaluz",
    descripcion: "Sopa fría de tomate, pepino, pimiento y aceite de oliva.",
    precio: 90,
    categoria: "Platos de Entrada",
    emoji: "🥒",
    disponible: true,
  },
  {
    id: "paella",
    nombre: "Paella",
    descripcion: "Arroz con azafrán, cocinado a fuego lento en su paellera.",
    precio: 250,
    categoria: "Platos de Entrada",
    emoji: "🥘",
    disponible: true,
    // La más representativa de la casa: entra al carrusel de destacados.
    isPopular: true,
  },

  // ===== BEBIDAS =====
  {
    id: "cerveza-lager",
    nombre: "Cerveza Lager",
    descripcion: "Rubia ligera, bien fría.",
    precio: 45,
    categoria: "Bebidas",
    emoji: "🍺",
    disponible: true,
  },
  {
    id: "lager-extra",
    nombre: "Lager extra",
    descripcion: "Lager de mayor cuerpo y graduación.",
    precio: 55,
    categoria: "Bebidas",
    emoji: "🍺",
    disponible: true,
  },
  {
    id: "cerveza-ales",
    nombre: "Cerveza Ales",
    descripcion: "Fermentación alta, con notas afrutadas.",
    precio: 65,
    categoria: "Bebidas",
    emoji: "🍺",
    disponible: true,
  },
  {
    id: "cerveza-negra",
    nombre: "Cerveza negra",
    descripcion: "Malta tostada, con cuerpo y final a café.",
    precio: 60,
    categoria: "Bebidas",
    emoji: "🍺",
    disponible: true,
  },
  {
    id: "rubia",
    nombre: "Rubia",
    descripcion: "Suave y refrescante, la de siempre.",
    precio: 50,
    categoria: "Bebidas",
    emoji: "🍺",
    disponible: true,
  },
];
