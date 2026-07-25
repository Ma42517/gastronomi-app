import { createAdminClient } from "@/lib/supabase/admin";
import {
  RESTAURANTE_SLUG,
  servicioConfigurado,
  supabaseConfigurado,
} from "@/lib/supabase/config";
import {
  clasificarLlave,
  esLlavePrivilegiada,
  nombreLlave,
} from "@/lib/supabase/llaves";

/**
 * DIAGNÓSTICO DE LA CONEXIÓN — GET /api/admin/diagnostico
 *
 * Responde en lenguaje claro si la base de datos está lista, sin tener que
 * abrir el SQL Editor. Comprueba, en orden, los cuatro puntos donde realmente
 * falla una instalación:
 *
 *   1. ¿Están las variables de entorno? (y con el nombre correcto)
 *   2. ¿Responde Supabase? (URL y llaves válidas)
 *   3. ¿Existen las tablas y las columnas de la migración?
 *   4. ¿Hay datos sembrados?
 *
 * SEGURIDAD: nunca devuelve el valor de ninguna llave, solo si está presente y
 * sus últimos 4 caracteres cuando hace falta distinguir dos llaves parecidas.
 * Así se puede pegar la respuesta en un chat sin filtrar secretos.
 */

export const dynamic = "force-dynamic";

interface Chequeo {
  paso: string;
  ok: boolean;
  detalle: string;
  que_hacer?: string;
}

/**
 * Lista los NOMBRES de las variables relacionadas con Supabase o Postgres que
 * existen en el entorno. Nunca sus valores.
 *
 * Es la comprobación que distingue las dos causas de "todo AUSENTE":
 *   a) No se ha vuelto a desplegar -> la lista sale vacía.
 *   b) La integración usó otros nombres (SUPABASE_URL en vez de
 *      NEXT_PUBLIC_SUPABASE_URL) -> la lista sale con esos nombres.
 * Sin esto habría que adivinar entre las dos.
 */
function nombresDetectados(): string[] {
  return Object.keys(process.env)
    .filter((k) => /SUPABASE|POSTGRES/i.test(k))
    .sort();
}

export async function GET() {
  const chequeos: Chequeo[] = [];

  // --- 1. Variables de entorno ---------------------------------------------
  // Se aceptan los nombres sin prefijo como respaldo: la integración de Vercel
  // a veces solo define SUPABASE_URL / SUPABASE_ANON_KEY. En el SERVIDOR sirven
  // igual; lo que el NAVEGADOR necesita son las NEXT_PUBLIC_ (se incrustan en
  // el bundle al compilar y no se pueden leer en tiempo de ejecución).
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const detectadas = nombresDetectados();

  chequeos.push({
    paso: "0. Variables detectadas en el entorno",
    ok: detectadas.length > 0,
    detalle:
      detectadas.length > 0
        ? detectadas.join(", ")
        : "NINGUNA variable con SUPABASE o POSTGRES en el nombre",
    que_hacer:
      detectadas.length > 0
        ? undefined
        : "La integración no llegó a este deploy. Ve a Vercel > Deployments > (···) > Redeploy.",
  });

  // Aviso específico: existen las de servidor pero no las públicas.
  const faltanPublicas =
    !process.env.NEXT_PUBLIC_SUPABASE_URL &&
    Boolean(process.env.SUPABASE_URL);

  if (faltanPublicas) {
    chequeos.push({
      paso: "0b. Nombres de las variables",
      ok: false,
      detalle:
        "Existe SUPABASE_URL pero no NEXT_PUBLIC_SUPABASE_URL. El navegador solo puede leer las que empiezan por NEXT_PUBLIC_.",
      que_hacer:
        "Crea a mano NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY con el mismo valor, y vuelve a desplegar.",
    });
  }

  chequeos.push({
    paso: "1a. URL de Supabase",
    ok: Boolean(url),
    detalle: url ? `presente (${url})` : "AUSENTE",
    que_hacer: url
      ? undefined
      : "Añade NEXT_PUBLIC_SUPABASE_URL en Vercel > Settings > Environment Variables y vuelve a desplegar.",
  });

  // Se identifica el TIPO de cada llave. Supabase mantiene dos sistemas: el
  // nuevo (sb_publishable_ / sb_secret_) y el legacy (JWT eyJ…). Ambos valen.
  const tipoPublica = clasificarLlave(anon);
  const tipoServicio = clasificarLlave(service);

  chequeos.push({
    paso: "1b. Llave pública (navegador)",
    ok: Boolean(anon) && !esLlavePrivilegiada(tipoPublica),
    // Solo la cola de la llave: suficiente para distinguirla, inútil para robarla.
    detalle: anon
      ? `${nombreLlave(tipoPublica)} — …${anon.slice(-4)}`
      : "AUSENTE",
    que_hacer: !anon
      ? "Añade NEXT_PUBLIC_SUPABASE_ANON_KEY con tu Publishable key y vuelve a desplegar."
      : esLlavePrivilegiada(tipoPublica)
        ? "🚨 PELIGRO: pusiste la llave SECRETA en una variable NEXT_PUBLIC_. Next.js la incrusta en el bundle del navegador, así que es pública. Rótala en Supabase (Project Settings > API Keys) y pon ahí la Publishable key."
        : undefined,
  });

  chequeos.push({
    paso: "1c. Llave de servicio (SUPABASE_SERVICE_ROLE_KEY)",
    ok: Boolean(service) && esLlavePrivilegiada(tipoServicio),
    detalle: service
      ? `${nombreLlave(tipoServicio)} — …${service.slice(-4)}`
      : "AUSENTE",
    que_hacer: !service
      ? "Sin ella el panel puede LEER pero no GUARDAR. Añádela con tu Secret key (sb_secret_…), SIN el prefijo NEXT_PUBLIC_."
      : !esLlavePrivilegiada(tipoServicio)
        ? "Aquí va la Secret key (sb_secret_…), no la Publishable. Con la publishable, guardar fallará por RLS con un error confuso."
        : undefined,
  });

  // Si falta lo básico, no tiene sentido seguir intentando conectar.
  if (!supabaseConfigurado() || !servicioConfigurado()) {
    return Response.json(
      {
        listo: false,
        resumen:
          "Faltan variables de entorno. La app funciona en modo local (solo este navegador).",
        chequeos,
      },
      { status: 200 },
    );
  }

  // --- 2, 3 y 4: conexión, estructura y datos ------------------------------
  try {
    const supabase = createAdminClient();

    // Se piden justo las columnas de la migración: si alguna no existe,
    // Postgres devuelve un error que nombra la columna que falta.
    const { data: restaurantes, error: errorEstructura } = await supabase
      .from("restaurantes")
      .select("id, slug, sellos_para_recompensa, imagen_premio, color_primario")
      .limit(5);

    if (errorEstructura) {
      const mensaje = errorEstructura.message;
      const faltaTabla = /does not exist|schema cache/i.test(mensaje);
      // Sin esta rama, una llave inválida se reportaba como "falta estructura",
      // mandando al usuario a correr un SQL que no arreglaría nada.
      const llaveInvalida =
        /invalid api key|invalid jwt|jwt expired|unauthorized|no api key/i.test(
          mensaje,
        );

      chequeos.push({
        paso: "2. Conexión y estructura",
        ok: false,
        detalle: mensaje,
        que_hacer: llaveInvalida
          ? "La llave no es válida para este proyecto. Verifica que la URL y las llaves salgan del MISMO proyecto de Supabase (Project Settings > API Keys)."
          : faltaTabla
            ? "Corre supabase/INSTALACION-COMPLETA.sql en el SQL Editor de Supabase."
            : "Revisa el mensaje: suele ser una columna que falta (corre la migración 001).",
      });

      return Response.json(
        {
          listo: false,
          resumen: llaveInvalida
            ? "Las llaves no son válidas para este proyecto de Supabase."
            : faltaTabla
              ? "Conecta con Supabase, pero las tablas no existen todavía."
              : "Conecta con Supabase, pero falta parte de la estructura.",
          chequeos,
        },
        { status: 200 },
      );
    }

    chequeos.push({
      paso: "2. Conexión y estructura",
      ok: true,
      detalle: "Supabase responde y las columnas del panel existen.",
    });

    // Menú: se piden también las columnas nuevas para validarlas de una vez.
    const { data: platillos, error: errorMenu } = await supabase
      .from("menu_items")
      .select("id, slug, emoji, modifiers, is_popular, disponible");

    if (errorMenu) {
      chequeos.push({
        paso: "3. Tabla menu_items",
        ok: false,
        detalle: errorMenu.message,
        que_hacer:
          "Corre supabase/INSTALACION-COMPLETA.sql (incluye la migración 001).",
      });
      return Response.json(
        {
          listo: false,
          resumen: "Falta la tabla menu_items o sus columnas nuevas.",
          chequeos,
        },
        { status: 200 },
      );
    }

    chequeos.push({
      paso: "3. Tabla menu_items",
      ok: true,
      detalle: "Existe con slug, emoji, modifiers e is_popular.",
    });

    // --- 4. Datos ----------------------------------------------------------
    const miRestaurante = (restaurantes ?? []).find(
      (r) => r.slug === RESTAURANTE_SLUG,
    );
    const totalPlatillos = platillos?.length ?? 0;

    chequeos.push({
      paso: `4a. Restaurante "${RESTAURANTE_SLUG}"`,
      ok: Boolean(miRestaurante),
      detalle: miRestaurante ? "sembrado" : "no existe todavía",
      que_hacer: miRestaurante
        ? undefined
        : 'Entra a /admin y pulsa "Publicar en Supabase".',
    });

    chequeos.push({
      paso: "4b. Platillos en el menú",
      ok: totalPlatillos > 0,
      detalle: `${totalPlatillos} platillo(s)`,
      que_hacer:
        totalPlatillos > 0
          ? undefined
          : 'Entra a /admin y pulsa "Publicar en Supabase".',
    });

    const sembrado = Boolean(miRestaurante) && totalPlatillos > 0;

    return Response.json({
      listo: sembrado,
      resumen: sembrado
        ? `✅ Todo listo. ${totalPlatillos} platillos en la nube.`
        : '⚠️ Base de datos conectada y con la estructura correcta, pero vacía. Entra a /admin y pulsa "Publicar en Supabase".',
      chequeos,
    });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error desconocido";
    chequeos.push({
      paso: "2. Conexión",
      ok: false,
      detalle: mensaje,
      que_hacer:
        "Revisa que la URL y las llaves correspondan al MISMO proyecto de Supabase.",
    });
    return Response.json(
      { listo: false, resumen: "No se pudo conectar con Supabase.", chequeos },
      { status: 200 },
    );
  }
}
