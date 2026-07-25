"use client";

import { useEffect } from "react";
import { useRestauranteStore } from "@/lib/restaurante-store";

/**
 * Rehidrata el store del restaurante DESPUÉS del montaje.
 *
 * El store se crea con `skipHydration: true`, así que en el primer render
 * tanto el servidor como el cliente ven los datos del mock: idéntico árbol,
 * cero errores de hidratación. Aquí, ya en el navegador, se cargan los cambios
 * que el administrador haya guardado en localStorage.
 *
 * No renderiza nada: se monta una vez en el layout de cada área (cliente y
 * admin) y desaparece.
 */
export function HidratarRestaurante() {
  useEffect(() => {
    useRestauranteStore.persist.rehydrate();
  }, []);

  return null;
}
