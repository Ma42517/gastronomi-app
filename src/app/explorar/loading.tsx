import { UtensilsCrossed } from "lucide-react";

/**
 * ESTADO DE CARGA DEL DIRECTORIO — /explorar
 *
 * Muestra el logo centrado en la pantalla a modo de presentación
 * antes de cargar y mostrar la lista de restaurantes.
 */
export default function CargandoDirectorio() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-50">
      <div className="flex animate-pulse flex-col items-center gap-4 text-orange-600">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-orange-100 shadow-sm ring-4 ring-orange-50/50">
          <UtensilsCrossed className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-black tracking-tight">Ñom Ñom</h1>
      </div>
    </main>
  );
}
