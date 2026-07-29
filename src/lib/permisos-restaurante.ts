/**
 * REPARTO DE CAMPOS DEL RESTAURANTE SEGÚN EL ROL.
 *
 * El editor en vivo manda un puñado de campos y aquí se decide cuáles puede
 * escribir quien los manda. La separación es el corazón de los dos niveles de
 * edición:
 *
 *   dueño        -> su información (nombre, eslogan)
 *   super admin  -> además, el DISEÑO (color, cabecera, disposición, portada, logo)
 *
 * ⚠️ VIVE EN UN MÓDULO APARTE PARA PODER PROBARLO
 * Es la comprobación que impide que un restaurantero cambie el aspecto de la
 * plataforma. Enterrada dentro del route handler solo se podría verificar
 * levantando el servidor con sesiones reales de cada rol; aquí se prueba
 * directamente, que es lo que corresponde a una regla de autorización.
 *
 * Que la interfaz no dibuje el lápiz de la cabecera para el dueño es una
 * cortesía visual. ESTA función es el permiso.
 */

/** Campos que puede tocar el dueño del restaurante. */
export const CAMPOS_DUENO = ["nombre", "eslogan"] as const;

/** Campos reservados al super admin: afectan al diseño de la plataforma. */
export const CAMPOS_PLATAFORMA = [
  "color_primario",
  "header_style",
  "menu_layout",
  "portada_url",
  "logo_url",
] as const;

export type CampoDueno = (typeof CAMPOS_DUENO)[number];
export type CampoPlataforma = (typeof CAMPOS_PLATAFORMA)[number];
export type CampoRestaurante = CampoDueno | CampoPlataforma;

export type PayloadRestaurante = { slug?: string } & Partial<
  Record<CampoRestaurante, string | null>
>;

export type ResultadoReparto =
  | { ok: true; cambios: Record<string, string | null> }
  | { ok: false; estado: 400 | 403; error: string };

/**
 * Filtra y valida el payload. Devuelve solo las columnas que se pueden escribir.
 *
 * Se ignoran en silencio las claves desconocidas —en lugar de fallar— porque un
 * cliente que mande un campo de más no es un ataque ni un error del usuario, y
 * rechazar toda la petición por eso rompería la edición por un detalle.
 * Lo que NUNCA se ignora en silencio es pedir un campo de plataforma sin ser
 * super admin: eso se responde con un 403 explícito, porque la persona necesita
 * saber por qué su cambio no se aplicó.
 */
export function repartirCampos(
  payload: PayloadRestaurante,
  esSuperAdmin: boolean,
): ResultadoReparto {
  const cambios: Record<string, string | null> = {};

  // --- Campos del dueño ---
  for (const campo of CAMPOS_DUENO) {
    const valor = payload[campo];
    if (valor === undefined) continue;

    if (campo === "nombre" && !valor?.trim()) {
      return {
        ok: false,
        estado: 400,
        error: "El nombre del restaurante no puede quedar vacío.",
      };
    }

    cambios[campo] = typeof valor === "string" ? valor.trim() || null : valor;
  }

  // --- Campos de plataforma ---
  const pedidos = CAMPOS_PLATAFORMA.filter(
    (campo) => payload[campo] !== undefined,
  );

  if (pedidos.length > 0 && !esSuperAdmin) {
    return {
      ok: false,
      estado: 403,
      error: `Solo el administrador de la plataforma puede cambiar el diseño (${pedidos.join(", ")}).`,
    };
  }

  for (const campo of pedidos) {
    const valor = payload[campo];
    // `pedidos` ya excluyó los `undefined`, pero TypeScript no puede seguir ese
    // razonamiento a través del `filter`, así que se comprueba otra vez.
    if (valor === undefined) continue;

    if (campo === "header_style" && !["solid", "glass"].includes(valor ?? "")) {
      return {
        ok: false,
        estado: 400,
        error: "El estilo de cabecera solo puede ser 'solid' o 'glass'.",
      };
    }
    if (campo === "menu_layout" && !["list", "grid"].includes(valor ?? "")) {
      return {
        ok: false,
        estado: 400,
        error: "La disposición del menú solo puede ser 'list' o 'grid'.",
      };
    }
    if (campo === "color_primario" && !/^#[0-9a-fA-F]{6}$/.test(valor ?? "")) {
      return {
        ok: false,
        estado: 400,
        error: "El color debe ir en hexadecimal, por ejemplo #DC2626.",
      };
    }

    cambios[campo] = typeof valor === "string" ? valor.trim() || null : valor;
  }

  if (Object.keys(cambios).length === 0) {
    return { ok: false, estado: 400, error: "No hay nada que cambiar." };
  }

  return { ok: true, cambios };
}
