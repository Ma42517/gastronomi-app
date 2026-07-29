/**
 * ESTADO DE CARGA DEL DIRECTORIO — /explorar
 *
 * Next.js lo muestra automáticamente mientras el Server Component de la página
 * espera a Supabase. Es un esqueleto y no un texto de "cargando…" porque
 * reproduce la forma final de la lista: la página no salta al llegar los datos,
 * solo se rellena.
 */
export default function CargandoDirectorio() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-5 pb-16 pt-6">
        <header className="mb-6">
          <div className="mb-3 h-3 w-28 animate-pulse rounded bg-gray-200" />
          <div className="h-8 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-gray-200" />
        </header>

        <ul className="grid gap-4 sm:grid-cols-2" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <li
              key={i}
              className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100"
            >
              <div className="aspect-[16/9] w-full animate-pulse bg-gray-200" />
              <div className="flex items-start gap-3 p-4">
                <div className="h-11 w-11 shrink-0 animate-pulse rounded-2xl bg-gray-200" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-center text-xs text-gray-400">
          Buscando restaurantes…
        </p>
      </div>
    </main>
  );
}
