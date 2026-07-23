-- ============================================================================
-- gastronomi-app — Datos de demostración (opcional)
-- Ejecutar DESPUÉS de schema.sql para tener un restaurante de prueba.
-- ============================================================================

with r as (
  insert into public.restaurantes (nombre, slug, direccion, telefono, sellos_para_recompensa, descripcion_recompensa)
  values ('Taquería Demo', 'demo', 'Av. Siempre Viva 123', '+52 55 0000 0000', 4, 'Postre gratis')
  returning id
),
m as (
  insert into public.mesas (restaurante_id, numero, qr_token, capacidad)
  select r.id, n::text, 'demo-token-' || n, 4 from r, generate_series(1, 8) as n
  returning restaurante_id
)
insert into public.menu_items (restaurante_id, nombre, descripcion, precio, categoria, orden, disponible)
select
  (select id from r),
  item.nombre, item.descripcion, item.precio, item.categoria, item.orden, true
from (values
  ('Tacos al Pastor (orden)', '4 tacos con piña y cilantro', 89.00, 'Platillos', 1),
  ('Quesadilla de Flor',      'Con queso Oaxaca',            75.00, 'Platillos', 2),
  ('Agua de Horchata',        'Vaso 500ml',                  35.00, 'Bebidas',   3),
  ('Refresco',                'Lata 355ml',                  30.00, 'Bebidas',   4),
  ('Flan Napolitano',         'Casero',                      55.00, 'Postres',   5)
) as item(nombre, descripcion, precio, categoria, orden);
