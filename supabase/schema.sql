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
alter publication supabase_realtime add table public.sesiones_mesa;
alter publication supabase_realtime add table public.orden_items;

-- ============================================================================
-- FIN DEL ESQUEMA BASE
-- ============================================================================
