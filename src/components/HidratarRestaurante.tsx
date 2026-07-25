"use client";

import { useEffect } from "react";
import { useRestauranteStore } from "@/lib/restaurante-store";

interface Props {
  /**
   * Slug del restaurante a cargar, tomado de la URL (`/mesa/<slug>/<mesa>`).
   * Si se omite, se usa el configurado por defecto — es lo que hace el panel
   * del dueño, que administra un solo restaurante.
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
    void useRestauranteStore.getState().cargarDesdeNube(slug);
    // `slug` en las dependencias: si se navega de un restaurante a otro, hay
    // que volver a pedir el menú en lugar de quedarse con el anterior.
  }, [slug]);

  return null;
}
