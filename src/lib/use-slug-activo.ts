"use client";

import { useEffect, useState } from "react";
import { useRestauranteStore } from "@/lib/restaurante-store";
import { slugActivoCliente } from "@/lib/restaurante-activo";
import { RESTAURANTE_SLUG } from "@/lib/supabase/config";

/**
 * Slug del restaurante que este navegador está administrando.
 *
 * Existe para que haya UNA sola respuesta a esa pregunta. Se resolvía por
 * separado en cada sitio que la necesitaba, y las respuestas se contradecían: el
 * rótulo del panel podía decir un restaurante mientras el enlace "Ver como
 * cliente" abría el de otro.
 *
 * El orden de preferencia es deliberado:
 *   1. `slugActual` del store — lo que de verdad se cargó de la base de datos.
 *   2. La cookie de selección — lo que se pidió, aunque aún no haya respondido
 *      la red (o no haya Supabase configurado).
 *   3. La variable de entorno — el respaldo de una instalación de un solo
 *      restaurante.
 *
 * La cookie se lee en un efecto y no durante el render porque en el servidor no
 * existe: usarla al pintar daría un marcado distinto en cada lado y React
 * avisaría de un error de hidratación.
 */
export function useSlugActivo(): string {
  const slugStore = useRestauranteStore((s) => s.slugActual);
  const [slugCookie, setSlugCookie] = useState<string | null>(null);

  useEffect(() => setSlugCookie(slugActivoCliente()), []);

  return slugStore ?? slugCookie ?? RESTAURANTE_SLUG;
}
