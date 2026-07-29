-- ============================================================================
-- MIGRACIÓN 010 — Almacenamiento de multimedia y personalización por restaurante
-- ----------------------------------------------------------------------------
-- Ejecutar en: Supabase Dashboard > SQL Editor. Idempotente.
--
-- QUÉ AÑADE
--   1. Cuatro columnas de personalización en `restaurantes`.
--   2. `media_type` en `menu_items`: cómo hay que PINTAR su multimedia.
--   3. Dos buckets públicos de Storage y sus políticas de acceso.
--
-- ⚠️ LOS BUCKETS TAMBIÉN SE CREAN SOLOS
-- La aplicación crea el bucket que falte en la primera subida, con la llave de
-- servicio (ver src/lib/supabase/buckets.ts). Esta parte del SQL existe para
-- dejarlo explícito y versionado, no porque haga falta correrla: si el bloque de
-- Storage falla por permisos, avisa y NO aborta el resto del archivo. Antes un
-- error ahí dejaba las columnas sin crear, que es lo que de verdad importa.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. PERSONALIZACIÓN DEL RESTAURANTE
-- ----------------------------------------------------------------------------
-- ⚠️ SOBRE LOS VALORES POR DEFECTO
-- `menu_layout` arranca en 'grid' y NO en 'list'. Puede parecer arbitrario, pero
-- es lo único que no rompe nada: el menú del comensal YA se pinta en dos
-- columnas hoy. Si el valor por defecto fuera 'list', esta migración cambiaría
-- en silencio el aspecto del menú de TODOS los restaurantes que ya existen.
-- Lo mismo con `header_style`: 'solid' es el comportamiento actual.
alter table public.restaurantes
  add column if not exists header_style     text not null default 'solid',
  add column if not exists menu_layout      text not null default 'grid',
  add column if not exists whatsapp_number  text,
  add column if not exists instagram_url    text;


-- ----------------------------------------------------------------------------
-- 2. TIPO DE MULTIMEDIA DEL PLATILLO
-- ----------------------------------------------------------------------------
-- Acompaña a `video_url` (migración 009), que guarda el enlace. Esta columna
-- dice CÓMO pintarlo, porque el mismo campo puede llevar un video o un GIF y la
-- etiqueta HTML no es la misma:
--
--   'video_file' -> archivo de video subido        -> <video autoplay loop muted>
--   'gif_file'   -> GIF subido                     -> <img>
--   'media_url'  -> enlace externo, de cualquiera  -> se deduce de la extensión
--
-- Se admite NULL: los platillos que ya existen no tienen tipo declarado y se
-- siguen tratando como hasta ahora (video si hay `video_url`, foto si no).
alter table public.menu_items
  add column if not exists media_type text;


-- Las restricciones van aparte y comprobando antes si existen: `add constraint`
-- no admite `if not exists`, así que sin esto la segunda ejecución fallaría.
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

  if not exists (
    select 1 from pg_constraint where conname = 'menu_items_media_type_check'
  ) then
    alter table public.menu_items
      add constraint menu_items_media_type_check
      check (
        media_type is null
        or media_type in ('video_file', 'gif_file', 'media_url')
      );
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
comment on column public.menu_items.media_type is
  'Cómo pintar video_url: video_file, gif_file o media_url. NULL = heredado.';


-- ----------------------------------------------------------------------------
-- 3. BUCKETS DE STORAGE Y SUS POLÍTICAS
-- ----------------------------------------------------------------------------
-- Todo el bloque va dentro de un DO con captura de excepciones. Crear buckets y
-- políticas sobre `storage.objects` exige privilegios que no todos los roles
-- tienen; si esto falla, el script debe seguir y dejar las columnas creadas, no
-- abortar a mitad.
do $$
begin
  -- --- 3a. Buckets ---
  -- `public = true`: las fotos y videos del menú los ve cualquier comensal sin
  -- sesión, así que se sirven por URL directa sin firmar cada lectura.
  --
  -- Los límites de aquí son la ÚNICA defensa real de tamaño y formato: la subida
  -- la hace el navegador contra Storage con una URL firmada por el servidor, así
  -- que el archivo nunca pasa por nuestro código y lo que valide el navegador es
  -- una comodidad, no una barrera.
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values
    (
      'dish-media',
      'dish-media',
      true,
      52428800, -- 50 MB: un clip corto de platillo en buena calidad
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

  raise notice 'Buckets dish-media y restaurant-media listos.';

exception
  when insufficient_privilege then
    raise notice 'Sin privilegios para crear los buckets. No importa: la aplicación los crea sola en la primera subida.';
  when others then
    raise notice 'No se pudieron configurar los buckets (%). La aplicación los crea sola en la primera subida.', sqlerrm;
end $$;


-- Políticas de acceso a los objetos.
--
-- ¿POR QUÉ HAY POLÍTICAS SI LA APP SUBE CON LA LLAVE DE SERVICIO?
-- La llave de servicio se salta la RLS, así que la subida por URL firmada
-- funciona con o sin estas políticas. Se declaran igualmente por dos motivos:
-- dejan el permiso explícito en el repositorio en lugar de depender de la
-- casilla "public" del panel, y permiten que en el futuro un cliente
-- autenticado suba directo sin pasar por el servidor.
--
-- La escritura se limita a `authenticated`: NUNCA a `anon`. Con `anon` cualquiera
-- que leyera la llave pública del bundle podría usar el almacenamiento como
-- alojamiento gratis.
do $$
begin
  drop policy if exists "nom media lectura publica" on storage.objects;
  create policy "nom media lectura publica"
    on storage.objects for select
    using (bucket_id in ('dish-media', 'restaurant-media'));

  drop policy if exists "nom media alta autenticada" on storage.objects;
  create policy "nom media alta autenticada"
    on storage.objects for insert to authenticated
    with check (bucket_id in ('dish-media', 'restaurant-media'));

  drop policy if exists "nom media cambio autenticado" on storage.objects;
  create policy "nom media cambio autenticado"
    on storage.objects for update to authenticated
    using (bucket_id in ('dish-media', 'restaurant-media'));

  drop policy if exists "nom media baja autenticada" on storage.objects;
  create policy "nom media baja autenticada"
    on storage.objects for delete to authenticated
    using (bucket_id in ('dish-media', 'restaurant-media'));

  raise notice 'Políticas de Storage aplicadas.';

exception
  when insufficient_privilege then
    raise notice 'Sin privilegios para las políticas de storage.objects. La subida sigue funcionando: usa la llave de servicio, que no pasa por RLS.';
  when others then
    raise notice 'No se pudieron aplicar las políticas de Storage (%).', sqlerrm;
end $$;


-- ----------------------------------------------------------------------------
-- COMPROBACIÓN
-- ----------------------------------------------------------------------------
select column_name, data_type, column_default
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'restaurantes'
   and column_name in ('header_style', 'menu_layout', 'whatsapp_number', 'instagram_url')
 order by column_name;

select column_name, data_type
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'menu_items'
   and column_name in ('video_url', 'media_type')
 order by column_name;

select id, public, file_size_limit
  from storage.buckets
 where id in ('dish-media', 'restaurant-media')
 order by id;
