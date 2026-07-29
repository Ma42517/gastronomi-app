import { createAdminClient } from "@/lib/supabase/admin";
import {
  RESTAURANTE_SLUG,
  servicioConfigurado,
  supabaseConfigurado,
} from "@/lib/supabase/config";
import { mensajeDeError } from "@/lib/supabase/errores";

/**
 * CALIFICACIÓN DEL MESERO — POST /api/calificacion
 *
 * La deja el COMENSAL, que no está autenticado. Por eso la escritura pasa por
 * aquí y no directo a Supabase: si el rol público pudiera insertar en la tabla,
 * cualquiera podría inundarla de reseñas falsas desde la consola del navegador.
 * Esta ruta valida y escribe con la Secret key, que nunca sale del servidor.
 *
 * Cuerpo: { slug, mesa, estrellas, etiquetas, comentario, propina, total }
 */

export const dynamic = "force-dynamic";

/** Longitud máxima del comentario: evita que alguien guarde una novela. */
const MAX_COMENTARIO = 500;

/** Etiquetas aceptadas. Se valida contra la lista para no guardar basura. */
const ETIQUETAS_VALIDAS = new Set([
  "amable",
  "rapido",
  "atento",
  "recomendo-bien",
  "buen-ambiente",
  "lento",
  "distraido",
]);

interface Cuerpo {
  slug?: string;
  mesa?: string;
  estrellas?: number;
  etiquetas?: string[];
  comentario?: string;
  propina?: number;
  total?: number;
}

export async function POST(req: Request) {
  if (!supabaseConfigurado() || !servicioConfigurado()) {
    // 503 y no 500: no es un fallo, es que esta instalación no guarda datos.
    // El cliente lo trata como "gracias" y no muestra un error al comensal.
    return Response.json(
      { error: "Supabase no está configurado.", configurado: false },
      { status: 503 },
    );
  }

  try {
    const cuerpo = (await req.json()) as Cuerpo;

    const estrellas = Number(cuerpo.estrellas);
    if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) {
      return Response.json(
        { error: "Las estrellas deben ser un entero de 1 a 5." },
        { status: 400 },
      );
    }

    const propina = Number(cuerpo.propina ?? 0);
    const total = Number(cuerpo.total ?? 0);
    if (propina < 0 || total < 0 || !Number.isFinite(propina) || !Number.isFinite(total)) {
      return Response.json(
        { error: "Propina y total deben ser números positivos." },
        { status: 400 },
      );
    }

    // Se filtran las etiquetas contra la lista blanca en lugar de rechazar la
    // petición: si el catálogo cambia, una etiqueta vieja no debe tirar la
    // valoración completa.
    const etiquetas = (cuerpo.etiquetas ?? []).filter((e) =>
      ETIQUETAS_VALIDAS.has(e),
    );

    const supabase = createAdminClient();
    const slug = cuerpo.slug?.trim() || RESTAURANTE_SLUG;

    const { data: restaurante, error: errorRest } = await supabase
      .from("restaurantes")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (errorRest) throw errorRest;
    if (!restaurante) {
      return Response.json(
        { error: `No existe el restaurante "${slug}".` },
        { status: 404 },
      );
    }

    const { error } = await supabase.from("calificaciones").insert({
      restaurante_id: (restaurante as { id: string }).id,
      mesa: cuerpo.mesa?.trim() || null,
      estrellas,
      etiquetas,
      comentario: cuerpo.comentario?.trim().slice(0, MAX_COMENTARIO) || null,
      propina,
      total_pagado: total,
    } as never);

    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[calificacion] POST:", mensaje);

    // Si falta la tabla se avisa con la migración concreta.
    if (/does not exist|schema cache/i.test(mensaje)) {
      return Response.json(
        {
          error:
            "Falta la tabla de calificaciones. Corre supabase/migrations/008_calificaciones.sql.",
        },
        { status: 503 },
      );
    }

    return Response.json({ error: mensaje }, { status: 500 });
  }
}
