import { createAdminClient } from "@/lib/supabase/admin";
import { verificarDueno } from "@/lib/admin-auth";
import { verificarSuperAdmin } from "@/lib/dev-auth";
import { mensajeDeError } from "@/lib/supabase/errores";
import {
  COLUMNAS_ESPERADAS,
  sqlParaColumnasFaltantes,
  type ColumnaEsperada,
} from "@/lib/supabase/esquema-esperado";

/**
 * ¿QUÉ COLUMNAS LE FALTAN A LA BASE? — GET /api/admin/esquema
 *
 * Devuelve la lista de lo que falta y el SQL exacto para crearlo.
 *
 * POR QUÉ EXISTE
 * El aviso decía "falta correr 009 y 010", que obliga a abrir dos archivos del
 * repositorio, entender cuál de sus partes ya está aplicada y pegar SQL a ciegas.
 * Peor: no había forma de comprobar si funcionó salvo volver a intentar guardar un
 * platillo. Aquí se pregunta a la base de verdad y se entrega solo lo que falta.
 *
 * CÓMO SE COMPRUEBA
 * Pidiendo cada columna con un `select ... limit 0`. `information_schema` no está
 * expuesta por la API REST de Supabase, así que la vía practicable es intentar
 * leerla: si la columna no existe, PostgREST responde con un error específico.
 * Es una consulta que no devuelve filas, así que el coste es despreciable.
 */

export const dynamic = "force-dynamic";

async function autorizar(): Promise<Response | null> {
  const dueno = await verificarDueno();
  if (dueno.ok) return null;

  const plataforma = await verificarSuperAdmin();
  if (plataforma.ok) return null;

  return dueno.respuesta;
}

export async function GET() {
  const denegado = await autorizar();
  if (denegado) return denegado;

  try {
    const supabase = createAdminClient();

    const revisiones = await Promise.all(
      COLUMNAS_ESPERADAS.map(async (esperada) => {
        const { error } = await supabase
          .from(esperada.tabla)
          .select(esperada.columna)
          .limit(0);

        return { esperada, existe: !error, error: error ?? null };
      }),
    );

    const faltantes: ColumnaEsperada[] = revisiones
      .filter((r) => !r.existe)
      .map((r) => r.esperada);

    return Response.json({
      listo: faltantes.length === 0,
      faltantes: faltantes.map((c) => ({
        tabla: c.tabla,
        columna: c.columna,
        para: c.para,
        migracion: c.migracion,
      })),
      // Solo lo que falta: pegar el archivo entero funcionaría, pero es mucho
      // más texto y más fácil de estropear al copiar.
      sql: sqlParaColumnasFaltantes(faltantes),
      resumen:
        faltantes.length === 0
          ? "La base tiene todas las columnas que la aplicación necesita."
          : `Faltan ${faltantes.length} columna${faltantes.length === 1 ? "" : "s"}: ${faltantes
              .map((c) => `${c.tabla}.${c.columna}`)
              .join(", ")}.`,
    });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[admin/esquema] GET:", mensaje);
    return Response.json({ error: mensaje }, { status: 500 });
  }
}
