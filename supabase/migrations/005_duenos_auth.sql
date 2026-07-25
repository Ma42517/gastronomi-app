-- ============================================================================
-- MIGRACIÓN 005 — Dueños del restaurante (autenticación del panel)
-- ----------------------------------------------------------------------------
-- Ejecutar en: Supabase Dashboard > SQL Editor. Idempotente.
--
-- POR QUÉ
-- Hasta ahora las rutas /api/admin/* no comprobaban QUIÉN llamaba: cualquiera
-- que descubriera la URL podía reescribir el menú. Esta tabla define quién es
-- dueño de qué restaurante, y las rutas la consultan antes de escribir.
--
-- MODELO
-- No se abren permisos de escritura al rol `authenticated`: la migración 003 los
-- revocó a propósito y reabrirlos sería un retroceso. El panel sigue escribiendo
-- a través de /api/admin/*, que corren en el servidor con la Secret key; lo que
-- se añade es la comprobación de identidad ANTES de escribir.
--
-- Así, un cliente autenticado (un comensal registrado) NO gana ningún permiso
-- sobre el menú por el simple hecho de tener sesión.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla de propiedad
-- ----------------------------------------------------------------------------
create table if not exists public.restaurante_usuarios (
  restaurante_id uuid        not null references public.restaurantes(id) on delete cascade,
  -- Referencia al usuario de Supabase Auth. `on delete cascade`: si se borra la
  -- cuenta, desaparece su acceso, sin dejar filas huérfanas.
  user_id        uuid        not null references auth.users(id) on delete cascade,
  rol            text        not null default 'dueno' check (rol in ('dueno', 'staff')),
  created_at     timestamptz not null default now(),
  primary key (restaurante_id, user_id)
);

create index if not exists idx_restaurante_usuarios_user
  on public.restaurante_usuarios(user_id);

-- ----------------------------------------------------------------------------
-- 2. RLS
-- ----------------------------------------------------------------------------
alter table public.restaurante_usuarios enable row level security;

-- Cada usuario puede ver ÚNICAMENTE sus propias membresías. Sin esto, un
-- comensal registrado podría listar los correos de todos los dueños.
drop policy if exists "cada usuario ve sus membresias" on public.restaurante_usuarios;
create policy "cada usuario ve sus membresias"
  on public.restaurante_usuarios for select
  using (user_id = auth.uid());

-- No se crean políticas de escritura: dar y quitar acceso se hace desde el SQL
-- Editor o desde el servidor con la Secret key, nunca desde el navegador.

-- ----------------------------------------------------------------------------
-- 3. Permisos
-- ----------------------------------------------------------------------------
grant select on public.restaurante_usuarios to authenticated;
grant select, insert, update, delete on public.restaurante_usuarios to service_role;
-- `anon` no recibe nada: quien no ha entrado no tiene por qué saber que existe.

-- ----------------------------------------------------------------------------
-- 4. Función auxiliar
-- ----------------------------------------------------------------------------
-- `security definer` para poder consultar la tabla sin depender de las políticas
-- del rol que llama. `search_path` fijo para evitar secuestro por un esquema
-- malicioso en el path del llamante.
create or replace function public.es_dueno(p_restaurante uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.restaurante_usuarios ru
     where ru.restaurante_id = p_restaurante
       and ru.user_id = auth.uid()
  );
$$;

-- ============================================================================
-- 5. DAR ACCESO AL PRIMER DUEÑO  ← PASO MANUAL OBLIGATORIO
-- ----------------------------------------------------------------------------
-- Antes de esto, crea el usuario en:
--   Supabase Dashboard > Authentication > Users > Add user
--   (marca "Auto Confirm User" para no tener que verificar el correo)
--
-- Después, descomenta el bloque de abajo, cambia el correo por el tuyo y
-- ejecútalo. Sin este paso podrás iniciar sesión pero el panel te dirá que no
-- eres dueño de ningún restaurante.
-- ============================================================================

-- insert into public.restaurante_usuarios (restaurante_id, user_id, rol)
-- select r.id, u.id, 'dueno'
--   from public.restaurantes r
--   join auth.users u on u.email = 'CAMBIA-ESTO@ejemplo.com'
--  where r.slug = 'el-primo'
-- on conflict (restaurante_id, user_id) do nothing;

-- ----------------------------------------------------------------------------
-- COMPROBACIÓN: ¿quién tiene acceso al panel?
-- ----------------------------------------------------------------------------
select r.slug as restaurante, u.email, ru.rol
  from public.restaurante_usuarios ru
  join public.restaurantes r on r.id = ru.restaurante_id
  join auth.users u          on u.id = ru.user_id
 order by r.slug, u.email;
