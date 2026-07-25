/**
 * COPILOTO DE IA — contrato compartido cliente/servidor.
 *
 * El copiloto sustituye la descripción estática del platillo por un texto que
 * reacciona en tiempo real a los modificadores que elige el cliente
 * ("Elige tu salsa", "Preparación", …).
 *
 * Contiene dos piezas:
 *  1. Los tipos del payload que viaja al endpoint `/api/copiloto`.
 *  2. Un GENERADOR LOCAL DE RESPALDO (determinista, sin red) que se usa para
 *     pintar el texto de inmediato mientras el modelo responde, y como
 *     fallback si la IA no está disponible (sin API key, timeout o error).
 *     Gracias a esto el "efecto copiloto" nunca se rompe.
 */

export interface OpcionElegida {
  id: string;
  nombre: string;
}

export interface GrupoElegido {
  id: string;
  titulo: string;
  opciones: OpcionElegida[];
}

export interface GrupoPendiente {
  id: string;
  titulo: string;
}

export interface CopilotoPayload {
  platillo: string;
  descripcion: string;
  categoria: string;
  /** Solo los grupos que YA tienen al menos una opción elegida. */
  grupos: GrupoElegido[];
  /** Grupos obligatorios que aún no se han elegido. */
  pendientes: GrupoPendiente[];
  /**
   * Complemento a ofrecer cuando el platillo ya está completo (ESTADO 2 de
   * venta cruzada). Los botones de bebida aparecen justo debajo de este texto,
   * así que el copiloto debe invitar a tomarlos.
   */
  complemento?: { nombre: string; motivo: string };
}

/**
 * Rasgo persuasivo de cada opción, en primera persona del mesero. Se redacta
 * como fragmento para poder encadenarlo en una frase natural.
 */
const RASGOS: Record<string, string> = {
  // --- Salsas ---
  roja: "la “Roja” para darle carácter sin que te queme",
  verde: "nuestra “Verde” fresca y con un picor balanceado",
  habanero: "la “Habanero” intensa, esa que solo piden los valientes",
  // --- Preparación ---
  "con-todo": "con todo, cebolla y cilantro, la experiencia completa",
  "sin-cebolla": "sin cebolla, para que nada se interponga entre tú y la carne",
  "sin-cilantro": "sin cilantro, limpio y al punto",
  sencillo: "sencillo, para el sabor más puro y directo",
  // --- Queso / extras ---
  "con-queso": "con queso fundido encima, como debe ser",
  "sin-queso": "sin queso, ligero y sin distracciones",
  chorizo: "con chorizo extra para un golpe de sabor picosito",
  champinones: "con champiñones, ese toque terroso y jugoso",
  doble: "en doble porción, porque con una no basta",
};

/** Invitación a elegir, según el grupo obligatorio que falta. */
const INVITACIONES: Record<string, string> = {
  salsa: "¿Con qué salsa vas a armar tu experiencia hoy?",
  prep: "¿Cómo te la preparamos?",
  queso: "¿La quieres con queso fundido o sin él?",
};

/** Une fragmentos con comas y una "y" final, sin sonar a lista de máquina. */
function unir(frases: string[]): string {
  if (frases.length === 0) return "";
  if (frases.length === 1) return frases[0];
  return `${frases.slice(0, -1).join(", ")} y ${frases[frases.length - 1]}`;
}

/**
 * Genera el texto del copiloto SIN llamar a la IA. Determinista e instantáneo:
 * se pinta en el mismo frame del toque para que la reacción se sienta inmediata.
 */
export function copilotoLocal(payload: CopilotoPayload): string {
  const { descripcion, grupos, pendientes } = payload;

  // --- Estado inicial: nada elegido todavía ---
  if (grupos.length === 0) {
    const invitacion = pendientes[0]
      ? (INVITACIONES[pendientes[0].id] ??
        `¿Cómo lo quieres? Elige tu ${pendientes[0].titulo.toLowerCase()}.`)
      : "";
    return invitacion ? `${descripcion} ${invitacion}` : descripcion;
  }

  // --- Ya eligió: se nombran sus decisiones y se justifican ---
  const frases = grupos.flatMap((g) =>
    g.opciones.map((o) => RASGOS[o.id] ?? `“${o.nombre}”`),
  );

  let texto = `¡Excelente! Va ${unir(frases)}.`;

  if (pendientes.length > 0) {
    const falta = pendientes[0];
    texto += ` Solo falta que definas ${falta.titulo.toLowerCase()} y quedamos.`;
  } else if (payload.complemento) {
    // ESTADO 2: los botones de bebida se pintan justo debajo de este texto.
    const razon = payload.complemento.motivo
      ? ` ${payload.complemento.motivo}`
      : "";
    texto += ` ¿Le sumas algo para tomar?${razon}`;
  } else {
    texto += " Así queda armado a tu medida.";
  }

  return texto;
}

/** Firma estable del payload: sirve de llave de caché y de dependencia. */
export function firmaPayload(payload: CopilotoPayload): string {
  const sel = payload.grupos
    .map((g) => `${g.id}:${g.opciones.map((o) => o.id).sort().join("+")}`)
    .sort()
    .join("|");
  return `${payload.platillo}#${sel}`;
}
