-- ============================================================================
-- INSTALACION COMPLETA — gastronomi-app
-- ----------------------------------------------------------------------------
-- Pega TODO este archivo en: Supabase > SQL Editor > New query > Run.
-- Es idempotente: si lo corres dos veces no rompe nada.
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
--
-- IMPORTANTE: el índice NO debe ser parcial (`where slug is not null`). El panel
-- guarda con UPSERT, que es `on conflict (restaurante_id, slug) do update`, y
-- Postgres solo acepta un índice parcial como árbitro de ON CONFLICT si la
-- sentencia repite su predicado — algo que PostgREST no hace. Con un índice
-- parcial, todo intento de guardar falla con el error 42P10.
--
-- El predicado tampoco era necesario: en un índice único los NULL no colisionan
-- entre sí, así que las filas sin slug se permiten igual.
create unique index if not exists uniq_menu_slug_por_restaurante
  on public.menu_items (restaurante_id, slug);

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


-- ============================================================================
-- MIGRACIÓN 003 — Endurecer permisos del rol público (opcional, recomendada)
-- ----------------------------------------------------------------------------
-- Ejecutar en: Supabase Dashboard > SQL Editor. Idempotente.
--
-- POR QUÉ
-- Los permisos por defecto de Supabase conceden a `anon` y `authenticated` más
-- de lo necesario. Al revisar los grants aplicados aparecía esto:
--
--   anon | menu_items | REFERENCES, SELECT, TRIGGER, TRUNCATE
--
-- El problemático es TRUNCATE: vacía la tabla completa y ROW LEVEL SECURITY NO
-- LO BLOQUEA. RLS filtra filas en SELECT/INSERT/UPDATE/DELETE, pero TRUNCATE
-- actúa sobre la tabla entera y se salta las políticas. Un rol público con
-- TRUNCATE puede, en teoría, borrar el menú de un restaurante.
--
-- Hoy el riesgo real es bajo porque la Data API (PostgREST) no expone TRUNCATE,
-- así que no es explotable desde el navegador. Pero es un privilegio sin ningún
-- motivo para existir: si mañana se añade una función RPC, un trigger o se abre
-- una conexión directa, deja de ser teórico.
--
-- Este script deja a los roles públicos SOLO con SELECT, que es lo único que la
-- vista cliente necesita para leer la carta.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Catálogo: los roles públicos se quedan solo con lectura
-- ----------------------------------------------------------------------------
revoke truncate, trigger, references, insert, update, delete
  on public.restaurantes from anon, authenticated;

revoke truncate, trigger, references, insert, update, delete
  on public.menu_items from anon, authenticated;

revoke truncate, trigger, references, insert, update, delete
  on public.mesas from anon, authenticated;

-- Se reafirma la lectura, que es lo único que debe quedar.
grant select on public.restaurantes to anon, authenticated;
grant select on public.menu_items  to anon, authenticated;
grant select on public.mesas       to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Tablas de operación: nada para los roles públicos
-- ----------------------------------------------------------------------------
-- Cuentas abiertas, consumos y sellos. Cuando se implementen las órdenes desde
-- el cliente se concederá el permiso mínimo de cada operación, no antes.
revoke all on public.sesiones_mesa         from anon, authenticated;
revoke all on public.orden_items           from anon, authenticated;
revoke all on public.transacciones_lealtad from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Tablas futuras: que no vuelvan a nacer con permisos de más
-- ----------------------------------------------------------------------------
alter default privileges in schema public
  revoke truncate, trigger, references, insert, update, delete
  on tables from anon, authenticated;

-- ============================================================================
-- COMPROBACIÓN
-- ----------------------------------------------------------------------------
-- Esperado: anon y authenticated solo con SELECT en las tres tablas del
-- catálogo, y sin ninguna fila para las tablas de operación.
-- ============================================================================
select grantee,
       table_name,
       string_agg(privilege_type, ', ' order by privilege_type) as permisos
  from information_schema.role_table_grants
 where table_schema = 'public'
   and grantee in ('anon', 'authenticated')
 group by grantee, table_name
 order by table_name, grantee;


-- ============================================================================
-- MIGRACIÓN 004 — Arregla el índice que impedía guardar el menú
-- ----------------------------------------------------------------------------
-- Ejecutar en: Supabase Dashboard > SQL Editor. Idempotente.
--
-- SÍNTOMA
-- "Publicar en Supabase" creaba la fila del restaurante pero NO insertaba
-- ningún platillo. El diagnóstico mostraba:
--   4a. Restaurante "el-primo" — sembrado      ✅
--   4b. Platillos en el menú   — 0 platillo(s) ❌
--
-- CAUSA
-- La migración 001 creó el índice único como PARCIAL:
--
--   create unique index uniq_menu_slug_por_restaurante
--     on public.menu_items (restaurante_id, slug)
--     where slug is not null;              <-- el problema
--
-- El panel guarda con un UPSERT, que en Postgres es
-- `insert ... on conflict (restaurante_id, slug) do update`. Y Postgres solo
-- puede usar un índice PARCIAL como árbitro de ON CONFLICT si la sentencia
-- repite su predicado en un WHERE. PostgREST no lo hace (ni puede), así que el
-- upsert fallaba con:
--
--   42P10: there is no unique or exclusion constraint matching the
--          ON CONFLICT specification
--
-- SOLUCIÓN
-- El índice pasa a ser NO parcial. El `where slug is not null` era innecesario:
-- en un índice único de Postgres los NULL no colisionan entre sí (NULL nunca es
-- igual a NULL), así que las filas sin slug siguen permitiéndose sin necesidad
-- del predicado.
-- ============================================================================

drop index if exists public.uniq_menu_slug_por_restaurante;

create unique index if not exists uniq_menu_slug_por_restaurante
  on public.menu_items (restaurante_id, slug);

-- ============================================================================
-- COMPROBACIÓN
-- ----------------------------------------------------------------------------
-- La columna `indexdef` NO debe contener "WHERE".
-- ============================================================================
select indexname, indexdef
  from pg_indexes
 where schemaname = 'public'
   and indexname = 'uniq_menu_slug_por_restaurante';


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


-- ============================================================================
-- MIGRACIÓN 009 — Video opcional por platillo
-- ----------------------------------------------------------------------------
-- Ejecutar en: Supabase Dashboard > SQL Editor. Idempotente.
--
-- QUÉ AÑADE
-- Una columna `video_url` en `menu_items`. El platillo CONSERVA su `imagen_url`:
-- el video no la sustituye, la complementa.
--
-- POR QUÉ SIGUEN LAS DOS
--   1. La imagen se usa como `poster` del video, para que no se vea un cuadro
--      negro mientras carga.
--   2. Es el respaldo si el video falla, si el navegador no lo soporta o si el
--      usuario tiene el ahorro de datos activado.
-- Guardar solo el video obligaría a extraer un fotograma en el cliente, que es
-- lento y no siempre posible.
--
-- SOBRE EL ALMACENAMIENTO
-- Aquí se guarda una URL, no el archivo. Un video en base64 dentro de una
-- columna de texto haría que cada lectura del menú arrastrase megabytes por
-- platillo. Lo correcto es subirlo a Supabase Storage (o a un CDN) y guardar el
-- enlace.
-- ============================================================================

alter table public.menu_items
  add column if not exists video_url text;

-- ----------------------------------------------------------------------------
-- COMPROBACIÓN
-- ----------------------------------------------------------------------------
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'menu_items'
   and column_name in ('imagen_url', 'video_url')
 order by column_name;


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


-- ============================================================================
-- MIGRACIÓN 011 — Categorías propias del restaurante
-- ----------------------------------------------------------------------------
-- Ejecutar en: Supabase Dashboard > SQL Editor. Idempotente.
--
-- QUÉ AÑADE
--   `restaurantes.categorias`: la lista de secciones del menú, en su orden.
--
-- POR QUÉ HACE FALTA UNA COLUMNA
-- Hasta ahora las categorías no existían como dato: se DEDUCÍAN leyendo el campo
-- `categoria` de cada platillo. Eso funciona para mostrar el menú, pero tiene dos
-- límites que impiden que el restaurantero las gestione:
--
--   1. Una categoría vacía no existe. Al crear "Postres" no habría dónde
--      guardarla, así que desaparecería en cuanto se recargara la página — antes
--      incluso de poder meterle su primer platillo.
--   2. No hay orden. El de hoy sale de una plantilla del código, igual para
--      todos los restaurantes, así que una taquería no puede poner sus tacos
--      antes que sus bebidas.
--
-- POR QUÉ UNA LISTA Y NO UNA TABLA
-- Una tabla `categorias` con su clave ajena sería lo canónico, pero obligaría a
-- migrar el `categoria` de texto que ya llevan todos los platillos a un id, y a
-- mantener las dos cosas en sincronía durante la transición. Para una lista de
-- entre cinco y quince nombres por restaurante, que se lee entera siempre y nunca
-- se consulta por separado, el coste no se justifica.
--
-- CÓMO CONVIVEN LAS DOS FUENTES
-- El menú muestra la UNIÓN de esta lista y las categorías que aparecen en los
-- platillos. Así una carta que ya existía sigue viéndose igual sin haber tocado
-- nada, y esta columna solo añade las vacías y el orden.
-- ============================================================================

alter table public.restaurantes
  add column if not exists categorias jsonb not null default '[]'::jsonb;


comment on column public.restaurantes.categorias is
  'Secciones del menú en su orden, como lista de textos. Se une con las categorías que ya tengan los platillos.';


-- Se rellena con lo que ya hay, para que el orden actual no se pierda al
-- empezar a usarla. Solo toca las filas que la tengan vacía: volver a ejecutar
-- este archivo no reordena lo que el dueño haya organizado después.
update public.restaurantes r
   set categorias = coalesce(
         (
           select jsonb_agg(c.categoria order by c.orden_min)
             from (
               select m.categoria, min(m.orden) as orden_min
                 from public.menu_items m
                where m.restaurante_id = r.id
                  and m.categoria is not null
                group by m.categoria
             ) c
         ),
         '[]'::jsonb
       )
 where r.categorias = '[]'::jsonb;


-- ----------------------------------------------------------------------------
-- COMPROBACIÓN
-- ----------------------------------------------------------------------------
select nombre, categorias
  from public.restaurantes
 order by nombre;

