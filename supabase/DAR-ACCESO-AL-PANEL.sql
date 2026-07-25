-- ============================================================================
-- DAR ACCESO AL PANEL — ejecutar en Supabase > SQL Editor > New query > Run
-- ----------------------------------------------------------------------------
-- ANTES de correr esto, crea tu usuario:
--   Supabase > Authentication > Users > Add user
--   (marca "Auto Confirm User")
--
-- Este archivo NO necesita que edites nada: toma el usuario MÁS RECIENTE de tu
-- proyecto (el que acabas de crear) y lo registra como dueño del restaurante.
--
-- Es idempotente: correrlo dos veces no duplica nada.
-- ============================================================================

insert into public.restaurante_usuarios (restaurante_id, user_id, rol)
select r.id, u.id, 'dueno'
  from public.restaurantes r
  -- El usuario creado más recientemente. Si en tu proyecto hubiera varias
  -- cuentas y quisieras otra, usa el bloque alternativo del final.
  cross join (
    select id
      from auth.users
     order by created_at desc
     limit 1
  ) u
 where r.slug = 'el-primo'
on conflict (restaurante_id, user_id) do nothing;

-- ----------------------------------------------------------------------------
-- RESULTADO: quién puede entrar al panel
-- ----------------------------------------------------------------------------
-- Debe aparecer tu correo. Si sale vacío, revisa que:
--   a) creaste el usuario en Authentication > Users, y
--   b) el restaurante existe (pulsaste "Publicar en Supabase" en /admin).
-- ----------------------------------------------------------------------------
select u.email as puede_entrar,
       r.slug  as restaurante,
       ru.rol
  from public.restaurante_usuarios ru
  join public.restaurantes r on r.id = ru.restaurante_id
  join auth.users u          on u.id = ru.user_id
 order by u.email;

-- ============================================================================
-- ALTERNATIVA: elegir la cuenta por correo
-- ----------------------------------------------------------------------------
-- Úsala si tienes varias cuentas y quieres una en concreto. Descomenta,
-- cambia el correo y ejecuta.
-- ============================================================================

-- insert into public.restaurante_usuarios (restaurante_id, user_id, rol)
-- select r.id, u.id, 'dueno'
--   from public.restaurantes r
--   join auth.users u on lower(u.email) = lower('TU-CORREO@ejemplo.com')
--  where r.slug = 'el-primo'
-- on conflict (restaurante_id, user_id) do nothing;
