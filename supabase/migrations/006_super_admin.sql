-- ============================================================================
-- MIGRACIÓN 006 — Super administradores de la plataforma
-- ----------------------------------------------------------------------------
-- Ejecutar en: Supabase Dashboard > SQL Editor. Idempotente.
--
-- DIFERENCIA CON LA MIGRACIÓN 005
--   restaurante_usuarios = dueño de UN restaurante (gestiona su menú).
--   plataforma_admins    = operador de LA PLATAFORMA (crea y borra restaurantes,
--                          asigna dueños). Es el panel /admin/dev.
--
-- Son dos niveles distintos a propósito: el dueño de una taquería no debe poder
-- tocar los datos de otro restaurante, y un super admin no necesita ser dueño de
-- ninguno para operar la plataforma.
-- ============================================================================

create table if not exists public.plataforma_admins (
  user_id    uuid        primary key references auth.users(id) on delete cascade,
  nota       text,       -- para recordar quién es cada cuenta
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.plataforma_admins enable row level security;

-- Cada quien ve solo su propia fila. Así el listado de administradores de la
-- plataforma no queda expuesto a ningún usuario autenticado.
drop policy if exists "cada admin ve su fila" on public.plataforma_admins;
create policy "cada admin ve su fila"
  on public.plataforma_admins for select
  using (user_id = auth.uid());

-- Sin políticas de escritura: dar o quitar el rol de super admin se hace desde
-- este editor SQL. Es el privilegio más alto del sistema; no debe poder
-- concederse desde la aplicación.

grant select on public.plataforma_admins to authenticated;
grant select, insert, update, delete on public.plataforma_admins to service_role;
-- `anon` no recibe nada.

-- ============================================================================
-- REGÍSTRATE COMO SUPER ADMIN  ← ejecuta este bloque
-- ----------------------------------------------------------------------------
-- Toma el usuario MÁS RECIENTE de tu proyecto. Si ya creaste tu cuenta en
-- Authentication > Users, esto te registra sin que edites nada.
--
-- ALTERNATIVA: si tienes varias cuentas, usa el bloque comentado del final.
-- ============================================================================

insert into public.plataforma_admins (user_id, nota)
select u.id, 'super admin inicial'
  from auth.users u
 order by u.created_at desc
 limit 1
on conflict (user_id) do nothing;

-- ----------------------------------------------------------------------------
-- RESULTADO: quién puede entrar al panel de plataforma
-- ----------------------------------------------------------------------------
select u.email as super_admin, pa.nota, pa.created_at
  from public.plataforma_admins pa
  join auth.users u on u.id = pa.user_id
 order by pa.created_at;

-- ============================================================================
-- ALTERNATIVA por correo (descomenta y cambia el correo)
-- ============================================================================

-- insert into public.plataforma_admins (user_id, nota)
-- select u.id, 'super admin'
--   from auth.users u
--  where lower(u.email) = lower('TU-CORREO@ejemplo.com')
-- on conflict (user_id) do nothing;


-- ============================================================================
-- FUNCIONES AUXILIARES PARA GESTIONAR DUEÑOS
-- ----------------------------------------------------------------------------
-- El cliente JS de Supabase no puede consultar el esquema `auth`, así que sin
-- estas funciones el panel de plataforma no podría resolver un correo a su
-- `user_id` ni mostrar quién administra cada restaurante.
--
-- Son `security definer` para poder leer `auth.users`, con `search_path` fijo
-- para que nadie pueda secuestrarlas colocando un esquema falso en su path.
--
-- CLAVE DE SEGURIDAD: se REVOCA el permiso de ejecución a `anon` y
-- `authenticated`, y se concede solo a `service_role`. De lo contrario
-- cualquiera podría usarlas como oráculo para averiguar qué correos tienen
-- cuenta en la plataforma (enumeración de usuarios).
-- ============================================================================

create or replace function public.usuario_id_por_correo(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select id
    from auth.users
   where lower(email) = lower(trim(p_email))
   limit 1;
$$;

revoke all on function public.usuario_id_por_correo(text) from public, anon, authenticated;
grant execute on function public.usuario_id_por_correo(text) to service_role;

-- Dueños de un restaurante, con su correo ya resuelto.
create or replace function public.duenos_de_restaurante(p_restaurante uuid)
returns table (user_id uuid, email text, rol text, created_at timestamptz)
language sql
stable
security definer
set search_path = public, auth
as $$
  select ru.user_id, u.email::text, ru.rol, ru.created_at
    from public.restaurante_usuarios ru
    join auth.users u on u.id = ru.user_id
   where ru.restaurante_id = p_restaurante
   order by ru.created_at;
$$;

revoke all on function public.duenos_de_restaurante(uuid) from public, anon, authenticated;
grant execute on function public.duenos_de_restaurante(uuid) to service_role;
