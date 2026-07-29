"use client";

import { create } from "zustand";
import type { RolEdicion } from "@/app/api/admin/permisos/route";

/**
 * MODO EDICIÓN EN VIVO — estado global.
 *
 * Convierte la vista del comensal en un constructor visual: los MISMOS
 * componentes que ve el cliente, envueltos en zonas pulsables cuando el modo
 * está encendido.
 *
 * NOTA SOBRE LOS NOMBRES
 * En la petición se llamaban `isEditMode` y `userRole`. Aquí son `modoEdicion` y
 * `rol` porque todo el proyecto está en español (`estadoNube`, `slugActual`,
 * `errorNube`…) y mezclar idiomas en el mismo store obliga a recordar cuál toca
 * en cada línea. El comportamiento es exactamente el pedido; si prefieres los
 * nombres en inglés, es un renombrado mecánico.
 *
 * ⚠️ EL ROL QUE HAY AQUÍ NO AUTORIZA NADA
 * Lo dice el servidor (`/api/admin/permisos`) y solo sirve para decidir QUÉ
 * LÁPICES SE DIBUJAN. Cada guardado vuelve a comprobar el permiso en su ruta.
 * Si alguien pusiera `rol: "super_admin"` desde la consola del navegador, vería
 * aparecer los lápices del diseño y recibiría un 403 al intentar usarlos.
 */

interface EstadoEdicion {
  /** ¿Están activas las guías y las zonas pulsables? */
  modoEdicion: boolean;
  /** Rol según el servidor. `null` = no puede editar este restaurante. */
  rol: RolEdicion | null;
  /** Correo de quien edita, para mostrarlo en la barra. */
  email: string | null;
  /** Slug del restaurante cuyos permisos se consultaron. */
  slugConsultado: string | null;
  /** `true` mientras se pregunta al servidor: evita parpadeos en la barra. */
  consultando: boolean;

  /** Pregunta al servidor qué puede editar quien está viendo esta página. */
  cargarPermisos: (slug: string) => Promise<void>;
  alternarModoEdicion: () => void;
  salirDeEdicion: () => void;
  /**
   * Borra todo rastro de edición.
   *
   * Lo llama la vista del COMENSAL al montarse. El store es global y sobrevive a
   * la navegación del lado del cliente, así que sin esto un dueño que pasara del
   * editor al menú público seguiría viendo aros y lápices sobre una pantalla que
   * debe ser idéntica a la que ve su cliente.
   */
  desactivar: () => void;
}

export const useModoEdicion = create<EstadoEdicion>()((set, get) => ({
  modoEdicion: false,
  rol: null,
  email: null,
  slugConsultado: null,
  consultando: false,

  cargarPermisos: async (slug) => {
    // Ya se preguntó por este restaurante: no se repite en cada render.
    if (get().slugConsultado === slug || get().consultando) return;

    set({ consultando: true });
    try {
      const res = await fetch(
        `/api/admin/permisos?slug=${encodeURIComponent(slug)}`,
      );
      const datos = (await res.json()) as {
        rol?: RolEdicion | null;
        email?: string | null;
      };

      set({
        rol: datos.rol ?? null,
        email: datos.email ?? null,
        slugConsultado: slug,
        // Cambiar de restaurante APAGA el modo edición. Seguir encendido al
        // cambiar de negocio invita a editar el que no era.
        modoEdicion: false,
      });
    } catch {
      // Sin respuesta se asume que no se puede editar: el menú del comensal
      // debe seguir funcionando aunque la comprobación falle.
      set({ rol: null, email: null, slugConsultado: slug, modoEdicion: false });
    } finally {
      set({ consultando: false });
    }
  },

  alternarModoEdicion: () => {
    // Sin permiso no se puede encender, ni siquiera por accidente desde el
    // código: la barra ni se dibuja, pero la guarda se pone aquí también.
    if (!get().rol) return;
    set((estado) => ({ modoEdicion: !estado.modoEdicion }));
  },

  salirDeEdicion: () => set({ modoEdicion: false }),

  desactivar: () =>
    set({
      modoEdicion: false,
      rol: null,
      email: null,
      slugConsultado: null,
    }),
}));

/**
 * ¿Puede este rol editar el DISEÑO (cabecera, colores, portada, disposición)?
 *
 * Función y no un booleano guardado: el permiso se deriva del rol, y guardar
 * ambos permitiría que se contradijeran.
 */
export function puedeEditarDiseno(rol: RolEdicion | null): boolean {
  return rol === "super_admin";
}
