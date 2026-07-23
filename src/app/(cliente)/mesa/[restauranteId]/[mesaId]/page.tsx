/**
 * VISTA CLIENTE (Mobile-First)
 * URL destino del QR físico de la mesa: /mesa/[restauranteId]/[mesaId]
 *
 * Flujo:
 *  1. Cliente escanea QR -> abre esta ruta en el navegador (sin app store).
 *  2. Ve el menú del restaurante y la cuenta abierta de su mesa.
 *  3. Puede ordenar, pagar completo o dividir la cuenta (split bill).
 *  4. Al pagar, se suma automáticamente un sello de lealtad.
 */

interface PageProps {
  params: {
    restauranteId: string;
    mesaId: string;
  };
}

export default function VistaClienteMesa({ params }: PageProps) {
  const { restauranteId, mesaId } = params;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col bg-white">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/90 px-5 py-4 backdrop-blur">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
          Mesa {mesaId}
        </p>
        <h1 className="text-lg font-semibold text-gray-900">
          Restaurante {restauranteId}
        </h1>
      </header>

      <section className="flex-1 space-y-4 px-5 py-6">
        <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50 p-6 text-center">
          <p className="text-sm text-gray-600">
            🍽️ Aquí irá el <strong>menú interactivo</strong>, el selector de
            platillos y la <strong>tarjeta de sellos de lealtad</strong>.
          </p>
        </div>
        <p className="text-center text-xs text-gray-400">
          Pantalla base — el diseño se construye en el siguiente paso.
        </p>
      </section>

      <footer className="sticky bottom-0 border-t border-gray-100 bg-white p-4">
        <button
          type="button"
          className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition active:scale-[0.99]"
        >
          Pagar / Dividir cuenta
        </button>
      </footer>
    </main>
  );
}
