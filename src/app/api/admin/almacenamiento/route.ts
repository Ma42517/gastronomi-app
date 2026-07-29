import { createAdminClient } from "@/lib/supabase/admin";
import { verificarDueno } from "@/lib/admin-auth";
import { verificarSuperAdmin } from "@/lib/dev-auth";
import { mensajeDeError } from "@/lib/supabase/errores";
import { asegurarTodosLosBuckets, estadoBuckets } from "@/lib/supabase/buckets";

/**
 * ESTADO DEL ALMACENAMIENTO — GET / POST /api/admin/almacenamiento
 *
 *   GET  -> ¿existen los buckets? (no modifica nada)
 *   POST -> créalos si faltan, y dime qué pasó con cada uno
 *
 * POR QUÉ EXISTE
 * Cuando la subida falla por falta de buckets, el mensaje mandaba a correr un SQL
 * en el panel de Supabase. Para el dueño de un restaurante eso es un callejón sin
 * salida: no tiene por qué saber qué es un bucket, ni entrar a una consola de
 * base de datos para poder subir la foto de un taco.
 *
 * Con esta ruta, la propia interfaz ofrece un botón que lo resuelve. Y si de
 * verdad no se puede —porque la llave de servicio no tiene permiso—, se ve el
 * motivo exacto en lugar de un consejo genérico que quizá no aplique.
 */

export const dynamic = "force-dynamic";

/**
 * Mismo criterio que la ruta de subida: dueño del restaurante activo o super
 * admin. Preparar el almacenamiento es una operación de infraestructura, así que
 * no puede quedar abierta a cualquiera con una cuenta.
 */
async function autorizar(): Promise<Response | null> {
  const dueno = await verificarDueno();
  if (dueno.ok) return null;

  const plataforma = await verificarSuperAdmin();
  if (plataforma.ok) return null;

  // Se devuelve el error del dueño, que es el más informativo de los dos.
  return dueno.respuesta;
}

export async function GET() {
  const denegado = await autorizar();
  if (denegado) return denegado;

  try {
    const buckets = await estadoBuckets(createAdminClient());
    return Response.json({
      listo: buckets.every((b) => b.existe),
      buckets,
    });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[admin/almacenamiento] GET:", mensaje);
    return Response.json({ error: mensaje }, { status: 500 });
  }
}

export async function POST() {
  const denegado = await autorizar();
  if (denegado) return denegado;

  try {
    const buckets = await asegurarTodosLosBuckets(createAdminClient());
    const listo = buckets.every((b) => b.existe);

    return Response.json(
      {
        listo,
        buckets,
        // Un resumen en lenguaje llano: es lo que se le muestra a quien pulsó el
        // botón, que no tiene por qué interpretar una lista de estados.
        resumen: listo
          ? `Almacenamiento listo (${buckets
              .filter((b) => b.creadoAhora)
              .map((b) => b.bucket)
              .join(", ") || "ya existía"}).`
          : `No se pudo preparar: ${buckets
              .filter((b) => !b.existe)
              .map((b) => `${b.bucket} (${b.error})`)
              .join("; ")}`,
      },
      { status: listo ? 200 : 503 },
    );
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[admin/almacenamiento] POST:", mensaje);
    return Response.json({ error: mensaje }, { status: 500 });
  }
}
