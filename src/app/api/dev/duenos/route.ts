import { createAdminClient } from "@/lib/supabase/admin";
import { verificarSuperAdmin } from "@/lib/dev-auth";
import { mensajeDeError } from "@/lib/supabase/errores";

/**
 * GESTIÓN DE DUEÑOS DE CADA RESTAURANTE — solo super admin.
 *
 *   GET    /api/dev/duenos?restauranteId=…            -> lista con correos
 *   POST   /api/dev/duenos  { restauranteId, email }  -> dar acceso
 *   DELETE /api/dev/duenos?restauranteId=…&userId=…   -> quitar acceso
 *
 * Los correos se resuelven con funciones `security definer` (migración 006),
 * porque el cliente JS de Supabase no puede consultar el esquema `auth`.
 */

export const dynamic = "force-dynamic";

/** Mensaje claro cuando aún no se ha corrido la migración 006. */
function faltaMigracion(mensaje: string): boolean {
  return /does not exist|schema cache|could not find the function/i.test(mensaje);
}

// ---------------------------------------------------------------------------
// GET — quién administra este restaurante
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  const auth = await verificarSuperAdmin();
  if (!auth.ok) return auth.respuesta;

  const restauranteId = new URL(req.url).searchParams.get("restauranteId");
  if (!restauranteId) {
    return Response.json({ error: "Falta restauranteId." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("duenos_de_restaurante", {
      p_restaurante: restauranteId,
    });

    if (error) throw error;
    return Response.json({ duenos: data ?? [] });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[dev/duenos] GET:", mensaje);
    return Response.json(
      {
        error: faltaMigracion(mensaje)
          ? "Falta la migración 006. Córrela en el SQL Editor de Supabase."
          : mensaje,
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST — dar acceso a un correo
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  const auth = await verificarSuperAdmin();
  if (!auth.ok) return auth.respuesta;

  try {
    const { restauranteId, email, rol } = (await req.json()) as {
      restauranteId?: string;
      email?: string;
      rol?: "dueno" | "staff";
    };

    if (!restauranteId || !email?.trim()) {
      return Response.json(
        { error: "Hacen falta el restaurante y el correo." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // El usuario tiene que existir ya en Supabase Auth. Crearlo desde aquí
    // implicaría inventarle una contraseña, así que se prefiere un mensaje
    // explícito antes que una cuenta a medias.
    const { data: userId, error: errorBusqueda } = await supabase.rpc(
      "usuario_id_por_correo",
      { p_email: email.trim() },
    );

    if (errorBusqueda) throw errorBusqueda;

    if (!userId) {
      return Response.json(
        {
          error: `No hay ninguna cuenta con el correo ${email.trim()}. Créala primero en Supabase > Authentication > Users (marca "Auto Confirm User").`,
        },
        { status: 404 },
      );
    }

    const { error } = await supabase.from("restaurante_usuarios").upsert(
      {
        restaurante_id: restauranteId,
        user_id: userId,
        rol: rol ?? "dueno",
      } as never,
      { onConflict: "restaurante_id,user_id" },
    );

    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[dev/duenos] POST:", mensaje);
    return Response.json(
      {
        error: faltaMigracion(mensaje)
          ? "Falta la migración 006. Córrela en el SQL Editor de Supabase."
          : mensaje,
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE — quitar acceso
// ---------------------------------------------------------------------------
export async function DELETE(req: Request) {
  const auth = await verificarSuperAdmin();
  if (!auth.ok) return auth.respuesta;

  try {
    const url = new URL(req.url);
    const restauranteId = url.searchParams.get("restauranteId");
    const userId = url.searchParams.get("userId");

    if (!restauranteId || !userId) {
      return Response.json(
        { error: "Hacen falta restauranteId y userId." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Salvaguarda: no dejar un restaurante sin ningún dueño. Quedaría sin nadie
    // que pudiera editar su menú y habría que arreglarlo por SQL.
    const { data: actuales, error: errorLista } = await supabase.rpc(
      "duenos_de_restaurante",
      { p_restaurante: restauranteId },
    );
    if (errorLista) throw errorLista;

    if ((actuales ?? []).length <= 1) {
      return Response.json(
        {
          error:
            "Es el único dueño del restaurante. Añade otro antes de quitarlo, o el menú quedaría sin nadie que pueda editarlo.",
        },
        { status: 409 },
      );
    }

    const { error } = await supabase
      .from("restaurante_usuarios")
      .delete()
      .eq("restaurante_id", restauranteId)
      .eq("user_id", userId);

    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[dev/duenos] DELETE:", mensaje);
    return Response.json({ error: mensaje }, { status: 500 });
  }
}
