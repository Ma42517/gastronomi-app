-- ============================================================================
-- MIGRACIÓN 007 — Ajustes globales de la plataforma
-- ----------------------------------------------------------------------------
-- Ejecutar en: Supabase Dashboard > SQL Editor. Idempotente.
--
-- QUÉ RESUELVE
-- Hay decisiones que NO son de cada restaurante sino del dueño de la app:
-- tipografía, formas de pago aceptadas, promociones globales, comisión, y qué
-- puede o no tocar un dueño de restaurante. Hasta ahora no existía dónde
-- guardarlas.
--
-- DISEÑO: UNA SOLA FILA
-- La tabla tiene una restricción que impide crear una segunda fila. Es un
-- singleton: si hubiera dos, el código tendría que decidir cuál manda y el
-- primer bug sería precisamente esa ambigüedad.
-- ============================================================================

create table if not exists public.plataforma_config (
  -- `id` fijo a 1: la restricción de abajo garantiza que no haya otra fila.
  id integer primary key default 1 check (id = 1),

  -- --- Identidad visual de la app ---
  fuente text not null default 'sistema',

  -- --- Formas de pago habilitadas ---
  -- jsonb en lugar de columnas booleanas: añadir un método nuevo (Mercado Pago,
  -- CoDi…) no debe requerir una migración.
  pagos_habilitados jsonb not null default '["efectivo","tarjeta","transferencia"]'::jsonb,

  -- --- Promoción global (la anuncia la plataforma, no el restaurante) ---
  promo_activa    boolean not null default false,
  promo_titulo    text,
  promo_mensaje   text,
  promo_color     text not null default '#7C3AED',

  -- --- Comisión de la plataforma sobre cada orden ---
  comision_pct numeric(5,2) not null default 0
    check (comision_pct >= 0 and comision_pct <= 100),

  -- --- CANDADOS: qué NO puede hacer un dueño de restaurante ---
  -- Se guardan como permisos (en positivo) para que el valor por defecto sea
  -- "todo permitido" y activar un candado sea una decisión explícita.
  dueno_puede_editar_precios     boolean not null default true,
  dueno_puede_crear_platillos    boolean not null default true,
  dueno_puede_borrar_platillos   boolean not null default true,
  dueno_puede_editar_recompensas boolean not null default true,

  actualizado_at timestamptz not null default now()
);

-- La fila única. `on conflict do nothing` la hace idempotente.
insert into public.plataforma_config (id) values (1)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.plataforma_config enable row level security;

-- LECTURA PÚBLICA: la vista del cliente necesita la tipografía, la promoción y
-- las formas de pago antes de que nadie inicie sesión. No hay nada secreto aquí:
-- son decisiones de presentación que el comensal va a ver de todas formas.
drop policy if exists "lectura publica config" on public.plataforma_config;
create policy "lectura publica config"
  on public.plataforma_config for select using (true);

-- Sin políticas de escritura: solo el servidor, con la Secret key, tras
-- comprobar que quien pide es super admin.

grant select on public.plataforma_config to anon, authenticated;
grant select, insert, update on public.plataforma_config to service_role;
-- Sin DELETE ni para service_role: borrar la fila dejaría la app sin ajustes.

-- ----------------------------------------------------------------------------
-- Marca de tiempo automática
-- ----------------------------------------------------------------------------
create or replace function public.tocar_plataforma_config()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_at := now();
  return new;
end;
$$;

drop trigger if exists trg_tocar_config on public.plataforma_config;
create trigger trg_tocar_config
  before update on public.plataforma_config
  for each row execute function public.tocar_plataforma_config();

-- ----------------------------------------------------------------------------
-- COMPROBACIÓN
-- ----------------------------------------------------------------------------
select fuente,
       pagos_habilitados,
       promo_activa,
       comision_pct,
       dueno_puede_editar_precios,
       dueno_puede_crear_platillos,
       dueno_puede_borrar_platillos,
       dueno_puede_editar_recompensas
  from public.plataforma_config
 where id = 1;
