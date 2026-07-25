/**
 * AJUSTES GLOBALES DE LA PLATAFORMA — contrato compartido.
 *
 * Son las decisiones que pertenecen al dueño de la APP, no al de cada
 * restaurante: tipografía, formas de pago, promociones globales, comisión y los
 * candados que limitan lo que un dueño puede editar en su propio panel.
 */

export type MetodoPago = "efectivo" | "tarjeta" | "transferencia" | "codi";

export interface ConfigPlataforma {
  fuente: string;
  pagos_habilitados: MetodoPago[];
  promo_activa: boolean;
  promo_titulo: string | null;
  promo_mensaje: string | null;
  promo_color: string;
  comision_pct: number;
  dueno_puede_editar_precios: boolean;
  dueno_puede_crear_platillos: boolean;
  dueno_puede_borrar_platillos: boolean;
  dueno_puede_editar_recompensas: boolean;
}

/**
 * Valores por defecto.
 *
 * Los candados nacen ABIERTOS a propósito: si la migración 007 no se ha corrido
 * todavía, el dueño debe seguir pudiendo trabajar con normalidad. Un fallo de
 * lectura no debe convertirse en un bloqueo silencioso de su panel.
 */
export const CONFIG_POR_DEFECTO: ConfigPlataforma = {
  fuente: "sistema",
  pagos_habilitados: ["efectivo", "tarjeta", "transferencia"],
  promo_activa: false,
  promo_titulo: null,
  promo_mensaje: null,
  promo_color: "#7C3AED",
  comision_pct: 0,
  dueno_puede_editar_precios: true,
  dueno_puede_crear_platillos: true,
  dueno_puede_borrar_platillos: true,
  dueno_puede_editar_recompensas: true,
};

/** Catálogo de métodos de pago, para pintar la interfaz. */
export const METODOS_PAGO: { id: MetodoPago; nombre: string; emoji: string }[] = [
  { id: "efectivo", nombre: "Efectivo", emoji: "💵" },
  { id: "tarjeta", nombre: "Tarjeta", emoji: "💳" },
  { id: "transferencia", nombre: "Transferencia", emoji: "🏦" },
  { id: "codi", nombre: "CoDi / QR", emoji: "📱" },
];

/**
 * Tipografías disponibles.
 *
 * Se definen como PILAS de fuentes del sistema en lugar de webfonts. Motivo: en
 * Next.js las webfonts se resuelven en tiempo de compilación con `next/font`, así
 * que no se pueden elegir desde un panel en caliente sin volver a desplegar.
 * Estas pilas cambian el carácter de la app al instante y sin descargar nada.
 */
export const FUENTES: { id: string; nombre: string; pila: string }[] = [
  {
    id: "sistema",
    nombre: "Sistema (por defecto)",
    pila: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: "geometrica",
    nombre: "Geométrica",
    pila: "'Futura', 'Century Gothic', 'Avenir Next', 'Trebuchet MS', sans-serif",
  },
  {
    id: "humanista",
    nombre: "Humanista",
    pila: "'Optima', 'Gill Sans', 'Segoe UI', Candara, sans-serif",
  },
  {
    id: "editorial",
    nombre: "Editorial (con serifa)",
    pila: "'Georgia', 'Iowan Old Style', 'Times New Roman', serif",
  },
  {
    id: "condensada",
    nombre: "Condensada",
    pila: "'Oswald', 'Arial Narrow', 'Haettenschweiler', sans-serif",
  },
  {
    id: "monoespaciada",
    nombre: "Monoespaciada",
    pila: "'SF Mono', 'Cascadia Code', Menlo, Consolas, monospace",
  },
];

/** Pila CSS de una fuente por su id, con respaldo si el id no existe. */
export function pilaDeFuente(id: string): string {
  return (FUENTES.find((f) => f.id === id) ?? FUENTES[0]).pila;
}

/** Normaliza una fila de la base al contrato, tolerando nulos y tipos laxos. */
export function filaAConfig(fila: Record<string, unknown>): ConfigPlataforma {
  const pagos = fila.pagos_habilitados;

  return {
    fuente: typeof fila.fuente === "string" ? fila.fuente : "sistema",
    // `jsonb` puede llegar como array o como texto según el driver.
    pagos_habilitados: Array.isArray(pagos)
      ? (pagos as MetodoPago[])
      : typeof pagos === "string"
        ? (JSON.parse(pagos) as MetodoPago[])
        : CONFIG_POR_DEFECTO.pagos_habilitados,
    promo_activa: Boolean(fila.promo_activa),
    promo_titulo: (fila.promo_titulo as string | null) ?? null,
    promo_mensaje: (fila.promo_mensaje as string | null) ?? null,
    promo_color: (fila.promo_color as string) || "#7C3AED",
    // `numeric` de Postgres llega como string: sin Number() la comisión se
    // concatenaría en cualquier cálculo.
    comision_pct: Number(fila.comision_pct ?? 0),
    dueno_puede_editar_precios: fila.dueno_puede_editar_precios !== false,
    dueno_puede_crear_platillos: fila.dueno_puede_crear_platillos !== false,
    dueno_puede_borrar_platillos: fila.dueno_puede_borrar_platillos !== false,
    dueno_puede_editar_recompensas: fila.dueno_puede_editar_recompensas !== false,
  };
}
