import { createAdminClient } from "@/lib/supabase/admin";
import {
  CONFIG_POR_DEFECTO,
  filaAConfig,
  type ConfigPlataforma,
} from "@/lib/config-plataforma";

/**
 * CANDADOS DE LA PLATAFORMA — verificación en el servidor.
 *
 * Los candados que define el super admin (si el dueño puede cambiar precios,
 * crear platillos, borrarlos o tocar las recompensas) NO pueden aplicarse solo
 * ocultando botones: quien quiera saltárselos llamaría a la API directamente con
 * `curl`. Se comprueban aquí, en el mismo punto donde se escribe.
 *
 * Si los ajustes no se pueden leer, se devuelven los valores por defecto, que
 * son PERMISIVOS. Es deliberado: un fallo de lectura o una migración pendiente
 * no debe dejar al dueño sin poder trabajar en su propio menú.
 */
export async function leerConfigServidor(): Promise<ConfigPlataforma> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("plataforma_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) return CONFIG_POR_DEFECTO;
    return filaAConfig(data as Record<string, unknown>);
  } catch {
    return CONFIG_POR_DEFECTO;
  }
}

/** Respuesta 403 uniforme cuando un candado bloquea la operación. */
export function bloqueado(motivo: string): Response {
  return Response.json(
    {
      error: `${motivo} El dueño de la aplicación tiene esta acción bloqueada.`,
      bloqueadoPorPlataforma: true,
    },
    { status: 403 },
  );
}
