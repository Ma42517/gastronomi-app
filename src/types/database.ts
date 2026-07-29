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
  // --- Añadidas por supabase/migrations/010_media_y_personalizacion.sql ---
  /** Aspecto del encabezado del menú. 'solid' es el comportamiento histórico. */
  header_style: EstiloEncabezado;
  /** Agrupación de los platillos. 'grid' (dos columnas) es lo que ya se veía. */
  menu_layout: DisposicionMenu;
  whatsapp_number: string | null;
  instagram_url: string | null;
}

/**
 * Los dos valores están respaldados por una restricción `check` en Postgres, así
 * que el tipo no es una promesa del lado del cliente: la base rechaza cualquier
 * otro valor.
 */
export type EstiloEncabezado = "solid" | "glass";
export type DisposicionMenu = "list" | "grid";

/** Valoración del servicio que deja el comensal al pagar. Migración 008. */
export type Calificacion = {
  id: string;
  restaurante_id: string;
  mesa: string | null;
  estrellas: number;
  etiquetas: unknown;
  comentario: string | null;
  propina: number;
  total_pagado: number;
  created_at: string;
};

/** Ajustes globales de la app (fila única, id = 1). Migración 007. */
export type PlataformaConfig = {
  id: number;
  fuente: string;
  pagos_habilitados: unknown;
  promo_activa: boolean;
  promo_titulo: string | null;
  promo_mensaje: string | null;
  promo_color: string;
  comision_pct: number;
  dueno_puede_editar_precios: boolean;
  dueno_puede_crear_platillos: boolean;
  dueno_puede_borrar_platillos: boolean;
  dueno_puede_editar_recompensas: boolean;
  actualizado_at: string;
};

/**
 * Super administrador de la PLATAFORMA (panel /admin/dev). Nivel distinto a
 * `RestauranteUsuario`: no administra un restaurante, sino todos.
 */
export type PlataformaAdmin = {
  user_id: string;
  nota: string | null;
  created_at: string;
};

/** Vincula un usuario de Supabase Auth con el restaurante que administra. */
export type RestauranteUsuario = {
  restaurante_id: string;
  user_id: string;
  rol: "dueno" | "staff";
  created_at: string;
};

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
  // --- Añadida por supabase/migrations/009_video_platillos.sql ---
  /**
   * Video corto del platillo. Opcional y COMPLEMENTARIO a `imagen_url`: la
   * imagen sigue siendo el poster y el respaldo si el video no carga.
   */
  video_url: string | null;
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
      calificaciones: {
        Row: Calificacion;
        Insert: Omit<Calificacion, "id" | "created_at"> &
          Partial<Pick<Calificacion, "id" | "created_at">>;
        Update: Partial<Calificacion>;
        Relationships: [];
      };
      plataforma_config: {
        Row: PlataformaConfig;
        Insert: Partial<PlataformaConfig> & { id: number };
        Update: Partial<PlataformaConfig>;
        Relationships: [];
      };
      plataforma_admins: {
        Row: PlataformaAdmin;
        Insert: Omit<PlataformaAdmin, "created_at"> &
          Partial<Pick<PlataformaAdmin, "created_at">>;
        Update: Partial<PlataformaAdmin>;
        Relationships: [];
      };
      restaurante_usuarios: {
        Row: RestauranteUsuario;
        Insert: Omit<RestauranteUsuario, "created_at"> &
          Partial<Pick<RestauranteUsuario, "created_at">>;
        Update: Partial<RestauranteUsuario>;
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
    /**
     * Funciones RPC. Deben declararse aquí para que `supabase.rpc(...)` tipe
     * bien; con el mapa vacío, cualquier llamada se infiere como `never`.
     * Las dos primeras solo tienen permiso de ejecución para `service_role`
     * (ver migración 006): leen `auth.users` y expuestas serían un oráculo de
     * enumeración de usuarios.
     */
    Functions: {
      /** Resuelve un correo a su uuid de auth.users. */
      usuario_id_por_correo: {
        Args: { p_email: string };
        Returns: string | null;
      };
      /** Dueños de un restaurante con su correo ya resuelto. */
      duenos_de_restaurante: {
        Args: { p_restaurante: string };
        Returns: {
          user_id: string;
          email: string;
          rol: string;
          created_at: string;
        }[];
      };
      /** ¿El usuario de la sesión es dueño de este restaurante? */
      es_dueno: {
        Args: { p_restaurante: string };
        Returns: boolean;
      };
      /** Resumen de calificaciones de un restaurante (promedio y reparto). */
      resumen_calificaciones: {
        Args: { p_restaurante: string };
        Returns: {
          total: number;
          promedio: number;
          cinco: number;
          cuatro: number;
          tres: number;
          dos: number;
          una: number;
          propina_media: number;
        }[];
      };
      /** Saldo de sellos de un comensal en un restaurante. */
      saldo_sellos: {
        Args: { p_restaurante: string; p_cliente: string };
        Returns: number;
      };
    };
    Enums: {
      estado_sesion: EstadoSesion;
      estado_orden_item: EstadoOrdenItem;
      tipo_lealtad: TipoLealtad;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
