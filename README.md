# gastronomi-app

PWA B2B2C para restaurantes (Dine-In) que elimina el cuello de botella de pedir la cuenta y pagar.

## Pilares del producto

1. **Cobro invisible vía QR** — el comensal escanea el QR de su mesa, ve el menú, ordena y paga desde el navegador (sin instalar apps).
2. **Cuentas divididas (Split Bill)** — cada persona paga su parte desde su propio teléfono.
3. **Lealtad digital** — tarjeta perforada: cada pago suma un sello automáticamente.

## Stack

- **Frontend:** Next.js 14 (App Router) · React · TypeScript · Tailwind CSS · PWA Mobile-First
- **Backend/DB:** Supabase (PostgreSQL + Auth + Realtime)
- **Pagos:** Mercado Pago / Stripe (pendiente de integrar)

## Estructura

```
gastronomi-app/
├── src/
│   ├── app/
│   │   ├── (cliente)/mesa/[restauranteId]/[mesaId]/   # Vista cliente (QR)
│   │   ├── (restaurante)/dashboard/                   # Mapa de mesas en vivo
│   │   ├── (admin)/admin/                             # Panel B2B del dueño
│   │   ├── layout.tsx · page.tsx · globals.css
│   ├── components/{cliente,restaurante,admin,ui}/     # Componentes por dominio
│   ├── lib/supabase/{client,server}.ts               # Clientes de Supabase
│   ├── lib/utils.ts
│   └── types/database.ts                              # Tipos del esquema
├── supabase/
│   ├── schema.sql                                     # Tablas, RLS, triggers
│   └── seed.sql                                       # Datos de demo
└── public/manifest.json                               # PWA
```

## Puesta en marcha

> ⚠️ Requiere conexión a internet para instalar dependencias (el entorno donde
> se generó este scaffold tenía npm bloqueado, por eso se creó manualmente).

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.local.example .env.local   # y rellenar las llaves de Supabase

# 3. Cargar el esquema en Supabase
#    Dashboard > SQL Editor > pegar supabase/schema.sql (y opcionalmente seed.sql)

# 4. Levantar en desarrollo
npm run dev
```

Rutas de desarrollo:

- Cliente: http://localhost:3000/mesa/demo/1
- Restaurante: http://localhost:3000/dashboard
- Admin: http://localhost:3000/admin
