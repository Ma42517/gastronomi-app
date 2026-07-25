-- ============================================================================
-- MIGRACIÓN 002 — Permisos de la Data API (arregla "permission denied")
-- ----------------------------------------------------------------------------
-- Ejecutar en: Supabase Dashboard > SQL Editor. Idempotente.
--
-- POR QUÉ HACE FALTA
-- Supabase cambió el comportamiento por defecto: en los proyectos nuevos, las
-- tablas creadas en el esquema `public` ya NO se exponen automáticamente a la
-- Data API. Hace falta un GRANT explícito por tabla y rol.
--   https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
--
-- Sin estos permisos, cualquier consulta falla con:
--   permission denied for table restaurantes   (código 42501)
--
-- OJO: GRANT y RLS son DOS capas distintas y ambas tienen que dejar pasar.
--   - GRANT dice "este rol puede tocar esta tabla".
--   - RLS dice "y solo estas filas".
-- Dar SELECT a `anon` NO abre la base de datos: RLS sigue filtrando, y las
-- tablas sin política de lectura para `anon` continúan siendo invisibles.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Acceso al esquema
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. CATÁLOGO PÚBLICO — solo lectura
-- ----------------------------------------------------------------------------
-- Lo que la vista cliente necesita leer sin login. RLS ya limita las filas
-- (restaurantes/menu_items tienen política de lectura; mesas solo las activas).
grant select on public.restaurantes to anon, authenticated;
grant select on public.menu_items  to anon, authenticated;
grant select on public.mesas       to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. OPERACIÓN — de momento solo el servidor
-- ----------------------------------------------------------------------------
-- Estas tablas guardan cuentas abiertas, consumos y sellos: no se le da nada a
-- `anon`. Cuando se implementen las órdenes desde el cliente, se abrirán con la
-- política y el grant mínimos que cada operación necesite, no antes.
grant select, insert, update, delete on public.sesiones_mesa         to service_role;
grant select, insert, update, delete on public.orden_items           to service_role;
grant select, insert, update, delete on public.transacciones_lealtad to service_role;

-- ----------------------------------------------------------------------------
-- 4. PANEL ADMINISTRADOR — escritura del menú
-- ----------------------------------------------------------------------------
-- Lo que usan las rutas /api/admin/* con la Secret key. Es el permiso que
-- faltaba para que "Publicar en Supabase" y "Guardar" funcionen.
grant select, insert, update, delete on public.restaurantes to service_role;
grant select, insert, update, delete on public.menu_items   to service_role;
grant select, insert, update, delete on public.mesas        to service_role;

-- Las secuencias son necesarias para los INSERT en tablas con columnas serial.
grant usage, select on all sequences in schema public to service_role;

-- ----------------------------------------------------------------------------
-- 5. TABLAS FUTURAS
-- ----------------------------------------------------------------------------
-- Sin esto, cada tabla nueva volvería a fallar con "permission denied" y habría
-- que recordar el GRANT a mano. `alter default privileges` lo automatiza.
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;

alter default privileges in schema public
  grant usage, select on sequences to service_role;

-- ============================================================================
-- COMPROBACIÓN
-- ----------------------------------------------------------------------------
-- Debe devolver filas para service_role en restaurantes y menu_items.
-- ============================================================================
select grantee, table_name, string_agg(privilege_type, ', ' order by privilege_type) as permisos
  from information_schema.role_table_grants
 where table_schema = 'public'
   and grantee in ('anon', 'authenticated', 'service_role')
   and table_name in ('restaurantes', 'menu_items')
 group by grantee, table_name
 order by table_name, grantee;
