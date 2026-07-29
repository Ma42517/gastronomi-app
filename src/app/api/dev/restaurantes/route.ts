import { createAdminClient } from "@/lib/supabase/admin";
import { verificarSuperAdmin } from "@/lib/dev-auth";
import { mensajeDeError } from "@/lib/supabase/errores";
import { PERSONALIZACION, guardarTolerando } from "@/lib/columnas-pendientes";

/**
 * GESTIÓN DE RESTAURANTES DE LA PLATAFORMA — solo super admin.
 *
 *   GET    /api/dev/restaurantes                  -> lista con conteos
 *   POST   /api/dev/restaurantes                  -> crear
 *   PATCH  /api/dev/restaurantes                  -> editar
 *   DELETE /api/dev/restaurantes?id=…&confirmar=slug -> borrar
 *
 * Toda petición pasa por `verificarSuperAdmin()`. Estas operaciones son de otro
 * orden que las del panel del dueño: aquí se puede borrar un restaurante con su
 * menú y su historial completo.
 */

export const dynamic = "force-dynamic";

/** Campos que el super admin puede escribir. */
interface RestaurantePayload {
  id?: string;
  slug: string;
  nombre: string;
  eslogan?: string | null;
  color_primario?: string;
  iniciales?: string | null;
  portada_url?: string | null;
  logo_url?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  moneda?: string;
  activo?: boolean;
  sellos_para_recompensa?: number;
  descripcion_recompensa?: string | null;
  imagen_premio?: string | null;
  // --- Personalización (migración 010) ---
  header_style?: string;
  menu_layout?: string;
  whatsapp_number?: string | null;
  instagram_url?: string | null;
}

/**
 * WhatsApp exige el número en formato internacional y SIN signos: el enlace
 * `wa.me/+52 55 1234 5678` no abre nada. Se limpia aquí en lugar de exigirle al
 * dueño que lo teclee perfecto.
 */
function normalizarWhatsApp(valor: string | null | undefined): string | null {
  const digitos = (valor ?? "").replace(/\D/g, "");
  return digitos.length > 0 ? digitos : null;
}

/**
 * Se acepta lo que la gente pega de verdad —`@mitaqueria`, `instagram.com/x`, la
 * URL completa— y se guarda siempre como URL absoluta, que es lo que necesita el
 * `href` del enlace.
 */
function normalizarInstagram(valor: string | null | undefined): string | null {
  const bruto = (valor ?? "").trim();
  if (!bruto) return null;
  if (/^https?:\/\//i.test(bruto)) return bruto;

  const usuario = bruto.replace(/^@/, "").replace(/^instagram\.com\//i, "");
  return usuario ? `https://instagram.com/${usuario}` : null;
}

/**
 * El slug vive en la URL pública (`/mesa/<slug>/4`), así que se normaliza en
 * lugar de confiar en lo que se teclee: sin acentos, sin espacios y en
 * minúsculas. Un slug con una "ñ" o un espacio produciría enlaces roebles.
 */
function normalizarSlug(valor: string): string {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function validar(p: RestaurantePayload): string | null {
  if (!p.nombre?.trim()) return "El nombre es obligatorio.";
  if (!normalizarSlug(p.slug ?? "")) {
    return "El identificador (slug) es obligatorio y debe tener letras o números.";
  }
  if (
    p.sellos_para_recompensa !== undefined &&
    (!Number.isInteger(p.sellos_para_recompensa) ||
      p.sellos_para_recompensa < 1)
  ) {
    return "Las visitas para la recompensa deben ser un entero mayor a 0.";
  }
  if (p.color_primario && !/^#[0-9a-fA-F]{6}$/.test(p.color_primario)) {
    return "El color debe ir en formato hexadecimal, por ejemplo #DC2626.";
  }
  // Se valida aquí además del `check` de Postgres para devolver un mensaje
  // legible: el error de restricción de la base no le dice nada a nadie.
  if (p.header_style && !["solid", "glass"].includes(p.header_style)) {
    return "El estilo del encabezado solo puede ser 'solid' o 'glass'.";
  }
  if (p.menu_layout && !["list", "grid"].includes(p.menu_layout)) {
    return "La disposición del menú solo puede ser 'list' o 'grid'.";
  }
  return null;
}

/** Convierte el payload en fila de base de datos, con valores por defecto. */
function aFila(p: RestaurantePayload) {
  return {
    slug: normalizarSlug(p.slug),
    nombre: p.nombre.trim(),
    eslogan: p.eslogan?.trim() || null,
    color_primario: p.color_primario || "#DC2626",
    // Iniciales de respaldo cuando no hay logo: se derivan del nombre.
    iniciales:
      p.iniciales?.trim().slice(0, 3).toUpperCase() ||
      p.nombre
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((palabra) => palabra[0]?.toUpperCase() ?? "")
        .join(""),
    portada_url: p.portada_url?.trim() || null,
    logo_url: p.logo_url?.trim() || null,
    direccion: p.direccion?.trim() || null,
    telefono: p.telefono?.trim() || null,
    moneda: p.moneda?.trim() || "MXN",
    activo: p.activo ?? true,
    sellos_para_recompensa: p.sellos_para_recompensa ?? 5,
    descripcion_recompensa: p.descripcion_recompensa?.trim() || "Premio sorpresa",
    imagen_premio: p.imagen_premio || null,
    // Los valores por defecto reproducen el aspecto que el menú ya tenía.
    header_style: p.header_style === "glass" ? "glass" : "solid",
    menu_layout: p.menu_layout === "list" ? "list" : "grid",
    whatsapp_number: normalizarWhatsApp(p.whatsapp_number),
    instagram_url: normalizarInstagram(p.instagram_url),
  };
}

// ---------------------------------------------------------------------------
// GET — listado
// ---------------------------------------------------------------------------
export async function GET() {
  const auth = await verificarSuperAdmin();
  if (!auth.ok) return auth.respuesta;

  try {
    const supabase = createAdminClient();

    const { data: restaurantes, error } = await supabase
      .from("restaurantes")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Los conteos se agregan en memoria en lugar de con subconsultas anidadas:
    // son dos consultas planas y evita depender de que las relaciones estén
    // declaradas en los tipos generados.
    const [{ data: platillos }, { data: duenos }] = await Promise.all([
      supabase.from("menu_items").select("restaurante_id, disponible"),
      supabase.from("restaurante_usuarios").select("restaurante_id"),
    ]);

    const lista = (restaurantes ?? []).map((r) => {
      const fila = r as { id: string } & Record<string, unknown>;
      const propios = (platillos ?? []).filter(
        (p) => (p as { restaurante_id: string }).restaurante_id === fila.id,
      );
      return {
        ...fila,
        total_platillos: propios.length,
        total_agotados: propios.filter(
          (p) => (p as { disponible: boolean }).disponible === false,
        ).length,
        total_duenos: (duenos ?? []).filter(
          (d) => (d as { restaurante_id: string }).restaurante_id === fila.id,
        ).length,
      };
    });

    return Response.json({ restaurantes: lista, via: auth.via });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[dev/restaurantes] GET:", mensaje);
    return Response.json({ error: mensaje }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — crear
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  const auth = await verificarSuperAdmin();
  if (!auth.ok) return auth.respuesta;

  try {
    const payload = (await req.json()) as RestaurantePayload;
    const fallo = validar(payload);
    if (fallo) return Response.json({ error: fallo }, { status: 400 });

    const supabase = createAdminClient();
    const fila = aFila(payload);

    // Se comprueba el slug antes de insertar para poder dar un mensaje claro:
    // el error de restricción única de Postgres no le dice nada a nadie.
    const { data: existente } = await supabase
      .from("restaurantes")
      .select("id")
      .eq("slug", fila.slug)
      .maybeSingle();

    if (existente) {
      return Response.json(
        { error: `Ya existe un restaurante con el identificador "${fila.slug}".` },
        { status: 409 },
      );
    }

    const { data, error, aviso } = await guardarTolerando(
      PERSONALIZACION,
      (f) =>
        supabase
          .from("restaurantes")
          .insert(f as never)
          .select("id, slug")
          .single(),
      fila,
    );

    if (error) throw error;

    return Response.json({ ok: true, restaurante: data, aviso });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[dev/restaurantes] POST:", mensaje);
    return Response.json({ error: mensaje }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH — editar
// ---------------------------------------------------------------------------
export async function PATCH(req: Request) {
  const auth = await verificarSuperAdmin();
  if (!auth.ok) return auth.respuesta;

  try {
    const payload = (await req.json()) as RestaurantePayload;
    if (!payload.id) {
      return Response.json({ error: "Falta el id del restaurante." }, { status: 400 });
    }
    // Se copia a una constante porque más abajo se usa dentro de una función:
    // TypeScript no conserva ahí el estrechamiento del `if` de arriba, ya que no
    // puede garantizar que la propiedad no cambie entre medias.
    const id = payload.id;

    const fallo = validar(payload);
    if (fallo) return Response.json({ error: fallo }, { status: 400 });

    const supabase = createAdminClient();
    const fila = aFila(payload);

    // El slug no puede chocar con OTRO restaurante.
    const { data: choque } = await supabase
      .from("restaurantes")
      .select("id")
      .eq("slug", fila.slug)
      .neq("id", id)
      .maybeSingle();

    if (choque) {
      return Response.json(
        { error: `Otro restaurante ya usa el identificador "${fila.slug}".` },
        { status: 409 },
      );
    }

    const { error, aviso } = await guardarTolerando(
      PERSONALIZACION,
      (f) =>
        supabase
          .from("restaurantes")
          .update(f as never)
          .eq("id", id),
      fila,
    );

    if (error) throw error;
    return Response.json({ ok: true, aviso });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[dev/restaurantes] PATCH:", mensaje);
    return Response.json({ error: mensaje }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE — borrar
// ---------------------------------------------------------------------------
export async function DELETE(req: Request) {
  const auth = await verificarSuperAdmin();
  if (!auth.ok) return auth.respuesta;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const confirmar = url.searchParams.get("confirmar");

    if (!id) {
      return Response.json({ error: "Falta el id." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: restaurante, error: errorLectura } = await supabase
      .from("restaurantes")
      .select("id, slug, nombre")
      .eq("id", id)
      .maybeSingle();

    if (errorLectura) throw errorLectura;
    if (!restaurante) {
      return Response.json({ error: "Ese restaurante no existe." }, { status: 404 });
    }

    const objetivo = restaurante as { slug: string; nombre: string };

    // DOBLE CONFIRMACIÓN: el cliente debe reenviar el slug exacto. Un `id` en la
    // URL es fácil de disparar por accidente (o de repetir desde el historial);
    // teclear el identificador obliga a un acto deliberado. El borrado arrastra
    // en cascada el menú, las sesiones y el historial de lealtad.
    if (confirmar !== objetivo.slug) {
      return Response.json(
        {
          error: `Para borrar "${objetivo.nombre}" hay que confirmar con su identificador exacto: ${objetivo.slug}`,
        },
        { status: 428 },
      );
    }

    const { error } = await supabase.from("restaurantes").delete().eq("id", id);
    if (error) throw error;

    return Response.json({ ok: true, borrado: objetivo.slug });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[dev/restaurantes] DELETE:", mensaje);
    return Response.json({ error: mensaje }, { status: 500 });
  }
}
