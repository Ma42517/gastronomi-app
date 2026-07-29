"use client";

import { useEffect } from "react";
import { useRestauranteStore } from "@/lib/restaurante-store";
import { slugActivoCliente } from "@/lib/restaurante-activo";

interface Props {
  /**
   * Slug del restaurante a cargar, tomado de la URL (`/mesa/<slug>/<mesa>`).
   *
   * Si se omite —lo hace el panel de administración— se usa el restaurante
   * SELECCIONADO: la cookie que fija el super admin desde /admin/dev, con la
   * variable de entorno como respaldo. Antes aquí no se pasaba nada y el panel
   * quedaba atado al restaurante compilado en el despliegue.
   */
  slug?: string;
}

/**
 * Hidrata el store del restaurante DESPUÉS del montaje, en dos pasos.
 *
 * El store se crea con `skipHydration: true`, así que en el primer render tanto
 * el servidor como el cliente ven los datos del mock: idéntico árbol, cero
 * errores de hidratación de React. Aquí, ya en el navegador:
 *
 *   1. Se rehidrata la CACHÉ local, que pinta el menú al instante.
 *   2. Se pide a Supabase la versión autoritativa, que sobrescribe la caché.
 *
 * No renderiza nada.
 */
export function HidratarRestaurante({ slug }: Props) {
  useEffect(() => {
    void useRestauranteStore.persist.rehydrate();
    // La cookie se lee aquí y no en el render: en el servidor no existe, y
    // usarla arriba produciría dos árboles distintos y un error de hidratación.
    void useRestauranteStore.getState().cargarDesdeNube(slug ?? slugActivoCliente());
    // `slug` en las dependencias: si se navega de un restaurante a otro, hay
    // que volver a pedir el menú en lugar de quedarse con el anterior.
  }, [slug]);

  return null;
}
