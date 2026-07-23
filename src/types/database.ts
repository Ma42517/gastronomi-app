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

export interface Restaurante {
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
}

export interface Mesa {
  id: string;
  restaurante_id: string;
  numero: string;
  qr_token: string;
  capacidad: number | null;
  activa: boolean;
  created_at: string;
}

export interface MenuItem {
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
}

export interface SesionMesa {
  id: string;
  mesa_id: string;
  restaurante_id: string;
  estado: EstadoSesion;
  total: number;
  abierta_at: string;
  cerrada_at: string | null;
}

export interface OrdenItem {
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

export interface TransaccionLealtad {
  id: string;
  restaurante_id: string;
  sesion_id: string | null;
  cliente_identificador: string;
  sellos: number;
  tipo: TipoLealtad;
  created_at: string;
}

/** Estructura consumida por los clientes de Supabase (typing genérico). */
export interface Database {
  public: {
    Tables: {
      restaurantes: {
        Row: Restaurante;
        Insert: Omit<Restaurante, "id" | "created_at"> & Partial<Pick<Restaurante, "id" | "created_at">>;
        Update: Partial<Restaurante>;
      };
      mesas: {
        Row: Mesa;
        Insert: Omit<Mesa, "id" | "created_at"> & Partial<Pick<Mesa, "id" | "created_at">>;
        Update: Partial<Mesa>;
      };
      menu_items: {
        Row: MenuItem;
        Insert: Omit<MenuItem, "id" | "created_at"> & Partial<Pick<MenuItem, "id" | "created_at">>;
        Update: Partial<MenuItem>;
      };
      sesiones_mesa: {
        Row: SesionMesa;
        Insert: Omit<SesionMesa, "id" | "abierta_at"> & Partial<Pick<SesionMesa, "id" | "abierta_at">>;
        Update: Partial<SesionMesa>;
      };
      orden_items: {
        Row: OrdenItem;
        Insert: Omit<OrdenItem, "id" | "created_at"> & Partial<Pick<OrdenItem, "id" | "created_at">>;
        Update: Partial<OrdenItem>;
      };
      transacciones_lealtad: {
        Row: TransaccionLealtad;
        Insert: Omit<TransaccionLealtad, "id" | "created_at"> & Partial<Pick<TransaccionLealtad, "id" | "created_at">>;
        Update: Partial<TransaccionLealtad>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      estado_sesion: EstadoSesion;
      estado_orden_item: EstadoOrdenItem;
      tipo_lealtad: TipoLealtad;
    };
  };
}
