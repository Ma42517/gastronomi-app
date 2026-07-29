import { createAdminClient } from "@/lib/supabase/admin";
import { verificarDueno } from "@/lib/admin-auth";
import { verificarSuperAdmin } from "@/lib/dev-auth";
import { mensajeDeError } from "@/lib/supabase/errores";
import {
  asegurarBucket,
  esBucketInexistente,
  type BucketConocido,
} from "@/lib/supabase/buckets";

/**
 * PERMISO DE SUBIDA A SUPABASE STORAGE — solo servidor.
 *
 *   POST /api/admin/subir   { bucket, nombre, tipoMime }
 *   -> { url, token, path, publicUrl }
 *
 * ⚠️ AQUÍ NO VIAJA NINGÚN ARCHIVO, Y ES A PROPÓSITO
 * Esta ruta no recibe el archivo: devuelve una URL firmada para que el NAVEGADOR
 * lo suba directamente a Storage. Cuesta una petición más, pero es la única
 * forma que funciona de verdad:
 *
 *   1. Las funciones serverless de Vercel tienen un tope de 4,5 MB en el cuerpo
 *      de la petición. Un video de platillo de 8 MB fallaría con un error de
 *      plataforma imposible de explicar al dueño del restaurante.
 *   2. Pasar decenas de megabytes por nuestro servidor para reenviarlos a
 *      Storage es tiempo de función y ancho de banda pagados dos veces.
 *   3. La alternativa —dar permiso de escritura anónimo al bucket— convertiría
 *      el almacenamiento en alojamiento gratuito para cualquiera que leyera el
 *      JavaScript de la página.
 *
 * Con la URL firmada, el permiso lo concede el servidor tras comprobar la
 * sesión, y caduca. El navegador solo puede escribir en la ruta exacta que se
 * le autorizó.
 */

export const dynamic = "force-dynamic";

/** Buckets permitidos. Se valida contra esta lista y no contra lo que llegue. */
const BUCKETS = ["dish-media", "restaurant-media"] as const;
type Bucket = (typeof BUCKETS)[number];

/**
 * Tipos aceptados y su extensión. La comprobación real la hace Storage con el
 * `allowed_mime_types` del bucket (migración 010): esto es solo para dar un
 * mensaje claro antes de empezar, porque el archivo nunca pasa por aquí.
 */
const EXTENSIONES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

interface Peticion {
  bucket?: string;
  /** Nombre original, solo para conservar algo legible en la ruta. */
  nombre?: string;
  tipoMime?: string;
}

export async function POST(req: Request) {
  // --- Autorización ---
  // Primero como dueño del restaurante activo. Si eso falla (por ejemplo porque
  // el restaurante todavía no existe, al crear el primero desde el panel de
  // plataforma), se acepta al super admin. Un comensal con cuenta NO pasa por
  // ninguna de las dos vías.
  const auth = await verificarDueno();
  let carpeta: string;

  if (auth.ok) {
    carpeta = auth.restauranteId;
  } else {
    const plataforma = await verificarSuperAdmin();
    // Se devuelve el error de `verificarDueno`, que es el más informativo de los
    // dos ("inicia sesión", "no eres dueño de este restaurante"…).
    if (!plataforma.ok) return auth.respuesta;
    carpeta = "plataforma";
  }

  try {
    const { bucket, nombre, tipoMime } = (await req.json()) as Peticion;

    if (!BUCKETS.includes(bucket as Bucket)) {
      return Response.json(
        { error: `Bucket no permitido. Usa uno de: ${BUCKETS.join(", ")}.` },
        { status: 400 },
      );
    }

    const extension = tipoMime ? EXTENSIONES[tipoMime] : undefined;
    if (!extension) {
      return Response.json(
        {
          error:
            "Formato no admitido. Se aceptan JPG, PNG, WebP, AVIF y GIF para imágenes, y MP4, WebM o MOV para video.",
        },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const ruta = `${carpeta}/${nombreSeguro(nombre)}-${Date.now()}.${extension}`;

    const firmar = () =>
      supabase.storage.from(bucket as Bucket).createSignedUploadUrl(ruta);

    let { data, error } = await firmar();

    // AUTORREPARACIÓN: si el bucket no existe, se crea y se vuelve a intentar.
    //
    // Antes esto terminaba en un mensaje que mandaba al dueño del restaurante al
    // SQL Editor de Supabase. El bucket es una dependencia técnica nuestra y la
    // llave de servicio puede crearlo, así que hacerlo aquí es lo correcto.
    if (error && esBucketInexistente(error)) {
      const creado = await asegurarBucket(supabase, bucket as BucketConocido);

      if (!creado.ok) {
        return Response.json(
          {
            error: `El almacenamiento no está preparado y no se pudo crear solo. Motivo: ${creado.error}`,
            // Permite a la interfaz ofrecer el botón de "preparar" en lugar de
            // dejar al dueño en un callejón sin salida.
            sinStorage: true,
          },
          { status: 503 },
        );
      }

      ({ data, error } = await firmar());

      // Se creó el bucket y AUN ASÍ no se pudo firmar: no es "falta el bucket",
      // es otra cosa, y decir lo contrario mandaría a buscar donde no está.
      if (error) {
        return Response.json(
          {
            error: `El bucket "${bucket}" quedó creado, pero Storage sigue rechazando la subida: ${mensajeDeError(error)}`,
          },
          { status: 502 },
        );
      }
    }

    if (error) throw error;
    if (!data) throw new Error("Storage no devolvió la URL firmada.");

    // La URL pública se calcula aquí para que el navegador no tenga que
    // construirla a mano: si el proyecto cambia de dominio, este es el único
    // sitio que hay que tocar.
    const { data: publico } = supabase.storage
      .from(bucket as Bucket)
      .getPublicUrl(ruta);

    return Response.json({
      url: data.signedUrl,
      token: data.token,
      path: data.path,
      publicUrl: publico.publicUrl,
    });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[admin/subir] POST:", mensaje);

    // AQUÍ YA NO SE DIAGNOSTICA NADA SOBRE EL BUCKET.
    //
    // Antes este bloque tenía su propia expresión regular, más suelta que
    // `esBucketInexistente`, y por ese hueco respondía "no se encontró el
    // bucket" sin que la autorreparación se hubiera intentado siquiera. El
    // resultado era un mensaje que mandaba al SQL Editor cuando el problema podía
    // ser otro, y además idéntico al de "no se pudo crear": imposible saber cuál
    // de los dos había ocurrido.
    //
    // La única decisión sobre buckets vive arriba, con `esBucketInexistente`. Si
    // aun así el error habla de un bucket que falta, se reconoce como tal pero
    // diciendo que el intento de crearlo NO llegó a hacerse.
    if (esBucketInexistente(error)) {
      return Response.json(
        {
          error: `Storage dice que falta el bucket, pero el intento de crearlo no se ejecutó. Detalle: ${mensaje}`,
          sinStorage: true,
        },
        { status: 503 },
      );
    }

    return Response.json({ error: mensaje }, { status: 500 });
  }
}

/**
 * Deja el nombre del archivo en algo seguro para una URL.
 *
 * El nombre original se conserva —recortado— porque ayuda a reconocer el archivo
 * en el panel de Storage; la unicidad la garantiza la marca de tiempo que se le
 * añade fuera, no el nombre.
 */
function nombreSeguro(nombre: string | undefined): string {
  const base = (nombre ?? "archivo")
    .replace(/\.[^.]+$/, "") // fuera la extensión: la pone el tipo MIME
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return base || "archivo";
}
