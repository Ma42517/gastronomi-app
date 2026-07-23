import { VistaClienteMesa } from "@/components/cliente/VistaClienteMesa";
import { TAQUERIA_EL_PRIMO } from "@/lib/mock-data";

/**
 * VISTA CLIENTE (Mobile-First) — destino del QR físico de la mesa.
 * URL: /mesa/[restauranteId]/[mesaId]
 *
 * DATOS: por ahora 100% MOCK (Taquería El Primo).
 * Cuando conectemos Supabase, aquí se buscará el restaurante por
 * `restauranteId` y la sesión de mesa por `mesaId`.
 */
interface PageProps {
  params: {
    restauranteId: string;
    mesaId: string;
  };
}

export default function Page({ params }: PageProps) {
  // TODO(supabase): reemplazar por fetch real según params.restauranteId.
  const restaurante = TAQUERIA_EL_PRIMO;

  return (
    <VistaClienteMesa restaurante={restaurante} numeroMesa={params.mesaId} />
  );
}
