"use client";

import { useEffect, useState } from "react";
import type { MenuItemMock } from "@/lib/mock-data";

/**
 * LOS MÁS PEDIDOS DEL RESTAURANTE.
 *
 * Pregunta a `/api/populares`, que cuenta los pedidos reales con la llave de
 * servicio. Mientras responde —o si no hay datos— se cae a la marca manual
 * `isPopular`, así que la sección nunca aparece vacía ni parpadea.
 *
 * ESTA LISTA NO ES EDITABLE. Sale de lo que la gente pide de verdad, y ahí está su
 * valor: un "más popular" que el dueño pudiera elegir a dedo sería otra sección de
 * destacados, y de esas ya hay una (la Selección del Chef).
 */
export function usePopulares(
  slug: string | undefined,
  menu: MenuItemMock[],
): MenuItemMock[] {
  const [ids, setIds] = useState<string[] | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelado = false;

    void fetch(`/api/populares?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json() as Promise<{ populares?: string[] }>)
      .then((d) => {
        if (!cancelado) setIds(d.populares ?? []);
      })
      .catch(() => {
        // Sin respuesta se usa el respaldo local: el menú no depende de esto.
        if (!cancelado) setIds(null);
      });

    return () => {
      cancelado = true;
    };
  }, [slug]);

  // Respaldo: lo que el dueño marcó como popular.
  if (!ids || ids.length === 0) return menu.filter((m) => m.isPopular);

  // Se respeta el ORDEN que devolvió el servidor (del más pedido al menos), y se
  // descartan los ids que ya no estén en el menú vivo: un platillo borrado no debe
  // reaparecer por haber sido popular.
  return ids
    .map((id) => menu.find((m) => m.id === id))
    .filter((m): m is MenuItemMock => Boolean(m));
}
