import { verificarDueno } from "@/lib/admin-auth";
import { verificarSuperAdmin } from "@/lib/dev-auth";

/**
 * ¿QUÉ PUEDE EDITAR QUIEN LLAMA, EN ESTE RESTAURANTE? — GET /api/admin/permisos?slug=…
 *
 * Lo consulta el editor en vivo para decidir qué lápices dibuja.
 *
 * POR QUÉ SE PREGUNTA AL SERVIDOR Y NO SE DEDUCE EN EL NAVEGADOR
 * "Tener sesión" no es lo mismo que "poder editar ESTE restaurante". Un comensal
 * con cuenta está autenticado igual que un dueño, y el dueño de La Tasca no
 * puede tocar el menú de El Tridente. Deducirlo en el cliente llenaría el menú
 * de lápices que al pulsarlos darían 403: prometer una acción que va a fallar es
 * peor que no ofrecerla.
 *
 * ⚠️ ESTO NO ES LA SEGURIDAD, ES LA INTERFAZ
 * Ocultar un lápiz no protege nada. Cada escritura vuelve a comprobar el permiso
 * en su propia ruta (`verificarDueno` / `verificarSuperAdmin`), que es donde de
 * verdad se decide. Aquí solo se evita dibujar puertas que no abren.
 *
 * Responde 200 SIEMPRE: "no puedes editar" es una respuesta legítima y esperada,
 * y un 403 llenaría la consola de errores en cada carga del menú de un comensal.
 */

export const dynamic = "force-dynamic";

export type RolEdicion = "super_admin" | "restaurant_admin";

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug")?.trim() || undefined;

  // El super admin puede con todo, y se comprueba primero: no necesita figurar
  // como dueño del restaurante para poder arreglárselo a un cliente.
  const plataforma = await verificarSuperAdmin();
  if (plataforma.ok) {
    return Response.json({
      rol: "super_admin" satisfies RolEdicion,
      puedeEditar: true,
      email: plataforma.email,
    });
  }

  // Dueño DE ESTE restaurante (el de la URL, no el de la cookie).
  const dueno = await verificarDueno({ slug });
  if (dueno.ok) {
    return Response.json({
      rol: "restaurant_admin" satisfies RolEdicion,
      puedeEditar: true,
      email: dueno.email,
    });
  }

  return Response.json({ rol: null, puedeEditar: false, email: null });
}
