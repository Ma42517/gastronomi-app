-- ============================================================================
-- MIGRACIÓN 003 — Endurecer permisos del rol público (opcional, recomendada)
-- ----------------------------------------------------------------------------
-- Ejecutar en: Supabase Dashboard > SQL Editor. Idempotente.
--
-- POR QUÉ
-- Los permisos por defecto de Supabase conceden a `anon` y `authenticated` más
-- de lo necesario. Al revisar los grants aplicados aparecía esto:
--
--   anon | menu_items | REFERENCES, SELECT, TRIGGER, TRUNCATE
--
-- El problemático es TRUNCATE: vacía la tabla completa y ROW LEVEL SECURITY NO
-- LO BLOQUEA. RLS filtra filas en SELECT/INSERT/UPDATE/DELETE, pero TRUNCATE
-- actúa sobre la tabla entera y se salta las políticas. Un rol público con
-- TRUNCATE puede, en teoría, borrar el menú de un restaurante.
--
-- Hoy el riesgo real es bajo porque la Data API (PostgREST) no expone TRUNCATE,
-- así que no es explotable desde el navegador. Pero es un privilegio sin ningún
-- motivo para existir: si mañana se añade una función RPC, un trigger o se abre
-- una conexión directa, deja de ser teórico.
--
-- Este script deja a los roles públicos SOLO con SELECT, que es lo único que la
-- vista cliente necesita para leer la carta.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Catálogo: los roles públicos se quedan solo con lectura
-- ----------------------------------------------------------------------------
revoke truncate, trigger, references, insert, update, delete
  on public.restaurantes from anon, authenticated;

revoke truncate, trigger, references, insert, update, delete
  on public.menu_items from anon, authenticated;

revoke truncate, trigger, references, insert, update, delete
  on public.mesas from anon, authenticated;

-- Se reafirma la lectura, que es lo único que debe quedar.
grant select on public.restaurantes to anon, authenticated;
grant select on public.menu_items  to anon, authenticated;
grant select on public.mesas       to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Tablas de operación: nada para los roles públicos
-- ----------------------------------------------------------------------------
-- Cuentas abiertas, consumos y sellos. Cuando se implementen las órdenes desde
-- el cliente se concederá el permiso mínimo de cada operación, no antes.
revoke all on public.sesiones_mesa         from anon, authenticated;
revoke all on public.orden_items           from anon, authenticated;
revoke all on public.transacciones_lealtad from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Tablas futuras: que no vuelvan a nacer con permisos de más
-- ----------------------------------------------------------------------------
alter default privileges in schema public
  revoke truncate, trigger, references, insert, update, delete
  on tables from anon, authenticated;

-- ============================================================================
-- COMPROBACIÓN
-- ----------------------------------------------------------------------------
-- Esperado: anon y authenticated solo con SELECT en las tres tablas del
-- catálogo, y sin ninguna fila para las tablas de operación.
-- ============================================================================
select grantee,
       table_name,
       string_agg(privilege_type, ', ' order by privilege_type) as permisos
  from information_schema.role_table_grants
 where table_schema = 'public'
   and grantee in ('anon', 'authenticated')
 group by grantee, table_name
 order by table_name, grantee;
