/**
 * COLUMNAS QUE LA APLICACIÓN NECESITA, Y EL SQL QUE LAS CREA.
 *
 * POR QUÉ ESTO NO SE APLICA SOLO
 * Crear columnas es DDL, y la API de Supabase no ejecuta SQL arbitrario: haría
 * falta una conexión directa a Postgres con su contraseña. Podría añadirse, pero
 * un ejecutor de DDL que se dispara desde una petición web es de las cosas que no
 * se envían sin haberlas probado a fondo contra una base real, y correría sobre la
 * base de producción de alguien. Así que aquí no se automatiza: se DETECTA lo que
 * falta y se entrega el SQL exacto, mínimo e idempotente.
 *
 * Lo que sí se automatiza son los buckets de Storage (ver `buckets.ts`), porque la
 * API de Supabase los crea sin SQL.
 *
 * Módulo sin importaciones: es una tabla de datos y cadenas, y así se puede probar
 * aislado.
 */

export interface ColumnaEsperada {
  tabla: "menu_items" | "restaurantes";
  columna: string;
  /** Para qué sirve, en lenguaje llano. */
  para: string;
  /** Migración que la introdujo, para poder rastrearla. */
  migracion: string;
  /** Definición para el `add column if not exists`. */
  definicion: string;
}

export const COLUMNAS_ESPERADAS: ColumnaEsperada[] = [
  {
    tabla: "menu_items",
    columna: "video_url",
    para: "el video o GIF del platillo",
    migracion: "009_video_platillos.sql",
    definicion: "text",
  },
  {
    tabla: "menu_items",
    columna: "media_type",
    para: "saber si ese archivo es video o imagen animada",
    migracion: "010_media_y_personalizacion.sql",
    definicion: "text",
  },
  {
    tabla: "restaurantes",
    columna: "header_style",
    para: "la cabecera sólida o de cristal",
    migracion: "010_media_y_personalizacion.sql",
    definicion: "text not null default 'solid'",
  },
  {
    tabla: "restaurantes",
    columna: "menu_layout",
    para: "el menú en una o dos columnas",
    migracion: "010_media_y_personalizacion.sql",
    definicion: "text not null default 'grid'",
  },
  {
    tabla: "restaurantes",
    columna: "whatsapp_number",
    para: "el enlace de WhatsApp en el menú",
    migracion: "010_media_y_personalizacion.sql",
    definicion: "text",
  },
  {
    tabla: "restaurantes",
    columna: "instagram_url",
    para: "el enlace de Instagram en el menú",
    migracion: "010_media_y_personalizacion.sql",
    definicion: "text",
  },
];

/**
 * Genera el SQL para crear SOLO las columnas que faltan.
 *
 * Se agrupa por tabla en un único `alter table` en lugar de una sentencia por
 * columna: es lo que hay que pegar en el editor de Supabase, y cuanto más corto
 * sea, menos probable es equivocarse al copiarlo.
 *
 * Todo va con `if not exists`, así que volver a ejecutarlo no rompe nada.
 */
export function sqlParaColumnasFaltantes(faltantes: ColumnaEsperada[]): string {
  if (faltantes.length === 0) return "";

  const tablas = [...new Set(faltantes.map((c) => c.tabla))];

  return tablas
    .map((tabla) => {
      const columnas = faltantes
        .filter((c) => c.tabla === tabla)
        .map((c) => `  add column if not exists ${c.columna} ${c.definicion}`)
        .join(",\n");

      return `alter table public.${tabla}\n${columnas};`;
    })
    .join("\n\n");
}
