/**
 * VISTA RESTAURANTE (Tablet / Caja / Cocina)
 * URL: /dashboard
 *
 * Objetivo:
 *  - Mapa de mesas en tiempo real (suscripción Realtime de Supabase).
 *  - Alerta sonora + visual cuando una mesa paga.
 *  - Enviar comanda / ticket de cobro a impresora térmica.
 */
export default function DashboardRestaurante() {
  // Placeholder de mesas — se reemplazará por datos en tiempo real.
  const mesas = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    estado: i % 3 === 0 ? "pagando" : i % 2 === 0 ? "ocupada" : "libre",
  }));

  const estilos: Record<string, string> = {
    libre: "border-gray-200 bg-white text-gray-400",
    ocupada: "border-amber-200 bg-amber-50 text-amber-700",
    pagando: "border-green-300 bg-green-50 text-green-700 animate-pulse",
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mapa de Mesas</h1>
          <p className="text-sm text-gray-500">Estado en tiempo real</p>
        </div>
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
          ● En vivo
        </span>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {mesas.map((mesa) => (
          <div
            key={mesa.id}
            className={`flex aspect-square flex-col items-center justify-center rounded-2xl border-2 font-semibold shadow-sm ${estilos[mesa.estado]}`}
          >
            <span className="text-2xl">Mesa {mesa.id}</span>
            <span className="mt-1 text-xs uppercase tracking-wide">
              {mesa.estado}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
