"use client";

import type { ReactNode } from "react";
import { Pencil } from "lucide-react";
import { useModoEdicion, puedeEditarDiseno } from "@/lib/modo-edicion";

/**
 * ZONA EDITABLE — envuelve un componente del cliente sin tocarlo.
 *
 * Es la pieza que hace posible el constructor visual sin duplicar la interfaz:
 * los componentes de dentro son EXACTAMENTE los que ve el comensal. Este
 * envoltorio solo añade, cuando el modo edición está encendido, un aro
 * discontinuo al pasar el cursor y un lápiz en la esquina.
 *
 * CON EL MODO APAGADO NO PINTA NADA
 * Devuelve los hijos tal cual, sin un `<div>` de más. Es importante: un
 * contenedor extra alteraría el flujo de la cuadrícula del menú y cambiaría el
 * diseño del cliente, que es justo lo que no se puede tocar.
 */

interface EditableProps {
  children: ReactNode;
  /** Qué se abre al pulsar. */
  onEditar: () => void;
  /** Texto del `title` y de accesibilidad. Ej. "Editar el eslogan". */
  etiqueta: string;
  /**
   * `diseno`: solo el super admin puede tocarlo (cabecera, colores, portada).
   * `contenido`: cualquiera que pueda editar el restaurante (platillos, textos).
   */
  nivel?: "contenido" | "diseno";
  /** Clases del envoltorio. Por defecto `block`, que no altera el flujo. */
  className?: string;
  /**
   * Aparta el lápiz del borde. Las tarjetas de platillo ya llevan su propio
   * badge "Personalizar" arriba a la derecha, así que ahí el lápiz se saca
   * FUERA del recuadro para que no se solapen.
   */
  lapizFuera?: boolean;
}

export function Editable({
  children,
  onEditar,
  etiqueta,
  nivel = "contenido",
  className = "",
  lapizFuera = false,
}: EditableProps) {
  const modoEdicion = useModoEdicion((e) => e.modoEdicion);
  const rol = useModoEdicion((e) => e.rol);

  const permitido = nivel === "diseno" ? puedeEditarDiseno(rol) : Boolean(rol);

  // Apagado, o sin permiso para este nivel: los hijos salen intactos y sin
  // envoltorio. El restaurantero no ve ni el lápiz de la cabecera.
  if (!modoEdicion || !permitido) return <>{children}</>;

  return (
    <div className={`relative ${className}`}>
      {/* El contenido real, sin modificar. */}
      {children}

      {/*
        Capa que intercepta el toque y dibuja la guía. Cubre todo el hijo, así
        que en modo edición pulsar un platillo NO lo añade al carrito: abre su
        formulario. El aro va aquí —y no en clases del hijo— para no tener que
        tocar ni una línea de los componentes del cliente.

        EL ARO SE VE SIEMPRE, MÁS FUERTE AL PASAR EL CURSOR.
        Se pidió solo en `hover`, pero en un teléfono no hay cursor: las guías
        serían invisibles justo en el dispositivo donde se va a usar esto. Un aro
        tenue permanente responde a "qué puedo tocar" sin tener que adivinar, y el
        realce en `hover` sigue estando en escritorio.
      */}
      <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEditar();
          }}
          title={etiqueta}
          aria-label={etiqueta}
          data-editable={nivel}
          className="absolute inset-0 z-10 cursor-pointer rounded-2xl ring-2 ring-dashed ring-[color-mix(in_srgb,var(--brand,#DC2626)_45%,transparent)] transition hover:bg-[color-mix(in_srgb,var(--brand,#DC2626)_10%,transparent)] hover:ring-[var(--brand,#DC2626)]"
        >
          <span
            className={`absolute grid h-7 w-7 place-items-center rounded-full text-white shadow-lg ${
              lapizFuera ? "-right-2 -top-2" : "right-1 top-1"
            }`}
            style={{ background: "var(--brand, #DC2626)" }}
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
        </button>
    </div>
  );
}
