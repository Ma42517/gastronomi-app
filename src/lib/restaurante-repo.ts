import type { GrupoModificador, MenuItemMock } from "@/lib/mock-data";
import type { LealtadEditable } from "@/lib/restaurante-store";
import type { MenuItem, Restaurante } from "@/types/database";

/**
 * REPOSITORIO DEL RESTAURANTE — traducción entre Postgres y el dominio de la app.
 *
 * La pieza clave es el mapeo de identificadores. En Supabase la llave primaria
 * de `menu_items` es un uuid (las órdenes la referencian), pero la app depende
 * de ids ESTABLES y legibles: toda la tabla de maridajes está indexada por
 * "t-pastor", "b-coca"…, el postre del cross-sell se busca por "p-flan" y el
 * platillo héroe por "h-ribeye".
 *
 * Si el id de la app pasara a ser el uuid, la venta cruzada dejaría de
 * funcionar en silencio. Por eso la columna `slug` guarda el id de dominio y
 * este repositorio traduce en ambos sentidos.
 */

/** Fila de `menu_items` con las columnas que añade la migración 001. */
export type MenuItemRow = MenuItem & {
  slug: string | null;
  emoji: string | null;
  modifiers: GrupoModificador[] | null;
  is_popular: boolean | null;
};

/** Fila de `restaurantes` con las columnas que añade la migración 001. */
export type RestauranteRow = Restaurante & {
  imagen_premio: string | null;
};

// ---------------------------------------------------------------------------
// Postgres -> dominio de la app
// ---------------------------------------------------------------------------

export function filaAPlatillo(row: MenuItemRow): MenuItemMock {
  return {
    // El slug es el id de dominio. Si por algún motivo faltara, se cae al uuid
    // para no perder el registro (aunque su maridaje no se resolvería).
    id: row.slug ?? row.id,
    nombre: row.nombre,
    descripcion: row.descripcion ?? "",
    // `numeric` de Postgres llega como string por el driver: sin este Number()
    // los precios se concatenarían en lugar de sumarse.
    precio: Number(row.precio),
    categoria: row.categoria ?? "Otros",
    emoji: row.emoji ?? "🍽️",
    disponible: row.disponible,
    imagen_url: row.imagen_url ?? undefined,
    isPopular: row.is_popular ?? undefined,
    modifiers: row.modifiers ?? undefined,
  };
}

export function filaALealtad(row: RestauranteRow): LealtadEditable {
  return {
    // El progreso del comensal NO vive aquí (es por cliente, en
    // `transacciones_lealtad`): esta tabla solo define la meta y el premio.
    sellos_actuales: 0,
    sellos_para_recompensa: row.sellos_para_recompensa,
    descripcion_recompensa: row.descripcion_recompensa ?? "Premio sorpresa",
    imagen_premio: row.imagen_premio ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Dominio de la app -> Postgres
// ---------------------------------------------------------------------------

/** Payload de escritura de un platillo (sin uuid ni restaurante: los pone el servidor). */
export interface PlatilloUpsert {
  slug: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  emoji: string;
  disponible: boolean;
  imagen_url: string | null;
  is_popular: boolean;
  modifiers: GrupoModificador[] | null;
}

export function platilloAUpsert(item: MenuItemMock): PlatilloUpsert {
  return {
    slug: item.id,
    nombre: item.nombre,
    descripcion: item.descripcion,
    precio: item.precio,
    categoria: item.categoria,
    emoji: item.emoji,
    disponible: item.disponible,
    imagen_url: item.imagen_url ?? null,
    is_popular: item.isPopular ?? false,
    modifiers: item.modifiers ?? null,
  };
}
