/**
 * OPCIONES DE UN GRUPO ⇄ UNA LÍNEA DE TEXTO
 *
 * En el editor de platillos los grupos de opciones se escriben en un solo campo,
 * separados por comas: para tres o cuatro salsas es mucho más rápido que una lista
 * con un input por opción. Este archivo es la traducción entre ese texto y los
 * datos.
 *
 * POR QUÉ EL PRECIO VA EN EL TEXTO
 * Hasta ahora este campo solo guardaba nombres, y eso tenía una consecuencia que
 * no se veía: al abrir un platillo con recargos —el Sándwich Clásico, cuya opción
 * "Grande" suma $30— el campo mostraba "Mediano, Grande", y al guardar se
 * reconstruían las opciones desde ese texto, TODAS a $0. Es decir: entrar al modal
 * y pulsar Guardar sin tocar nada borraba los recargos en silencio, y el menú
 * seguía ofreciendo el tamaño grande al precio del mediano.
 *
 * Con la sintaxis `Grande +$30` el texto vuelve a contener todo lo que hay en el
 * dato, así que el viaje ida y vuelta ya no pierde nada, y además el recargo se
 * puede crear desde la interfaz en lugar de solo desde la siembra.
 *
 * SIN COMAS DECIMALES: la coma ya separa opciones, así que "+30,50" se leería como
 * dos opciones. Los centavos se escriben con punto: `+$30.50`.
 */

/** La forma mínima de una opción. Coincide con `ModificadorOpcion`. */
export interface OpcionEditable {
  id: string;
  nombre: string;
  precio_extra?: number;
}

/**
 * Recargo al final del nombre: "+30", "+ 30", "+$30", "+$30.50".
 * Solo con `+`: cualquier otra cosa se queda dentro del nombre, que es visible y
 * corregible, en lugar de desaparecer.
 */
const RECARGO_AL_FINAL = /\s*\+\s*\$?\s*(\d+(?:\.\d{1,2})?)\s*$/;

/** Id legible y estable derivado del nombre (sin acentos ni signos). */
export const idDesdeNombre = (nombre: string) =>
  nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Importe tal como se escribe: sin decimales si es redondo. */
const importe = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, "");

/**
 * Dato → texto. Las opciones sin recargo salen solo con su nombre, para que un
 * grupo de salsas siga leyéndose "Roja, Verde, Habanero".
 */
export const opcionesATexto = (opciones: readonly OpcionEditable[]) =>
  opciones
    .map((o) =>
      o.precio_extra && o.precio_extra > 0
        ? `${o.nombre} +$${importe(o.precio_extra)}`
        : o.nombre,
    )
    .join(", ");

/**
 * Texto → dato. Los ids se derivan del nombre, así que reordenar el texto o
 * cambiarle el recargo a una opción no rompe las que ya estaban.
 */
export const textoAOpciones = (texto: string): OpcionEditable[] =>
  texto
    .split(",")
    .map((trozo) => {
      const bruto = trozo.trim();
      if (!bruto) return null;

      const encontrado = bruto.match(RECARGO_AL_FINAL);
      const nombre = encontrado
        ? bruto.slice(0, bruto.length - encontrado[0].length).trim()
        : bruto;

      // "+30" a secas no es una opción: no hay nada que elegir.
      if (!nombre) return null;

      const extra = encontrado ? Number(encontrado[1]) : 0;

      return {
        id: idDesdeNombre(nombre),
        nombre,
        // Solo se guarda si suma: así los grupos sin recargo quedan idénticos a
        // como estaban antes de que este campo entendiera precios.
        ...(extra > 0 ? { precio_extra: extra } : {}),
      };
    })
    .filter((o): o is OpcionEditable => o !== null);
