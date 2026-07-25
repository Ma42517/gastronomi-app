-- ============================================================================
-- INSTALACION COMPLETA — gastronomi-app
-- ----------------------------------------------------------------------------
-- Pega TODO este archivo en: Supabase > SQL Editor > New query > Run.
-- Es idempotente: si lo corres dos veces no rompe nada.
--
-- Contiene, en orden:
--   1) El esquema base (tablas, indices, RLS, triggers).
--   2) Migracion 001: columnas que necesita el Panel Administrador.
--   3) Migracion 002: permisos de la Data API (sin esto: permission denied).
-- ============================================================================


-- ============================================================================
-- gastronomi-app — Esquema base de PostgreSQL (Supabase)
-- ----------------------------------------------------------------------------
-- Ejecutar en: Supabase Dashboard > SQL Editor (o via `supabase db push`).
-- Incluye: extensiones, enums, tablas, índices, RLS y triggers de negocio.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. EXTENSIONES
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";      -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- 1. ENUMS (tipos de estado del dominio)
-- ----------------------------------------------------------------------------
do $$ begin
  create type estado_sesion as enum ('abierta', 'pagando', 'cerrada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_orden_item as enum ('pendiente', 'en_preparacion', 'servido');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_lealtad as enum ('acumulacion', 'canje');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 2. TABLAS
-- ----------------------------------------------------------------------------

-- 2.1 Restaurantes (cuenta B2B / tenant)
create table if not exists public.restaurantes (
  id                      uuid primary key default gen_random_uuid(),
  nombre                  text        not null,
  slug                    text        not null unique,
  direccion               text,
  telefono                text,
  logo_url                text,
  moneda                  text        not null default 'MXN',
  -- Programa de lealtad (tarjeta perforada digital)
  sellos_para_recompensa  integer     not null default 4 check (sellos_para_recompensa > 0),
  descripcion_recompensa  text        default 'Postre gratis',
  activo                  boolean     not null default true,
  created_at              timestamptz not null default now()
);

-- 2.2 Mesas físicas (cada una con su QR)
create table if not exists public.mesas (
  id             uuid primary key default gen_random_uuid(),
  restaurante_id uuid        not null references public.restaurantes(id) on delete cascade,
  numero         text        not null,             -- "1", "Terraza 3", etc.
  qr_token       text        not null unique,      -- token opaco embebido en el QR
  capacidad      integer     check (capacidad is null or capacidad > 0),
  activa         boolean     not null default true,
  created_at     timestamptz not null default now(),
  unique (restaurante_id, numero)
);

-- 2.3 Ítems del menú
create table if not exists public.menu_items (
  id             uuid primary key default gen_random_uuid(),
  restaurante_id uuid        not null references public.restaurantes(id) on delete cascade,
  nombre         text        not null,
  descripcion    text,
  precio         numeric(10,2) not null check (precio >= 0),
  categoria      text,                             -- "Entradas", "Bebidas", ...
  imagen_url     text,
  disponible     boolean     not null default true,
  orden          integer     not null default 0,   -- para ordenar dentro de la categoría
  created_at     timestamptz not null default now()
);

-- 2.4 Sesión de mesa (una "cuenta abierta" mientras los comensales están sentados)
create table if not exists public.sesiones_mesa (
  id             uuid primary key default gen_random_uuid(),
  mesa_id        uuid        not null references public.mesas(id) on delete cascade,
  restaurante_id uuid        not null references public.restaurantes(id) on delete cascade,
  estado         estado_sesion not null default 'abierta',
  total          numeric(10,2) not null default 0 check (total >= 0),
  abierta_at     timestamptz not null default now(),
  cerrada_at     timestamptz
);

-- Solo una sesión ABIERTA por mesa al mismo tiempo
create unique index if not exists uniq_sesion_abierta_por_mesa
  on public.sesiones_mesa (mesa_id)
  where (estado <> 'cerrada');

-- 2.5 Ítems ordenados dentro de una sesión (soporta split bill vía cliente_identificador)
create table if not exists public.orden_items (
  id                    uuid primary key default gen_random_uuid(),
  sesion_id             uuid        not null references public.sesiones_mesa(id) on delete cascade,
  menu_item_id          uuid        not null references public.menu_items(id) on delete restrict,
  cantidad              integer     not null default 1 check (cantidad > 0),
  precio_unitario       numeric(10,2) not null check (precio_unitario >= 0),
  notas                 text,
  estado                estado_orden_item not null default 'pendiente',
  -- Identifica a quién le pertenece el ítem para dividir la cuenta.
  -- Puede ser un teléfono, un id de auth.users o un alias temporal.
  cliente_identificador text,
  created_at            timestamptz not null default now()
);

-- 2.6 Transacciones de lealtad (acumulación de sellos y canjes)
create table if not exists public.transacciones_lealtad (
  id                    uuid primary key default gen_random_uuid(),
  restaurante_id        uuid        not null references public.restaurantes(id) on delete cascade,
  sesion_id             uuid        references public.sesiones_mesa(id) on delete set null,
  cliente_identificador text        not null,      -- teléfono / auth uid del comensal
  sellos                integer     not null default 1,  -- + acumula, - canjea
  tipo                  tipo_lealtad not null default 'acumulacion',
  created_at            timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. ÍNDICES (rendimiento de consultas frecuentes)
-- ----------------------------------------------------------------------------
create index if not exists idx_mesas_restaurante        on public.mesas(restaurante_id);
create index if not exists idx_menu_restaurante          on public.menu_items(restaurante_id);
create index if not exists idx_menu_disponible           on public.menu_items(restaurante_id, disponible);
create index if not exists idx_sesiones_mesa             on public.sesiones_mesa(mesa_id);
create index if not exists idx_sesiones_restaurante      on public.sesiones_mesa(restaurante_id, estado);
create index if not exists idx_orden_items_sesion        on public.orden_items(sesion_id);
create index if not exists idx_lealtad_cliente           on public.transacciones_lealtad(restaurante_id, cliente_identificador);

-- ----------------------------------------------------------------------------
-- 4. LÓGICA DE NEGOCIO (funciones + triggers)
-- ----------------------------------------------------------------------------

-- 4.1 Recalcular el total de una sesión cuando cambian sus ítems.
create or replace function public.recalcular_total_sesion()
returns trigger
language plpgsql
as $$
declare
  v_sesion uuid := coalesce(new.sesion_id, old.sesion_id);
begin
  update public.sesiones_mesa s
     set total = coalesce((
       select sum(oi.cantidad * oi.precio_unitario)
         from public.orden_items oi
        where oi.sesion_id = v_sesion
     ), 0)
   where s.id = v_sesion;
  return null;
end;
$$;

drop trigger if exists trg_recalcular_total on public.orden_items;
create trigger trg_recalcular_total
  after insert or update or delete on public.orden_items
  for each row execute function public.recalcular_total_sesion();

-- 4.2 Al cerrar (pagar) una sesión, sumar automáticamente un sello de lealtad
--     por cada cliente_identificador presente en la sesión.
create or replace function public.acumular_sellos_al_pagar()
returns trigger
language plpgsql
as $$
begin
  -- Solo cuando la sesión transiciona a 'cerrada'
  if new.estado = 'cerrada' and old.estado is distinct from 'cerrada' then
    insert into public.transacciones_lealtad
      (restaurante_id, sesion_id, cliente_identificador, sellos, tipo)
    select distinct
      new.restaurante_id,
      new.id,
      oi.cliente_identificador,
      1,
      'acumulacion'::tipo_lealtad
    from public.orden_items oi
    where oi.sesion_id = new.id
      and oi.cliente_identificador is not null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_acumular_sellos on public.sesiones_mesa;
create trigger trg_acumular_sellos
  after update on public.sesiones_mesa
  for each row execute function public.acumular_sellos_al_pagar();

-- 4.3 Vista/función auxiliar: saldo de sellos de un cliente en un restaurante.
create or replace function public.saldo_sellos(
  p_restaurante uuid,
  p_cliente     text
)
returns integer
language sql
stable
as $$
  select coalesce(sum(sellos), 0)::integer
    from public.transacciones_lealtad
   where restaurante_id = p_restaurante
     and cliente_identificador = p_cliente;
$$;

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
-- Se habilita RLS en todas las tablas. Las políticas siguientes son un punto
-- de partida: lectura pública del menú/mesas (necesaria para la vista cliente
-- sin login) y escritura restringida. Ajustar según el modelo de auth final.
-- ----------------------------------------------------------------------------
alter table public.restaurantes          enable row level security;
alter table public.mesas                 enable row level security;
alter table public.menu_items            enable row level security;
alter table public.sesiones_mesa         enable row level security;
alter table public.orden_items           enable row level security;
alter table public.transacciones_lealtad enable row level security;

-- Lectura pública de catálogo (menú, restaurante, mesas) para la vista cliente.
drop policy if exists "lectura publica restaurantes" on public.restaurantes;
create policy "lectura publica restaurantes"
  on public.restaurantes for select using (activo = true);

drop policy if exists "lectura publica mesas" on public.mesas;
create policy "lectura publica mesas"
  on public.mesas for select using (activa = true);

drop policy if exists "lectura publica menu" on public.menu_items;
create policy "lectura publica menu"
  on public.menu_items for select using (disponible = true);

-- NOTA: Las operaciones de escritura (crear sesiones, ordenar, pagar, panel
-- admin) deben hacerse desde el servidor con la service_role key, o mediante
-- políticas basadas en auth.uid() una vez definido el modelo de usuarios.
-- Por seguridad, NO se crean políticas de escritura públicas aquí.

-- ----------------------------------------------------------------------------
-- 6. REALTIME
-- ----------------------------------------------------------------------------
-- Habilitar Realtime para el dashboard del restaurante (mapa de mesas en vivo).
-- `alter publication ... add table` FALLA si la tabla ya está publicada
-- ("table is already member of publication"), lo que rompería la segunda
-- ejecución del script. Se comprueba antes de añadir.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'sesiones_mesa'
  ) then
    alter publication supabase_realtime add table public.sesiones_mesa;
  end if;

  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'orden_items'
  ) then
    alter publication supabase_realtime add table public.orden_items;
  end if;
exception
  -- Si la publicación no existiera (Postgres fuera de Supabase), Realtime
  -- simplemente no se activa: no es motivo para abortar toda la instalación.
  when undefined_object then
    raise notice 'Publicacion supabase_realtime no encontrada; Realtime omitido.';
end $$;

-- ============================================================================
-- FIN DEL ESQUEMA BASE
-- ============================================================================


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
