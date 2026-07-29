import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { mensajeDeError } from "@/lib/supabase/errores";
import { PORTADA_DE_RESPALDO } from "@/lib/restaurante-repo";

/**
 * DIRECTORIO PÚBLICO DE RESTAURANTES — solo servidor.
 *
 * Alimenta la pantalla `/explorar`, que es la puerta de entrada del comensal
 * cuando NO viene de escanear un QR concreto.
 *
 * SOBRE LOS PERMISOS
 * Se lee con la llave pública (publishable/anon), no con la de servicio. La
 * política RLS `lectura publica restaurantes` la limita a `activo = true`, así
 * que un restaurante que el dueño oculte desde el panel desaparece del
 * directorio sin que haya que filtrarlo aquí. Aun así el filtro se escribe
 * también en la consulta: depender en exclusiva de la RLS significa que un
 * cambio de política se convertiría en una fuga silenciosa.
 */

export interface RestauranteDirectorio {
  slug: string;
  nombre: string;
  eslogan: string | null;
  logo_url: string | null;
  /** Nunca vacío: cae a la portada genérica compartida con la vista del menú. */
  portada_url: string;
  color_primario: string;
  iniciales: string;
  /**
   * Platillos DISPONIBLES. La política RLS del menú filtra por
   * `disponible = true`, así que este número es el que de verdad le sirve al
   * comensal: lo que puede pedir ahora, no lo que existe en la carta.
   *
   * `null` si el conteo no se pudo obtener: es distinto de "cero platillos" y no
   * conviene confundirlos en la interfaz.
   */
  platillosDisponibles: number | null;
}

export type ResultadoDirectorio =
  | { estado: "sin-supabase" }
  | { estado: "error"; mensaje: string }
  | { estado: "ok"; restaurantes: RestauranteDirectorio[] };

/** Fila mínima que necesita el directorio. */
interface FilaDirectorio {
  id: string;
  slug: string;
  nombre: string;
  eslogan: string | null;
  logo_url: string | null;
  portada_url: string | null;
  color_primario: string | null;
  iniciales: string | null;
}

export async function listarRestaurantesPublicos(): Promise<ResultadoDirectorio> {
  if (!supabaseConfigurado()) return { estado: "sin-supabase" };

  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("restaurantes")
      .select(
        "id, slug, nombre, eslogan, logo_url, portada_url, color_primario, iniciales",
      )
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (error) throw error;

    const filas = (data ?? []) as unknown as FilaDirectorio[];
    const conteos = await contarPlatillos(supabase, filas.map((f) => f.id));

    return {
      estado: "ok",
      restaurantes: filas.map((f) => ({
        slug: f.slug,
        nombre: f.nombre,
        eslogan: f.eslogan,
        logo_url: f.logo_url,
        portada_url: f.portada_url || PORTADA_DE_RESPALDO,
        color_primario: f.color_primario || "#DC2626",
        iniciales:
          f.iniciales ||
          f.nombre
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase() ?? "")
            .join("") ||
          "??",
        platillosDisponibles: conteos ? (conteos.get(f.id) ?? 0) : null,
      })),
    };
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[Supabase][explorar] listarRestaurantesPublicos:", mensaje);
    return { estado: "error", mensaje };
  }
}

/**
 * Platillos disponibles por restaurante, o `null` si el conteo falla.
 *
 * UNA CONSULTA POR RESTAURANTE, Y FILTRADA
 * La versión obvia —traer todos los `restaurante_id` de `menu_items` y agrupar
 * en memoria— sale más barata en número de viajes, pero es una lectura del menú
 * de TODA la plataforma sin filtrar por restaurante. Eso es precisamente lo que
 * no debe existir en un sistema multi-inquilino: aunque aquí solo se contaran
 * filas, deja una consulta sin acotar en el camino de la que mañana alguien
 * añade un campo. Y no escala: con 500 negocios de 100 platillos serían 50.000
 * filas por la red para pintar un número.
 *
 * Con `head: true` no viaja ninguna fila: PostgREST responde solo con la
 * cabecera `Content-Range`, así que cada consulta pesa lo mismo que un ping.
 *
 * Un fallo aquí NO tumba el directorio: el conteo es un adorno, y perder los
 * restaurantes por no poder contar sus platillos sería un mal intercambio.
 */
async function contarPlatillos(
  supabase: ReturnType<typeof createClient>,
  ids: string[],
): Promise<Map<string, number> | null> {
  if (ids.length === 0) return new Map();

  try {
    const resultados = await Promise.all(
      ids.map(async (id) => {
        const { count, error } = await supabase
          .from("menu_items")
          .select("id", { count: "exact", head: true })
          .eq("restaurante_id", id);

        if (error) throw error;
        return [id, count ?? 0] as const;
      }),
    );

    return new Map(resultados);
  } catch (error) {
    console.warn(
      "[Supabase][explorar] No se pudieron contar los platillos:",
      mensajeDeError(error),
    );
    return null;
  }
}
