/**
 * TRADUCCIÓN DE LOS ERRORES DE SUPABASE STORAGE.
 *
 * Los mensajes de Storage están en inglés y describen su propio modelo interno
 * ("The related resource does not exist"), no el problema de quien está
 * intentando subir la foto de un platillo.
 *
 * ⚠️ CUANDO NO SE RECONOCE, SE MUESTRA EL ORIGINAL
 * La tentación es poner un mensaje amable genérico, pero eso destruye la única
 * pista que había. Un texto raro y exacto sirve para arreglar el problema; uno
 * claro e inventado manda a buscar donde no está — que es justamente lo que pasó
 * con la primera versión de esto, cuando cualquier error que mencionara la palabra
 * "bucket" acababa recomendando correr una migración que no tenía nada que ver.
 *
 * Módulo sin ninguna importación a propósito: es lógica pura de cadenas y así se
 * puede probar sin levantar Next ni resolver alias de rutas.
 */

export function traducirFalloStorage(
  detalle: string,
  bucket: string,
  bucketAsegurado: boolean,
): string {
  const d = detalle.toLowerCase();

  // El 404 genérico de Storage. Es el que apareció en producción y el que la
  // versión anterior no sabía interpretar, porque no contiene la palabra "bucket".
  if (d.includes("related resource does not exist")) {
    return `Supabase no encuentra el destino de la subida en el bucket "${bucket}". Casi siempre significa que el bucket no existe o se borró. Pulsa "Preparar el almacenamiento y reintentar".`;
  }

  if (
    d.includes("bucket not found") ||
    (d.includes("bucket") && d.includes("not found"))
  ) {
    return `El bucket "${bucket}" no existe. Pulsa "Preparar el almacenamiento y reintentar".`;
  }

  if (d.includes("row-level security") || d.includes("permission denied")) {
    return "Supabase rechazó la escritura por permisos. Comprueba que SUPABASE_SERVICE_ROLE_KEY sea la llave de servicio (secret) y no la pública.";
  }

  if (d.includes("jwt") || d.includes("signature") || d.includes("invalid token")) {
    return "Supabase rechazó la credencial del servidor. Revisa SUPABASE_SERVICE_ROLE_KEY en Vercel y vuelve a desplegar.";
  }

  if (d.includes("mime") || d.includes("not supported")) {
    return `El bucket "${bucket}" no acepta este tipo de archivo. Pulsa "Preparar el almacenamiento y reintentar" para actualizar su configuración.`;
  }

  return bucketAsegurado
    ? `Storage sigue rechazando la subida después de preparar el bucket. Detalle: ${detalle}`
    : `No se pudo preparar el almacenamiento. Detalle: ${detalle}`;
}
