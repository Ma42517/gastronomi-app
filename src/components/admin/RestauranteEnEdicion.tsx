"use client";

import Link from "next/link";
import { Store } from "lucide-react";
import { useRestauranteStore } from "@/lib/restaurante-store";
import { useSlugActivo } from "@/lib/use-slug-activo";

/**
 * Qué restaurante se está editando ahora mismo.
 *
 * POR QUÉ HACE FALTA
 * Desde que el panel puede apuntar a cualquier restaurante de la plataforma, la
 * pregunta "¿esto que estoy tocando de quién es?" dejó de tener una respuesta
 * obvia. Un super admin que cambia de negocio y vuelve al día siguiente
 * encontraría el panel apuntando a lo último que seleccionó, sin ninguna pista.
 * Editar el menú del restaurante equivocado es un error silencioso y caro: nadie
 * lo nota hasta que un comensal ve un precio que no es.
 *
 * El nombre sale del tema cargado de la base de datos; mientras llega (o si no
 * hay Supabase) se muestra el identificador, que siempre se conoce.
 */
export function RestauranteEnEdicion() {
  const tema = useRestauranteStore((s) => s.tema);
  const slug = useSlugActivo();
  const nombre = tema?.nombre_restaurante;

  return (
    <Link
      href="/admin/dev"
      title="Cambiar de restaurante en el panel de plataforma"
      className="flex min-w-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white/80 backdrop-blur-xl transition hover:bg-white/[0.12]"
    >
      <Store className="h-3.5 w-3.5 shrink-0 text-white/40" />
      <span className="max-w-[11rem] truncate">{nombre ?? slug}</span>
      {/* El identificador se muestra junto al nombre porque es lo que aparece en
          la URL pública del menú, y dos negocios pueden llamarse parecido. */}
      {nombre && (
        <span className="shrink-0 font-mono text-[10px] font-normal text-white/30">
          {slug}
        </span>
      )}
    </Link>
  );
}
