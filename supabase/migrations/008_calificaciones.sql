-- ============================================================================
-- MIGRACIÓN 008 — Calificación del mesero y propina final
-- ----------------------------------------------------------------------------
-- Ejecutar en: Supabase Dashboard > SQL Editor. Idempotente.
--
-- QUÉ GUARDA
-- La valoración que deja el comensal al terminar de pagar: estrellas, etiquetas
-- rápidas, comentario libre y la propina. Es el dato que le dice al dueño cómo
-- atiende su personal.
-- ============================================================================

create table if not exists public.calificaciones (
  id             uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,

  -- Mesa como texto, igual que en `mesas`: hay locales con "Terraza 3".
  mesa text,

  estrellas integer not null check (estrellas between 1 and 5),

  -- Etiquetas rápidas ("Amable", "Rápido"…). jsonb en lugar de columnas o de un
  -- enum: añadir o quitar etiquetas es una decisión de producto que no debería
  -- exigir una migración.
  etiquetas jsonb not null default '[]'::jsonb,

  comentario text,

  -- Propina y total quedan registrados junto a la valoración: sin ellos no se
  -- puede analizar si mejor atención se traduce en mejor propina, que es la
  -- pregunta que de verdad le interesa al dueño.
  propina      numeric(10,2) not null default 0 check (propina >= 0),
  total_pagado numeric(10,2) not null default 0 check (total_pagado >= 0),

  created_at timestamptz not null default now()
);

create index if not exists idx_calificaciones_restaurante
  on public.calificaciones(restaurante_id, created_at desc);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.calificaciones enable row level security;

-- LECTURA: solo el dueño del restaurante (o un super admin desde el servidor).
-- Los comentarios pueden ser duros y no son información pública; un comensal no
-- tiene por qué leer lo que escribieron los demás.
drop policy if exists "el dueno lee sus calificaciones" on public.calificaciones;
create policy "el dueno lee sus calificaciones"
  on public.calificaciones for select
  using (public.es_dueno(restaurante_id));

-- ESCRITURA: ninguna política pública. El comensal no está autenticado, así que
-- si `anon` pudiera insertar, cualquiera podría inundar la tabla de reseñas
-- falsas desde la consola del navegador. Las inserciones pasan por
-- /api/calificacion, que valida y escribe con la Secret key.

grant select on public.calificaciones to authenticated;
grant select, insert on public.calificaciones to service_role;
-- Sin UPDATE ni DELETE ni para service_role: una valoración no se retoca.

-- ----------------------------------------------------------------------------
-- RESUMEN PARA EL PANEL DEL DUEÑO
-- ----------------------------------------------------------------------------
-- Se calcula en la base y no en el navegador: traer miles de filas para
-- promediarlas en el cliente sería absurdo.
create or replace function public.resumen_calificaciones(p_restaurante uuid)
returns table (
  total          bigint,
  promedio       numeric,
  cinco          bigint,
  cuatro         bigint,
  tres           bigint,
  dos            bigint,
  una            bigint,
  propina_media  numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)                                             as total,
    round(coalesce(avg(estrellas), 0), 2)                as promedio,
    count(*) filter (where estrellas = 5)                as cinco,
    count(*) filter (where estrellas = 4)                as cuatro,
    count(*) filter (where estrellas = 3)                as tres,
    count(*) filter (where estrellas = 2)                as dos,
    count(*) filter (where estrellas = 1)                as una,
    round(coalesce(avg(propina), 0), 2)                  as propina_media
  from public.calificaciones
  where restaurante_id = p_restaurante;
$$;

revoke all on function public.resumen_calificaciones(uuid) from public, anon;
grant execute on function public.resumen_calificaciones(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- COMPROBACIÓN
-- ----------------------------------------------------------------------------
select count(*) as calificaciones_registradas from public.calificaciones;
