-- ============================================================================
-- MIGRACIÓN 010 — Almacenamiento de multimedia y personalización por restaurante
-- ----------------------------------------------------------------------------
-- Ejecutar en: Supabase Dashboard > SQL Editor. Idempotente.
--
-- QUÉ AÑADE
--   1. Dos buckets públicos de Storage: `restaurant-media` (portadas, logos) y
--      `dish-media` (fotos y videos de platillos).
--   2. Cuatro columnas de personalización en `restaurantes`.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. COLUMNAS DE PERSONALIZACIÓN
-- ----------------------------------------------------------------------------
-- ⚠️ SOBRE LOS VALORES POR DEFECTO
-- `menu_layout` arranca en 'grid' y NO en 'list'. Puede parecer arbitrario, pero
-- es lo único que no rompe nada: el menú del comensal YA se pinta en dos
-- columnas hoy. Si el valor por defecto fuera 'list', esta migración cambiaría
-- en silencio el aspecto del menú de TODOS los restaurantes que ya existen, que
-- es exactamente lo contrario de lo que se pide.
--
-- Lo mismo con `header_style`: 'solid' es el comportamiento actual.
alter table public.restaurantes
  add column if not exists header_style     text not null default 'solid',
  add column if not exists menu_layout      text not null default 'grid',
  add column if not exists whatsapp_number  text,
  add column if not exists instagram_url    text;


-- Las restricciones se añaden por separado y comprobando antes si existen:
-- `add constraint` no admite `if not exists`, así que sin esto la segunda
-- ejecución del archivo fallaría.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'restaurantes_header_style_check'
  ) then
    alter table public.restaurantes
      add constraint restaurantes_header_style_check
      check (header_style in ('solid', 'glass'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'restaurantes_menu_layout_check'
  ) then
    alter table public.restaurantes
      add constraint restaurantes_menu_layout_check
      check (menu_layout in ('list', 'grid'));
  end if;
end $$;


comment on column public.restaurantes.header_style is
  'Aspecto del encabezado del menú: solid (actual) o glass (translúcido).';
comment on column public.restaurantes.menu_layout is
  'Agrupación de los platillos: grid (dos columnas, actual) o list (una).';
comment on column public.restaurantes.whatsapp_number is
  'Teléfono en formato internacional sin signos, p. ej. 5215512345678.';
comment on column public.restaurantes.instagram_url is
  'Perfil completo (https://instagram.com/…) o solo el usuario.';


-- ----------------------------------------------------------------------------
-- 2. BUCKETS DE STORAGE
-- ----------------------------------------------------------------------------
-- `public = true`: las fotos y videos del menú son contenido público (los ve
-- cualquier comensal sin sesión), así que se sirven por URL directa y no hace
-- falta firmar cada lectura.
--
-- ⚠️ LOS LÍMITES DE AQUÍ SON LA ÚNICA DEFENSA REAL
-- La subida la hace el NAVEGADOR contra Storage, usando una URL firmada que
-- genera el servidor (ver src/app/api/admin/subir/route.ts). Eso evita el tope
-- de 4.5 MB que tienen las funciones de Vercel, pero significa que el archivo
-- nunca pasa por nuestro código: la validación que hace el navegador es una
-- comodidad para el usuario, no una barrera. Quien quisiera saltársela solo
-- tendría que llamar a la URL firmada a mano. `file_size_limit` y
-- `allowed_mime_types` sí se aplican en el servidor de Storage.
--
-- NO se crea ninguna política de escritura pública sobre storage.objects: sin
-- una URL firmada por nuestro servidor no se puede subir nada. Una política
-- abierta convertiría los buckets en alojamiento gratis para cualquiera.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'dish-media',
    'dish-media',
    true,
    52428800, -- 50 MB: suficiente para un clip corto de platillo en buena calidad
    array[
      'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif',
      'video/mp4', 'video/webm', 'video/quicktime'
    ]
  ),
  (
    'restaurant-media',
    'restaurant-media',
    true,
    26214400, -- 25 MB: aquí solo van portadas y logos
    array[
      'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif',
      'video/mp4', 'video/webm', 'video/quicktime'
    ]
  )
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- ----------------------------------------------------------------------------
-- COMPROBACIÓN
-- ----------------------------------------------------------------------------
select column_name, data_type, column_default
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'restaurantes'
   and column_name in ('header_style', 'menu_layout', 'whatsapp_number', 'instagram_url')
 order by column_name;

select id, public, file_size_limit
  from storage.buckets
 where id in ('dish-media', 'restaurant-media')
 order by id;
