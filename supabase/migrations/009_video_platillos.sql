-- ============================================================================
-- MIGRACIÓN 009 — Video opcional por platillo
-- ----------------------------------------------------------------------------
-- Ejecutar en: Supabase Dashboard > SQL Editor. Idempotente.
--
-- QUÉ AÑADE
-- Una columna `video_url` en `menu_items`. El platillo CONSERVA su `imagen_url`:
-- el video no la sustituye, la complementa.
--
-- POR QUÉ SIGUEN LAS DOS
--   1. La imagen se usa como `poster` del video, para que no se vea un cuadro
--      negro mientras carga.
--   2. Es el respaldo si el video falla, si el navegador no lo soporta o si el
--      usuario tiene el ahorro de datos activado.
-- Guardar solo el video obligaría a extraer un fotograma en el cliente, que es
-- lento y no siempre posible.
--
-- SOBRE EL ALMACENAMIENTO
-- Aquí se guarda una URL, no el archivo. Un video en base64 dentro de una
-- columna de texto haría que cada lectura del menú arrastrase megabytes por
-- platillo. Lo correcto es subirlo a Supabase Storage (o a un CDN) y guardar el
-- enlace.
-- ============================================================================

alter table public.menu_items
  add column if not exists video_url text;

-- ----------------------------------------------------------------------------
-- COMPROBACIÓN
-- ----------------------------------------------------------------------------
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'menu_items'
   and column_name in ('imagen_url', 'video_url')
 order by column_name;
