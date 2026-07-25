-- ============================================================================
-- MIGRACIÓN 004 — Arregla el índice que impedía guardar el menú
-- ----------------------------------------------------------------------------
-- Ejecutar en: Supabase Dashboard > SQL Editor. Idempotente.
--
-- SÍNTOMA
-- "Publicar en Supabase" creaba la fila del restaurante pero NO insertaba
-- ningún platillo. El diagnóstico mostraba:
--   4a. Restaurante "el-primo" — sembrado      ✅
--   4b. Platillos en el menú   — 0 platillo(s) ❌
--
-- CAUSA
-- La migración 001 creó el índice único como PARCIAL:
--
--   create unique index uniq_menu_slug_por_restaurante
--     on public.menu_items (restaurante_id, slug)
--     where slug is not null;              <-- el problema
--
-- El panel guarda con un UPSERT, que en Postgres es
-- `insert ... on conflict (restaurante_id, slug) do update`. Y Postgres solo
-- puede usar un índice PARCIAL como árbitro de ON CONFLICT si la sentencia
-- repite su predicado en un WHERE. PostgREST no lo hace (ni puede), así que el
-- upsert fallaba con:
--
--   42P10: there is no unique or exclusion constraint matching the
--          ON CONFLICT specification
--
-- SOLUCIÓN
-- El índice pasa a ser NO parcial. El `where slug is not null` era innecesario:
-- en un índice único de Postgres los NULL no colisionan entre sí (NULL nunca es
-- igual a NULL), así que las filas sin slug siguen permitiéndose sin necesidad
-- del predicado.
-- ============================================================================

drop index if exists public.uniq_menu_slug_por_restaurante;

create unique index if not exists uniq_menu_slug_por_restaurante
  on public.menu_items (restaurante_id, slug);

-- ============================================================================
-- COMPROBACIÓN
-- ----------------------------------------------------------------------------
-- La columna `indexdef` NO debe contener "WHERE".
-- ============================================================================
select indexname, indexdef
  from pg_indexes
 where schemaname = 'public'
   and indexname = 'uniq_menu_slug_por_restaurante';
