/**
 * Tipos de la base de datos (Supabase / PostgreSQL).
 *
 * Estos tipos reflejan el esquema definido en `supabase/schema.sql`.
 * En el futuro se pueden autogenerar con:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 */

export type EstadoSesion = "abierta" | "pagando" | "cerrada";
export type EstadoOrdenItem = "pendiente" | "en_preparacion" | "servido";
export type TipoLealtad = "acumulacion" | "canje";

export type Restaurante = {
  id: string;
  nombre: string;
  slug: string;
  direccion: string | null;
  telefono: string | null;
  logo_url: string | null;
  moneda: string;
  sellos_para_recompensa: number;
  descripcion_recompensa: string | null;
  activo: boolean;
  created_at: string;
  // --- Añadidas por supabase/migrations/001_panel_admin.sql ---
  imagen_premio: string | null;
  eslogan: string | null;
  portada_url: string | null;
  color_primario: string;
  iniciales: string | null;
}

export type Mesa = {
  id: string;
  restaurante_id: string;
  numero: string;
  qr_token: string;
  capacidad: number | null;
  activa: boolean;
  created_at: string;
}

export type MenuItem = {
  id: string;
  restaurante_id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  categoria: string | null;
  imagen_url: string | null;
  disponible: boolean;
  orden: number;
  created_at: string;
  // --- Añadidas por supabase/migrations/001_panel_admin.sql ---
  /** Id ESTABLE de dominio ("t-pastor"). La app lo usa como `id`; ver restaurante-repo.ts. */
  slug: string | null;
  emoji: string | null;
  /** Grupos de modificadores (jsonb). Su forma la define la app. */
  modifiers: unknown | null;
  is_popular: boolean;
}

export type SesionMesa = {
  id: string;
  mesa_id: string;
  restaurante_id: string;
  estado: EstadoSesion;
  total: number;
  abierta_at: string;
  cerrada_at: string | null;
}

export type OrdenItem = {
  id: string;
  sesion_id: string;
  menu_item_id: string;
  cantidad: number;
  precio_unitario: number;
  notas: string | null;
  estado: EstadoOrdenItem;
  cliente_identificador: string | null;
  created_at: string;
}

export type TransaccionLealtad = {
  id: string;
  restaurante_id: string;
  sesion_id: string | null;
  cliente_identificador: string;
  sellos: number;
  tipo: TipoLealtad;
  created_at: string;
}

/** Estructura consumida por los clientes de Supabase (typing genérico). */
export type Database = {
  public: {
    Tables: {
      restaurantes: {
        Row: Restaurante;
        Insert: Omit<Restaurante, "id" | "created_at"> & Partial<Pick<Restaurante, "id" | "created_at">>;
        Update: Partial<Restaurante>;
        Relationships: [];
      };
      mesas: {
        Row: Mesa;
        Insert: Omit<Mesa, "id" | "created_at"> & Partial<Pick<Mesa, "id" | "created_at">>;
        Update: Partial<Mesa>;
        Relationships: [];
      };
      menu_items: {
        Row: MenuItem;
        Insert: Omit<MenuItem, "id" | "created_at"> & Partial<Pick<MenuItem, "id" | "created_at">>;
        Update: Partial<MenuItem>;
        Relationships: [];
      };
      sesiones_mesa: {
        Row: SesionMesa;
        Insert: Omit<SesionMesa, "id" | "abierta_at"> & Partial<Pick<SesionMesa, "id" | "abierta_at">>;
        Update: Partial<SesionMesa>;
        Relationships: [];
      };
      orden_items: {
        Row: OrdenItem;
        Insert: Omit<OrdenItem, "id" | "created_at"> & Partial<Pick<OrdenItem, "id" | "created_at">>;
        Update: Partial<OrdenItem>;
        Relationships: [];
      };
      transacciones_lealtad: {
        Row: TransaccionLealtad;
        Insert: Omit<TransaccionLealtad, "id" | "created_at"> & Partial<Pick<TransaccionLealtad, "id" | "created_at">>;
        Update: Partial<TransaccionLealtad>;
        Relationships: [];
      };
    };
    // `Record<string, never>` NO satisface el GenericSchema de supabase-js y hace
    // que .select() infiera `never`. Esta es la forma que genera el CLI oficial.
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      estado_sesion: EstadoSesion;
      estado_orden_item: EstadoOrdenItem;
      tipo_lealtad: TipoLealtad;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
