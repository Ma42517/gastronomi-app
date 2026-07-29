import { createAdminClient } from "@/lib/supabase/admin";
import { verificarDueno } from "@/lib/admin-auth";
import { verificarSuperAdmin } from "@/lib/dev-auth";
import { mensajeDeError } from "@/lib/supabase/errores";
import {
  asegurarBucket,
  esBucketInexistente,
  type BucketConocido,
} from "@/lib/supabase/buckets";
import { traducirFalloStorage } from "@/lib/supabase/mensajes-storage";

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

/**
 * Autorización compartida por las dos vías de subida.
 *
 * Primero como dueño del restaurante activo. Si eso falla (por ejemplo porque el
 * restaurante todavía no existe, al crear el primero desde el panel de
 * plataforma), se acepta al super admin. Un comensal con cuenta NO pasa por
 * ninguna de las dos vías.
 *
 * Devuelve la carpeta donde guardar, que es el id del restaurante: así los
 * archivos quedan agrupados por negocio en el panel de Storage.
 */
async function autorizarSubida(): Promise<
  { carpeta: string } | { respuesta: Response }
> {
  const auth = await verificarDueno();
  if (auth.ok) return { carpeta: auth.restauranteId };

  const plataforma = await verificarSuperAdmin();
  // Se devuelve el error de `verificarDueno`, que es el más informativo de los
  // dos ("inicia sesión", "no eres dueño de este restaurante"…).
  if (!plataforma.ok) return { respuesta: auth.respuesta };

  return { carpeta: "plataforma" };
}

export async function POST(req: Request) {
  const auth = await autorizarSubida();
  if ("respuesta" in auth) return auth.respuesta;
  const carpeta = auth.carpeta;

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

    // ===== AUTORREPARACIÓN, SIN ADIVINAR POR EL TEXTO DEL ERROR =====
    //
    // Aquí antes se leía el mensaje de Storage buscando la palabra "bucket" para
    // decidir si crearlo. Fue un error de método y falló en cuanto Storage
    // respondió con otra redacción: ante "The related resource does not exist"
    // —un 404 genérico— la creación no se intentaba siquiera, y el dueño recibía
    // un mensaje en inglés sin ninguna salida.
    //
    // Ahora no se interpreta nada: si firmar falla POR CUALQUIER MOTIVO, se
    // asegura el bucket y se reintenta una vez. Crear un bucket que ya existe es
    // idempotente y cuesta una llamada, así que el precio de intentarlo de más es
    // irrelevante comparado con el de no intentarlo cuando hacía falta.
    if (error) {
      const detalleOriginal = mensajeDeError(error);
      const creado = await asegurarBucket(supabase, bucket as BucketConocido);

      if (creado.ok) ({ data, error } = await firmar());

      if (error || !data) {
        const detalle = error ? mensajeDeError(error) : detalleOriginal;

        return Response.json(
          {
            error: traducirFalloStorage(detalle, bucket as string, creado.ok),
            // Siempre `sinStorage`: la interfaz debe poder ofrecer la reparación
            // manual y la subida por el servidor, en lugar de dejar un mensaje
            // muerto en pantalla.
            sinStorage: true,
            detalle,
          },
          { status: 503 },
        );
      }
    }

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
 * SUBIDA DIRECTA POR EL SERVIDOR — PUT /api/admin/subir (multipart)
 *
 * Vía alterna para cuando la URL firmada no funciona. El archivo SÍ pasa por
 * aquí, así que está limitada por el tope de cuerpo de las funciones de Vercel
 * (~4,5 MB): sirve para fotos y GIF pequeños, no para un video.
 *
 * POR QUÉ EXISTE, SI YA HAY UNA VÍA MEJOR
 * Porque la mejor no siempre funciona. Firmar una URL de subida depende de piezas
 * del proyecto de Supabase que pueden estar en un estado inesperado, y cuando eso
 * pasa el dueño se queda sin poder subir ni una foto. Este camino usa la
 * operación más simple que existe —`upload`— y por tanto la que menos cosas puede
 * romper. Es un plan B honesto: más limitado, pero disponible.
 */
export async function PUT(req: Request) {
  const auth = await autorizarSubida();
  if ("respuesta" in auth) return auth.respuesta;

  try {
    const formulario = await req.formData();
    const archivo = formulario.get("archivo");
    const bucket = String(formulario.get("bucket") ?? "");

    if (!(archivo instanceof File)) {
      return Response.json({ error: "Falta el archivo." }, { status: 400 });
    }
    if (!BUCKETS.includes(bucket as Bucket)) {
      return Response.json({ error: "Bucket no permitido." }, { status: 400 });
    }

    const extension = EXTENSIONES[archivo.type];
    if (!extension) {
      return Response.json(
        { error: `Formato no admitido (${archivo.type || "desconocido"}).` },
        { status: 400 },
      );
    }

    if (archivo.size > TOPE_DIRECTO) {
      return Response.json(
        {
          error: `Por esta vía el máximo es ${(TOPE_DIRECTO / 1024 / 1024).toFixed(1)} MB y el archivo pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB.`,
        },
        { status: 413 },
      );
    }

    const supabase = createAdminClient();
    const ruta = `${auth.carpeta}/${nombreSeguro(archivo.name)}-${Date.now()}.${extension}`;

    const subir = () =>
      supabase.storage
        .from(bucket as Bucket)
        .upload(ruta, archivo, { contentType: archivo.type, upsert: true });

    let { error } = await subir();

    // Mismo criterio que arriba: ante cualquier fallo se asegura el bucket y se
    // reintenta, sin interpretar el texto del error.
    if (error) {
      const creado = await asegurarBucket(supabase, bucket as BucketConocido);
      if (creado.ok) ({ error } = await subir());

      if (error) {
        const detalle = mensajeDeError(error);
        return Response.json(
          {
            error: traducirFalloStorage(detalle, bucket, creado.ok),
            detalle,
          },
          { status: 503 },
        );
      }
    }

    const { data: publico } = supabase.storage
      .from(bucket as Bucket)
      .getPublicUrl(ruta);

    return Response.json({ publicUrl: publico.publicUrl, path: ruta });
  } catch (error) {
    const mensaje = mensajeDeError(error);
    console.error("[admin/subir] PUT:", mensaje);
    return Response.json({ error: mensaje }, { status: 500 });
  }
}

/** Tope de la subida por servidor, por debajo del límite de Vercel. */
const TOPE_DIRECTO = 4 * 1024 * 1024;

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
