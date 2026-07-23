import Link from "next/link";

/**
 * Landing / punto de entrada.
 * En producción, el cliente NO llega aquí: entra directo por el QR de su mesa
 * (/mesa/[restauranteId]/[mesaId]). Esta página sirve de índice para desarrollo
 * y de acceso a los paneles B2B.
 */
export default function Home() {
  const accesos = [
    {
      titulo: "Vista Cliente",
      descripcion: "Menú, pago y sellos de lealtad (se abre al escanear el QR).",
      href: "/mesa/demo/1",
      etiqueta: "Mobile-First",
    },
    {
      titulo: "Vista Restaurante",
      descripcion: "Mapa de mesas en tiempo real y alertas de cobro.",
      href: "/dashboard",
      etiqueta: "Tablet / Caja",
    },
    {
      titulo: "Panel Administrador",
      descripcion: "Menú, precios, QR por mesa y métricas de retención.",
      href: "/admin",
      etiqueta: "B2B / Dueño",
    },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-gradient-to-b from-brand-50 to-white px-6 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-brand-700 sm:text-5xl">
          gastronomi-app
        </h1>
        <p className="mt-3 max-w-xl text-balance text-gray-600">
          Escanea, ordena y paga tu cuenta al instante desde tu mesa. Sin filas,
          sin esperas, sin instalar nada.
        </p>
      </div>

      <div className="grid w-full max-w-4xl gap-4 sm:grid-cols-3">
        {accesos.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group flex flex-col rounded-2xl border border-brand-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <span className="mb-3 w-fit rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
              {a.etiqueta}
            </span>
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-brand-600">
              {a.titulo}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{a.descripcion}</p>
          </Link>
        ))}
      </div>

      <p className="text-xs text-gray-400">
        Entorno de desarrollo · Next.js + Supabase
      </p>
    </main>
  );
}
