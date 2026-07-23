/**
 * VISTA ADMINISTRADOR / B2B (Panel del Dueño)
 * URL: /admin
 *
 * Objetivo:
 *  - Configuración de menú, platillos y precios.
 *  - Generación de códigos QR por mesa.
 *  - Métricas de visitas / retención / lealtad.
 */
export default function PanelAdmin() {
  const secciones = [
    { titulo: "Menú y Precios", descripcion: "Alta, edición y disponibilidad de platillos." },
    { titulo: "Mesas y QR", descripcion: "Genera e imprime los códigos QR por mesa." },
    { titulo: "Programa de Lealtad", descripcion: "Configura sellos y recompensas." },
    { titulo: "Métricas", descripcion: "Visitas, retención y ticket promedio." },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-8 py-5">
        <h1 className="text-2xl font-bold text-gray-900">Panel del Restaurante</h1>
        <p className="text-sm text-gray-500">Administración B2B</p>
      </header>

      <div className="grid gap-4 p-8 sm:grid-cols-2">
        {secciones.map((s) => (
          <div
            key={s.titulo}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-gray-900">{s.titulo}</h2>
            <p className="mt-1 text-sm text-gray-500">{s.descripcion}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
