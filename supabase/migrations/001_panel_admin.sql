-- ============================================================================
-- MIGRACIÓN 001 — Soporte para el Panel Administrador
-- ----------------------------------------------------------------------------
-- Ejecutar en: Supabase Dashboard > SQL Editor, DESPUÉS de `schema.sql`.
-- Es idempotente: se puede correr varias veces sin romper nada.
--
-- Cierra cuatro huecos entre el esquema base y lo que la app necesita:
--   1. `menu_items` no tenía `slug`, `emoji`, `modifiers` ni `is_popular`.
--   2. `restaurantes` no guardaba la imagen del premio ni el tema visual.
--   3. La política de lectura del menú filtraba `disponible = true`, así que el
--      panel del dueño NO podía ver sus propios platillos agotados.
--   4. No existía forma de leer el menú completo sin autenticación.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. MENU_ITEMS — columnas que faltaban
-- ----------------------------------------------------------------------------

-- `slug`: identificador ESTABLE y legible del platillo ("t-pastor", "p-flan").
-- Es imprescindible: la tabla de maridajes de la app está indexada por estos
-- ids, y el platillo héroe se localiza por "h-ribeye". El uuid sigue siendo la
-- llave primaria (las órdenes lo referencian), pero la app usa el slug.
alter table public.menu_items
  add column if not exists slug text;

-- Emoji de respaldo cuando la foto no carga.
alter table public.menu_items
  add column if not exists emoji text not null default '🍽️';

-- Grupos de modificadores (salsas, término, guarnición) tal como los edita el
-- panel. Se guarda como jsonb: su forma la define la app, no la base de datos,
-- y así el dueño puede inventar grupos nuevos sin migraciones.
alter table public.menu_items
  add column if not exists modifiers jsonb;

-- Aparece en el carrusel "Populares" de la vista cliente.
alter table public.menu_items
  add column if not exists is_popular boolean not null default false;

-- Un slug no puede repetirse dentro del mismo restaurante (sí entre distintos).
create unique index if not exists uniq_menu_slug_por_restaurante
  on public.menu_items (restaurante_id, slug)
  where slug is not null;

-- ----------------------------------------------------------------------------
-- 2. RESTAURANTES — premio y tema visual
-- ----------------------------------------------------------------------------
alter table public.restaurantes
  add column if not exists imagen_premio text;

alter table public.restaurantes
  add column if not exists eslogan text;

alter table public.restaurantes
  add column if not exists portada_url text;

alter table public.restaurantes
  add column if not exists color_primario text not null default '#DC2626';

alter table public.restaurantes
  add column if not exists iniciales text;

-- ----------------------------------------------------------------------------
-- 3. RLS — lectura del catálogo
-- ----------------------------------------------------------------------------
-- El menú de un restaurante es información PÚBLICA (está impreso en la carta),
-- así que se permite leerlo completo, incluidos los platillos agotados: el
-- cliente los ve en gris y el panel necesita listarlos para reactivarlos.
--
-- La política anterior filtraba `disponible = true`, lo que provocaba que un
-- platillo marcado como agotado desapareciera también del panel del dueño y
-- fuera imposible volver a activarlo.
drop policy if exists "lectura publica menu" on public.menu_items;
create policy "lectura publica menu"
  on public.menu_items for select using (true);

-- Igual para el restaurante: se necesita leer su configuración de lealtad
-- aunque el registro esté marcado como inactivo (para poder reactivarlo).
drop policy if exists "lectura publica restaurantes" on public.restaurantes;
create policy "lectura publica restaurantes"
  on public.restaurantes for select using (true);

-- ----------------------------------------------------------------------------
-- 4. ESCRITURA: deliberadamente SIN políticas públicas
-- ----------------------------------------------------------------------------
-- No se crean políticas de INSERT/UPDATE/DELETE para el rol `anon`.
--
-- Motivo: la anon key viaja en el bundle del navegador (es NEXT_PUBLIC_). Si se
-- permitiera escribir con ella, cualquiera podría abrir la consola y poner
-- todos los platillos a $0 o borrar el menú completo.
--
-- Por eso el panel NO escribe directo a Supabase: manda sus cambios a las rutas
-- /api/admin/*, que corren en el servidor y usan SUPABASE_SERVICE_ROLE_KEY.
-- Esa llave nunca sale del servidor y salta RLS de forma controlada.
--
-- Cuando exista login de dueños (Supabase Auth), estas rutas se sustituyen por
-- políticas basadas en auth.uid() y la pertenencia al restaurante.

-- ============================================================================
-- FIN DE LA MIGRACIÓN 001
-- ============================================================================
