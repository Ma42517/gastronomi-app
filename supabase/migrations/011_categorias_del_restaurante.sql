-- ============================================================================
-- MIGRACIÓN 011 — Categorías propias del restaurante
-- ----------------------------------------------------------------------------
-- Ejecutar en: Supabase Dashboard > SQL Editor. Idempotente.
--
-- QUÉ AÑADE
--   `restaurantes.categorias`: la lista de secciones del menú, en su orden.
--
-- POR QUÉ HACE FALTA UNA COLUMNA
-- Hasta ahora las categorías no existían como dato: se DEDUCÍAN leyendo el campo
-- `categoria` de cada platillo. Eso funciona para mostrar el menú, pero tiene dos
-- límites que impiden que el restaurantero las gestione:
--
--   1. Una categoría vacía no existe. Al crear "Postres" no habría dónde
--      guardarla, así que desaparecería en cuanto se recargara la página — antes
--      incluso de poder meterle su primer platillo.
--   2. No hay orden. El de hoy sale de una plantilla del código, igual para
--      todos los restaurantes, así que una taquería no puede poner sus tacos
--      antes que sus bebidas.
--
-- POR QUÉ UNA LISTA Y NO UNA TABLA
-- Una tabla `categorias` con su clave ajena sería lo canónico, pero obligaría a
-- migrar el `categoria` de texto que ya llevan todos los platillos a un id, y a
-- mantener las dos cosas en sincronía durante la transición. Para una lista de
-- entre cinco y quince nombres por restaurante, que se lee entera siempre y nunca
-- se consulta por separado, el coste no se justifica.
--
-- CÓMO CONVIVEN LAS DOS FUENTES
-- El menú muestra la UNIÓN de esta lista y las categorías que aparecen en los
-- platillos. Así una carta que ya existía sigue viéndose igual sin haber tocado
-- nada, y esta columna solo añade las vacías y el orden.
-- ============================================================================

alter table public.restaurantes
  add column if not exists categorias jsonb not null default '[]'::jsonb;


comment on column public.restaurantes.categorias is
  'Secciones del menú en su orden, como lista de textos. Se une con las categorías que ya tengan los platillos.';


-- Se rellena con lo que ya hay, para que el orden actual no se pierda al
-- empezar a usarla. Solo toca las filas que la tengan vacía: volver a ejecutar
-- este archivo no reordena lo que el dueño haya organizado después.
update public.restaurantes r
   set categorias = coalesce(
         (
           select jsonb_agg(c.categoria order by c.orden_min)
             from (
               select m.categoria, min(m.orden) as orden_min
                 from public.menu_items m
                where m.restaurante_id = r.id
                  and m.categoria is not null
                group by m.categoria
             ) c
         ),
         '[]'::jsonb
       )
 where r.categorias = '[]'::jsonb;


-- ----------------------------------------------------------------------------
-- COMPROBACIÓN
-- ----------------------------------------------------------------------------
select nombre, categorias
  from public.restaurantes
 order by nombre;
