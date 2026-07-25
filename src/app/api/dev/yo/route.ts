import { verificarSuperAdmin } from "@/lib/dev-auth";

/**
 * ¿Quien llama es super admin? — GET /api/dev/yo
 *
 * Existe para que el panel del dueño (que es un componente de cliente) sepa si
 * debe mostrar el acceso al panel de plataforma. Devuelve solo un booleano y el
 * correo: nunca datos de la plataforma.
 *
 * Responde 200 SIEMPRE, también cuando no autoriza. Un 403 aquí llenaría la
 * consola de errores en cada carga del panel para todos los dueños normales,
 * cuando "no eres super admin" es una respuesta legítima y esperada.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await verificarSuperAdmin();

  if (!auth.ok) return Response.json({ superAdmin: false });

  return Response.json({
    superAdmin: true,
    email: auth.email,
    via: auth.via,
  });
}
