import Link from "next/link";
import { AlertTriangle, ArrowLeft, CloudOff, Store, UtensilsCrossed } from "lucide-react";
import {
  listarRestaurantesPublicos,
  type RestauranteDirectorio,
} from "@/lib/supabase/leer-restaurantes";
import { RESTAURANTE_SLUG } from "@/lib/supabase/config";
import { TAQUERIA_EL_PRIMO } from "@/lib/mock-data";
import { PORTADA_DE_RESPALDO } from "@/lib/restaurante-repo";

/**
 * DIRECTORIO DE RESTAURANTES — /explorar
 *
 * Puerta de entrada del comensal que NO viene de escanear el QR de una mesa.
 *
 * ES UN SERVER COMPONENT A PROPÓSITO
 * La lista se pide en el servidor y llega ya pintada en el HTML. Hacerlo en el
 * cliente obligaría a mostrar un hueco vacío en cada visita mientras responde la
 * red, y este es el escaparate de la plataforma: es la pantalla que menos se
 * puede permitir aparecer en blanco. El estado de carga lo aporta `loading.tsx`,
 * que Next.js muestra mientras se resuelve esta función.
 *
 * Vive FUERA del grupo `(cliente)` porque ese layout monta el asistente Ñom AI,
 * que necesita el contexto de un menú concreto (platillo, categoría, carrito).
 * Aquí todavía no hay restaurante elegido, así que no tendría nada que decir.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Explorar restaurantes · Ñom Ñom",
  description: "Descubre los restaurantes disponibles y abre su menú digital.",
};

export default async function PaginaExplorar() {
  const resultado = await listarRestaurantesPublicos();

  // Sin Supabase configurado se muestra el restaurante de demostración: dejar la
  // pantalla vacía haría parecer que la plataforma no tiene ninguno.
  const restaurantes: RestauranteDirectorio[] =
    resultado.estado === "ok"
      ? resultado.restaurantes
      : resultado.estado === "sin-supabase"
        ? [restauranteDeDemostracion()]
        : [];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-5 pb-16 pt-6">
        {/* ===== CABECERA ===== */}
        <header className="mb-6">
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 transition hover:text-gray-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al inicio
          </Link>

          <h1 className="text-3xl font-extrabold leading-tight text-zinc-950">
            ¿Qué se te antoja hoy?
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {restaurantes.length > 0
              ? `${restaurantes.length} restaurante${restaurantes.length === 1 ? "" : "s"} disponible${restaurantes.length === 1 ? "" : "s"} cerca de ti.`
              : "Explora los restaurantes de la plataforma."}
          </p>
        </header>

        {/* ===== AVISOS DE ESTADO ===== */}
        {resultado.estado === "sin-supabase" && (
          <p className="mb-5 flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
            <CloudOff className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Modo demostración: la base de datos no está configurada, así que
              solo se muestra el restaurante de ejemplo.
            </span>
          </p>
        )}

        {resultado.estado === "error" && (
          <p className="mb-5 flex gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              No se pudo cargar el directorio.{" "}
              <span className="font-mono">{resultado.mensaje}</span>
            </span>
          </p>
        )}

        {/* ===== CUADRÍCULA =====
            Una columna en el móvil (es una lista, como en cualquier app de
            comida) y dos a partir de pantalla pequeña. */}
        {restaurantes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white/60 px-6 py-16 text-center">
            <Store className="h-12 w-12 text-gray-300" strokeWidth={1.5} />
            <p className="mt-4 text-sm font-bold text-gray-700">
              Todavía no hay restaurantes publicados
            </p>
            <p className="mt-1 max-w-[19rem] text-sm leading-relaxed text-gray-500">
              Cuando un restaurante se registre y active su menú, aparecerá aquí.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {restaurantes.map((r) => (
              <li key={r.slug}>
                <TarjetaRestaurante restaurante={r} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

/**
 * Tarjeta de un restaurante. TODA la tarjeta es el enlace: en un móvil, obligar
 * a acertar en un botón pequeño es una fuente de toques fallidos.
 */
function TarjetaRestaurante({
  restaurante: r,
}: {
  restaurante: RestauranteDirectorio;
}) {
  const sinMenu = r.platillosDisponibles === 0;

  return (
    <Link
      // La mesa 1 es la convención que ya usa el panel para "solo ver el menú":
      // quien llega por el directorio no escaneó ninguna mesa. Dentro de la
      // vista puede cambiar a "Para llevar".
      href={`/mesa/${r.slug}/1`}
      className="group block overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:shadow-lg active:scale-[0.99]"
    >
      {/* --- Portada --- */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={r.portada_url}
          alt={`Portada de ${r.nombre}`}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />

        {sinMenu && (
          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase text-white backdrop-blur-sm">
            Sin menú aún
          </span>
        )}
      </div>

      {/* --- Identidad --- */}
      <div className="flex items-start gap-3 p-4">
        {r.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.logo_url}
            alt={`Logo de ${r.nombre}`}
            className="h-11 w-11 shrink-0 rounded-2xl bg-white object-cover shadow-sm ring-1 ring-black/5"
          />
        ) : (
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xs font-extrabold text-white shadow-sm"
            style={{ background: r.color_primario }}
          >
            {r.iniciales}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold leading-tight text-zinc-950">
            {r.nombre}
          </p>
          {r.eslogan && (
            <p className="truncate text-xs text-gray-500">{r.eslogan}</p>
          )}

          {/* El conteo solo se muestra si de verdad se pudo contar: `null`
              significa "no lo sé", que no es lo mismo que "cero". */}
          {r.platillosDisponibles !== null && r.platillosDisponibles > 0 && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400">
              <UtensilsCrossed className="h-3 w-3" />
              {r.platillosDisponibles} platillo
              {r.platillosDisponibles === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

/** Restaurante de ejemplo para cuando no hay base de datos configurada. */
function restauranteDeDemostracion(): RestauranteDirectorio {
  const { tema, menu } = TAQUERIA_EL_PRIMO;

  return {
    slug: RESTAURANTE_SLUG,
    nombre: tema.nombre_restaurante,
    eslogan: tema.eslogan ?? null,
    logo_url: tema.logo_url,
    portada_url: tema.portada_url || PORTADA_DE_RESPALDO,
    color_primario: tema.color_primario,
    iniciales: tema.iniciales,
    platillosDisponibles: menu.filter((m) => m.disponible).length,
  };
}
