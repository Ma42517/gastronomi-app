-- ============================================================================
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
-- opción Grande, que suma $30. Van en la columna `modifiers` del propio platillo,
-- así que el vínculo entre el platillo y sus opciones es la fila misma y no hay
-- ids que puedan quedar huérfanos. Es el modelo que ya leen el menú del comensal
-- y el editor del panel.
--
-- LO QUE SE INSERTA
--   Sándwich Clásico — $95  (Sandwich)
--       Tamaño [obligatorio, única]: Mediano +$0 | Grande +$30
--       Extras [opcional, varias]: Con doble carne +$45 | Con 4 quesos +$35 | Con jamón +$25
--   Hamburguesa Clásica — $115  (Hamburguesa)
--       Tamaño [obligatorio, única]: Mediana +$0 | Grande +$40
--       Extras [opcional, varias]: Con doble carne +$55 | Con 4 quesos +$40 | Con jamón +$30
--   Tortilla de patata — $110  (Platos de Entrada)
--   Jamón Ibérico — $220  (Platos de Entrada)
--   Salmorejo cordobés — $95  (Platos de Entrada)
--   Gazpacho andaluz — $90  (Platos de Entrada)
--   Paella — $250  (Platos de Entrada)
--   Cerveza Lager — $45  (Bebidas)
--   Lager extra — $55  (Bebidas)
--   Cerveza Ales — $65  (Bebidas)
--   Cerveza negra — $60  (Bebidas)
--   Rubia — $50  (Bebidas)
-- ============================================================================

begin;


-- ----------------------------------------------------------------------------
-- 0) Columnas que el menú necesita
-- ----------------------------------------------------------------------------
-- Van aquí para que este archivo funcione por sí solo, aunque falte alguna
-- migración. Todas son `if not exists`: si ya las corriste, no hacen nada.
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

-- El upsert de los platillos necesita este índice para su `on conflict`.
create unique index if not exists uniq_menu_slug_por_restaurante
  on public.menu_items (restaurante_id, slug);


-- ----------------------------------------------------------------------------
-- 1) El restaurante
-- ----------------------------------------------------------------------------
-- `do nothing`: si ya existe, se respeta lo que el dueño haya personalizado.
-- ----------------------------------------------------------------------------

insert into public.restaurantes (
  slug, nombre, eslogan, color_primario, iniciales, moneda,
  activo, sellos_para_recompensa, descripcion_recompensa, portada_url
) values (
  'tasca-espanola',
  'La Tasca Española',
  'Cocina española de siempre',
  '#C8102E',
  'TE',
  'MXN',
  true,
  5,
  'Tapa de la casa gratis',
  'https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=1200&q=80'
)
on conflict (slug) do nothing;


-- ----------------------------------------------------------------------------
-- 2) Las secciones, en el orden en que se leerán
-- ----------------------------------------------------------------------------

update public.restaurantes
   set categorias = '["Platos de Entrada","Sandwich","Hamburguesa","Bebidas"]'::jsonb
 where slug = 'tasca-espanola';


-- ----------------------------------------------------------------------------
-- 3) Los platillos, con sus grupos de opciones
-- ----------------------------------------------------------------------------
-- Los valores van como texto y se castean en el `select`: así una fila nueva no
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
    ('sandwich-clasico', 'Sándwich Clásico', 'Pan artesano, con opción de tamaño mediano o grande y extras de carne, quesos o jamón.', 95, 'Sandwich', '🥪', 0, false, '[{"id":"tamano","titulo":"Tamaño","tipo":"single","requerido":true,"opciones":[{"id":"mediano","nombre":"Mediano","precio_extra":0},{"id":"grande","nombre":"Grande","precio_extra":30}]},{"id":"extras","titulo":"Extras","tipo":"multi","requerido":false,"opciones":[{"id":"doble-carne","nombre":"Con doble carne","precio_extra":45},{"id":"cuatro-quesos","nombre":"Con 4 quesos","precio_extra":35},{"id":"jamon","nombre":"Con jamón","precio_extra":25}]}]'),
    ('hamburguesa-clasica', 'Hamburguesa Clásica', 'Carne a la parrilla en pan brioche, con opción de tamaño y extras.', 115, 'Hamburguesa', '🍔', 1, false, '[{"id":"tamano","titulo":"Tamaño","tipo":"single","requerido":true,"opciones":[{"id":"mediano","nombre":"Mediana","precio_extra":0},{"id":"grande","nombre":"Grande","precio_extra":40}]},{"id":"extras","titulo":"Extras","tipo":"multi","requerido":false,"opciones":[{"id":"doble-carne","nombre":"Con doble carne","precio_extra":55},{"id":"cuatro-quesos","nombre":"Con 4 quesos","precio_extra":40},{"id":"jamon","nombre":"Con jamón","precio_extra":30}]}]'),
    ('tortilla-patata', 'Tortilla de patata', 'Patata, huevo y cebolla, cuajada al punto.', 110, 'Platos de Entrada', '🥘', 2, false, null),
    ('jamon-iberico', 'Jamón Ibérico', 'Cortado a cuchillo, con pan de cristal.', 220, 'Platos de Entrada', '🍖', 3, false, null),
    ('salmorejo-cordobes', 'Salmorejo cordobés', 'Tomate, pan, aceite de oliva y ajo. Se sirve frío.', 95, 'Platos de Entrada', '🍅', 4, false, null),
    ('gazpacho-andaluz', 'Gazpacho andaluz', 'Sopa fría de tomate, pepino, pimiento y aceite de oliva.', 90, 'Platos de Entrada', '🥒', 5, false, null),
    ('paella', 'Paella', 'Arroz con azafrán, cocinado a fuego lento en su paellera.', 250, 'Platos de Entrada', '🥘', 6, true, null),
    ('cerveza-lager', 'Cerveza Lager', 'Rubia ligera, bien fría.', 45, 'Bebidas', '🍺', 7, false, null),
    ('lager-extra', 'Lager extra', 'Lager de mayor cuerpo y graduación.', 55, 'Bebidas', '🍺', 8, false, null),
    ('cerveza-ales', 'Cerveza Ales', 'Fermentación alta, con notas afrutadas.', 65, 'Bebidas', '🍺', 9, false, null),
    ('cerveza-negra', 'Cerveza negra', 'Malta tostada, con cuerpo y final a café.', 60, 'Bebidas', '🍺', 10, false, null),
    ('rubia', 'Rubia', 'Suave y refrescante, la de siempre.', 50, 'Bebidas', '🍺', 11, false, null)
) as d (slug, nombre, descripcion, precio, categoria, emoji, orden, is_popular, modifiers)
where r.slug = 'tasca-espanola'
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
-- Esperado: 12 platillos, y los dos con grupos de opciones con su recargo.
-- ----------------------------------------------------------------------------

select m.categoria,
       count(*) as platillos
  from public.menu_items m
  join public.restaurantes r on r.id = m.restaurante_id
 where r.slug = 'tasca-espanola'
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
 where r.slug = 'tasca-espanola'
 order by m.orden, g->>'titulo', o->>'nombre';
