import { VistaClienteMesa } from "@/components/cliente/VistaClienteMesa";
import { TAQUERIA_EL_PRIMO } from "@/lib/mock-data";

/**
 * VISTA CLIENTE (Mobile-First) — destino del QR físico de la mesa.
 * URL: /mesa/[restauranteId]/[mesaId]
 *
 * DE DÓNDE SALEN LOS DATOS
 * El menú, el nombre, el color y la portada los carga la propia vista desde
 * Supabase filtrando por el `restauranteId` de la URL. El mock que se pasa como
 * prop NO es el contenido: aporta solo el ORDEN preferido de las secciones y qué
 * platillo va destacado como Selección del Chef, y se ignora en cuanto responde
 * la base de datos.
 */
interface PageProps {
  params: {
    restauranteId: string;
    mesaId: string;
  };
}

export default function Page({ params }: PageProps) {
  // Plantilla de presentación (orden de secciones y platillo destacado). Los
  // datos reales del restaurante los pide la vista con el slug de la URL.
  const restaurante = TAQUERIA_EL_PRIMO;

  return (
    <VistaClienteMesa
      restaurante={restaurante}
      numeroMesa={params.mesaId}
      // El slug de la URL decide qué restaurante se carga de Supabase; el mock
      // solo sirve de semilla para el primer pintado.
      slug={params.restauranteId}
    />
  );
}
