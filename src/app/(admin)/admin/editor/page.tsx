"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { TAQUERIA_EL_PRIMO } from "@/lib/mock-data";
import { useSlugActivo } from "@/lib/use-slug-activo";
import { VistaClienteMesa } from "@/components/cliente/VistaClienteMesa";
import { NomAIProvider } from "@/components/cliente/NomAIContext";

/**
 * EDITOR VISUAL DEL MENÚ — /admin/editor
 *
 * El menú tal como lo ve el comensal, pero editable. Vive DENTRO del panel de
 * administración, no en la ruta pública.
 *
 * POR QUÉ AQUÍ Y NO EN /mesa/<slug>
 * Porque `/mesa/<slug>` es del cliente, y tiene que seguir siéndolo también
 * cuando la abre el dueño. Si las guías de edición aparecieran allí, "ver como
 * cliente" dejaría de servir para lo único que sirve: comprobar qué está viendo
 * de verdad quien está sentado en la mesa. Son dos usos distintos de la misma
 * pantalla y ahora tienen dos direcciones distintas.
 *
 * QUÉ NO SUSTITUYE
 * El panel de listas de `/admin` se queda igual. Ahí se hacen bien las tareas
 * repetitivas —marcar cinco platillos como agotados, revisar precios en columna—
 * que en una vista visual costarían mucho más scroll. Lo que cambia es que ahora
 * hay una forma intuitiva de editar viendo el resultado, y quien prefiera la
 * lista la sigue teniendo.
 *
 * SOBRE `NomAIProvider`
 * `VistaClienteMesa` usa el contexto del asistente para su estado interno
 * (carrito abierto, escena activa). Aquí se monta el proveedor pero NO el
 * asistente: en modo administración su píldora la ocupa el interruptor del
 * editor, así que el chat no tiene por dónde abrirse.
 */
export default function PaginaEditor() {
  const slug = useSlugActivo();

  return (
    <NomAIProvider>
      <div className="min-h-screen bg-[#0a0a0f]">
        {/* Cabecera del panel. Fuera del marco del teléfono, para no robarle
            espacio al menú ni alterar lo que se está editando. */}
        <header className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <Link
              href="/admin"
              className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-white/40 transition hover:text-white/70"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver al panel
            </Link>
            <h1 className="text-lg font-extrabold leading-tight text-white">
              Editor del menú
            </h1>
            <p className="text-xs text-white/45">
              Toca <strong className="text-white/70">Editar</strong> abajo y pulsa
              lo que quieras cambiar.
            </p>
          </div>

          <a
            href={`/mesa/${slug}/1`}
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-bold text-white/80 transition hover:bg-white/[0.12]"
            title="Abrir el menú público en otra pestaña"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ver como cliente
          </a>
        </header>

        {/* El menú real, sin ninguna copia: el mismo componente del comensal. */}
        <div className="pb-10">
          <VistaClienteMesa
            restaurante={TAQUERIA_EL_PRIMO}
            numeroMesa="1"
            slug={slug}
            editable
          />
        </div>
      </div>
    </NomAIProvider>
  );
}
