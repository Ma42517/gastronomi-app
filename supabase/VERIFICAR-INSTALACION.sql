-- ============================================================================
-- DIAGNÓSTICO — ¿está la base de datos lista para gastronomi-app?
-- ----------------------------------------------------------------------------
-- Pega este archivo en: Supabase > SQL Editor > New query > Run.
-- NO modifica nada: solo mira y reporta. Es 100 % seguro de ejecutar.
--
-- Devuelve una lista de comprobaciones con ✅ (bien) o ❌ / ⚠️ (algo falta),
-- y en la columna "que_hacer" te dice el siguiente paso.
--
-- NOTA: este bloque solo consulta `information_schema` y los catálogos de
-- Postgres, nunca las tablas de la app. Así funciona incluso si las tablas
-- todavía no existen (si consultara `menu_items` directamente, fallaría con
-- "relation does not exist" y no verías el diagnóstico).
-- ============================================================================

select 'A) Tablas base' as verificacion,
       case when count(*) = 6
            then '✅ OK (6 de 6)'
            else '❌ Solo ' || count(*) || ' de 6' end as estado,
       case when count(*) = 6
            then 'Nada, todo bien'
            else 'Corre INSTALACION-COMPLETA.sql' end as que_hacer
  from information_schema.tables
 where table_schema = 'public'
   and table_name in ('restaurantes','mesas','menu_items',
                      'sesiones_mesa','orden_items','transacciones_lealtad')

union all

select 'B) Columnas del panel en menu_items',
       case when count(*) = 4
            then '✅ OK (4 de 4)'
            else '❌ Solo ' || count(*) || ' de 4' end,
       case when count(*) = 4
            then 'Nada, todo bien'
            else 'Falta la migracion 001 (slug, emoji, modifiers, is_popular)' end
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'menu_items'
   and column_name in ('slug','emoji','modifiers','is_popular')

union all

select 'C) Columnas del panel en restaurantes',
       case when count(*) = 5
            then '✅ OK (5 de 5)'
            else '❌ Solo ' || count(*) || ' de 5' end,
       case when count(*) = 5
            then 'Nada, todo bien'
            else 'Falta la migracion 001 (imagen_premio, eslogan, portada_url, color_primario, iniciales)' end
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'restaurantes'
   and column_name in ('imagen_premio','eslogan','portada_url',
                       'color_primario','iniciales')

union all

-- Sin este índice el botón "Guardar" del panel duplicaría platillos en lugar
-- de actualizarlos: el upsert se resuelve por (restaurante_id, slug).
select 'D) Indice unico del slug',
       case when count(*) = 1 then '✅ OK' else '❌ Falta' end,
       case when count(*) = 1
            then 'Nada, todo bien'
            else 'Sin el, guardar duplicaria platillos. Corre la migracion 001' end
  from pg_indexes
 where schemaname = 'public'
   and indexname = 'uniq_menu_slug_por_restaurante'

union all

-- La política vieja filtraba `disponible = true`, lo que hacía desaparecer del
-- panel los platillos agotados e impedía reactivarlos.
select 'E) Lectura del menu sin filtro de agotados',
       case when count(*) = 1 then '✅ OK' else '❌ Falta o desactualizada' end,
       case when count(*) = 1
            then 'Nada, todo bien'
            else 'Corre la migracion 001 para poder reactivar platillos agotados' end
  from pg_policies
 where schemaname = 'public'
   and tablename = 'menu_items'
   and policyname = 'lectura publica menu'
   and qual = 'true'

union all

-- Comprobación de SEGURIDAD: la anon key viaja en el navegador. Si existiera
-- una política de escritura pública, cualquiera podría editar el menú.
select 'F) Escritura publica bloqueada (seguridad)',
       case when count(*) = 0
            then '✅ OK — nadie puede escribir con la anon key'
            else '⚠️ Hay ' || count(*) || ' politica(s) de escritura publica' end,
       case when count(*) = 0
            then 'Nada, todo bien'
            else 'REVISAR: cualquiera podria editar tu menu desde el navegador' end
  from pg_policies
 where schemaname = 'public'
   and tablename in ('menu_items','restaurantes')
   and cmd <> 'SELECT'

union all

select 'G) RLS activado',
       case when count(*) = 6
            then '✅ OK (6 de 6)'
            else '⚠️ Solo ' || count(*) || ' de 6 tablas con RLS' end,
       case when count(*) = 6
            then 'Nada, todo bien'
            else 'Corre INSTALACION-COMPLETA.sql' end
  from pg_tables
 where schemaname = 'public'
   and rowsecurity = true
   and tablename in ('restaurantes','mesas','menu_items',
                     'sesiones_mesa','orden_items','transacciones_lealtad')

order by verificacion;
