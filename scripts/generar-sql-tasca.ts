/**
 * GENERADOR DEL SQL DE SIEMBRA DE LA TASCA ESPAÑOLA
 *
 * Uso:  node --experimental-strip-types scripts/generar-sql-tasca.ts
 * Sale: supabase/SEMBRAR-TASCA.sql
 *
 * POR QUÉ GENERADO Y NO ESCRITO A MANO
 * Los grupos de opciones son JSON dentro de un `insert`. Escribirlo a mano
 * significa que nada comprueba su forma: un campo mal nombrado no da error de
 * SQL, simplemente hace que el modal del platillo salga vacío en el menú del
 * comensal. Aquí el JSON se serializa desde `MENU_TASCA`, que está tipado con las
 * mismas interfaces que lee la aplicación, así que si la forma no cuadra no
 * compila y el archivo no se genera.
 *
 * Y POR QUÉ HAY SQL SI YA EXISTE LA RUTA DE SIEMBRA
 * La ruta necesita la app corriendo y sesión de súper admin. El SQL solo necesita
 * el editor de Supabase, que es donde el dueño del proyecto ya está corriendo las
 * migraciones. Los dos caminos parten del MISMO dato, así que no pueden
 * discrepar: este archivo es una vista de `tasca-espanola.ts`, no una copia.
 */

import {
  CATEGORIAS_TASCA,
  MENU_TASCA,
} from "../src/lib/menus/tasca-espanola.ts";

/** Texto → literal SQL. Las comillas simples se duplican. */
const lit = (valor: string | null | undefined) =>
  valor === null || valor === undefined
    ? "null"
    : `'${valor.replace(/'/g, "''")}'`;

/** Objeto → literal SQL que luego se castea a jsonb. */
const json = (valor: unknown) =>
  valor === null || valor === undefined ? "null" : lit(JSON.stringify(valor));

const SLUG = "tasca-espanola";

/** Identidad del restaurante. Igual que en la ruta de siembra. */
const RESTAURANTE = {
  slug: SLUG,
  nombre: "La Tasca Española",
  eslogan: "Cocina española de siempre",
  color_primario: "#C8102E",
  iniciales: "TE",
  moneda: "MXN",
  sellos_para_recompensa: 5,
  descripcion_recompensa: "Tapa de la casa gratis",
  portada_url:
    "https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=1200&q=80",
};

const filas = MENU_TASCA.map((item, i) => {
  const grupos = item.modifiers ?? null;
  return `    (${[
    lit(item.id),
    lit(item.nombre),
    lit(item.descripcion),
    String(item.precio),
    lit(item.categoria),
    lit(item.emoji),
    String(i),
    item.isPopular ? "true" : "false",
    json(grupos),
  ].join(", ")})`;
});

const resumen = MENU_TASCA.map((m) => {
  const grupos = m.modifiers ?? [];
  if (grupos.length === 0)
    return `--   ${m.nombre} — $${m.precio}  (${m.categoria})`;
  const detalle = grupos
    .map(
      (g) =>
        `${g.titulo} [${g.requerido ? "obligatorio" : "opcional"}, ${
          g.tipo === "multi" ? "varias" : "única"
        }]: ` +
        g.opciones
          .map((o) => `${o.nombre} +$${o.precio_extra ?? 0}`)
          .join(" | "),
    )
    .join("\n--       ");
  return `--   ${m.nombre} — $${m.precio}  (${m.categoria})\n--       ${detalle}`;
}).join("\n");

const sql = `-- ============================================================================
-- SEMBRAR EL MENÚ DE LA TASCA ESPAÑOLA
-- ----------------------------------------------------------------------------
-- ⚠️  ARCHIVO GENERADO. No lo edites a mano: se sobrescribe.
--     Fuente:  src/lib/menus/tasca-espanola.ts
--     Generar: node --experimental-strip-types scripts/generar-sql-tasca.ts
--
-- CÓMO SE EJECUTA
--   Supabase Dashboard > SQL Editor > pega todo esto > Run.
--
-- ES IDEMPOTENTE: se puede volver a ejecutar. Los platillos se resuelven por
-- (restaurante_id, slug), así que la segunda vez actualiza en lugar de duplicar.
-- No pisa el nombre, el color ni la portada del restaurante si ya los cambiaste.
--
-- LOS TAMAÑOS Y LOS EXTRAS NO SON PLATILLOS
-- "Sándwich Grande" no existe como producto: existe el Sándwich Clásico con la
-- opción Grande, que suma $30. Van en la columna \`modifiers\` del propio platillo,
-- así que el vínculo entre el platillo y sus opciones es la fila misma y no hay
-- ids que puedan quedar huérfanos. Es el modelo que ya leen el menú del comensal
-- y el editor del panel.
--
-- LO QUE SE INSERTA
${resumen}
-- ============================================================================

begin;


-- ----------------------------------------------------------------------------
-- 0) Columnas que el menú necesita
-- ----------------------------------------------------------------------------
-- Van aquí para que este archivo funcione por sí solo, aunque falte alguna
-- migración. Todas son \`if not exists\`: si ya las corriste, no hacen nada.
-- ----------------------------------------------------------------------------

alter table public.menu_items
  add column if not exists slug       text,
  add column if not exists emoji      text not null default '🍽️',
  add column if not exists modifiers  jsonb,
  add column if not exists is_popular boolean not null default false,
  add column if not exists video_url  text,
  add column if not exists media_type text;

alter table public.restaurantes
  add column if not exists eslogan        text,
  add column if not exists portada_url    text,
  add column if not exists color_primario text not null default '#DC2626',
  add column if not exists iniciales      text,
  add column if not exists categorias     jsonb not null default '[]'::jsonb;

-- El upsert de los platillos necesita este índice para su \`on conflict\`.
create unique index if not exists uniq_menu_slug_por_restaurante
  on public.menu_items (restaurante_id, slug);


-- ----------------------------------------------------------------------------
-- 1) El restaurante
-- ----------------------------------------------------------------------------
-- \`do nothing\`: si ya existe, se respeta lo que el dueño haya personalizado.
-- ----------------------------------------------------------------------------

insert into public.restaurantes (
  slug, nombre, eslogan, color_primario, iniciales, moneda,
  activo, sellos_para_recompensa, descripcion_recompensa, portada_url
) values (
  ${lit(RESTAURANTE.slug)},
  ${lit(RESTAURANTE.nombre)},
  ${lit(RESTAURANTE.eslogan)},
  ${lit(RESTAURANTE.color_primario)},
  ${lit(RESTAURANTE.iniciales)},
  ${lit(RESTAURANTE.moneda)},
  true,
  ${RESTAURANTE.sellos_para_recompensa},
  ${lit(RESTAURANTE.descripcion_recompensa)},
  ${lit(RESTAURANTE.portada_url)}
)
on conflict (slug) do nothing;


-- ----------------------------------------------------------------------------
-- 2) Las secciones, en el orden en que se leerán
-- ----------------------------------------------------------------------------

update public.restaurantes
   set categorias = ${json(CATEGORIAS_TASCA)}::jsonb
 where slug = ${lit(SLUG)};


-- ----------------------------------------------------------------------------
-- 3) Los platillos, con sus grupos de opciones
-- ----------------------------------------------------------------------------
-- Los valores van como texto y se castean en el \`select\`: así una fila nueva no
-- depende de que la primera adivine bien el tipo de la columna.
-- ----------------------------------------------------------------------------

insert into public.menu_items (
  restaurante_id, slug, nombre, descripcion, precio,
  categoria, emoji, orden, is_popular, modifiers, disponible
)
select
  r.id,
  d.slug,
  d.nombre,
  d.descripcion,
  d.precio::numeric(10,2),
  d.categoria,
  d.emoji,
  d.orden::integer,
  d.is_popular::boolean,
  d.modifiers::jsonb,
  true
from public.restaurantes r
cross join (
  values
${filas.join(",\n")}
) as d (slug, nombre, descripcion, precio, categoria, emoji, orden, is_popular, modifiers)
where r.slug = ${lit(SLUG)}
on conflict (restaurante_id, slug) do update
   set nombre      = excluded.nombre,
       descripcion = excluded.descripcion,
       precio      = excluded.precio,
       categoria   = excluded.categoria,
       emoji       = excluded.emoji,
       orden       = excluded.orden,
       is_popular  = excluded.is_popular,
       modifiers   = excluded.modifiers,
       disponible  = true;


commit;


-- ----------------------------------------------------------------------------
-- COMPROBACIÓN
-- ----------------------------------------------------------------------------
-- Esperado: ${MENU_TASCA.length} platillos, y los dos con grupos de opciones con su recargo.
-- ----------------------------------------------------------------------------

select m.categoria,
       count(*) as platillos
  from public.menu_items m
  join public.restaurantes r on r.id = m.restaurante_id
 where r.slug = ${lit(SLUG)}
 group by m.categoria
 order by min(m.orden);

select m.nombre,
       m.precio,
       g->>'titulo'                                as grupo,
       coalesce((g->>'requerido')::boolean, false) as obligatorio,
       g->>'tipo'                                  as seleccion,
       o->>'nombre'                                as opcion,
       coalesce((o->>'precio_extra')::numeric, 0)  as recargo
  from public.menu_items m
  join public.restaurantes r on r.id = m.restaurante_id
 cross join lateral jsonb_array_elements(m.modifiers) as g
 cross join lateral jsonb_array_elements(g->'opciones') as o
 where r.slug = ${lit(SLUG)}
 order by m.orden, g->>'titulo', o->>'nombre';
`;

const salida = new URL("../supabase/SEMBRAR-TASCA.sql", import.meta.url);
const { writeFileSync } = await import("node:fs");
writeFileSync(salida, sql);
console.log(
  `Generado supabase/SEMBRAR-TASCA.sql — ${MENU_TASCA.length} platillos, ${CATEGORIAS_TASCA.length} secciones.`,
);
