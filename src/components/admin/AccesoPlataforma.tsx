"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Terminal } from "lucide-react";

/**
 * Acceso al panel de plataforma, visible solo para super admins.
 *
 * Preguntar al servidor (`/api/dev/yo`) en lugar de decidirlo en el navegador:
 * el privilegio no se puede deducir del lado del cliente sin exponer la lista de
 * administradores.
 *
 * Ojo: ocultar este enlace NO es la medida de seguridad. La protección real está
 * en `/admin/dev` y en `/api/dev/*`, que validan el privilegio en el servidor.
 * Esto solo evita mostrar una puerta que no se puede abrir.
 */
export function AccesoPlataforma() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelado = false;

    void fetch("/api/dev/yo")
      .then((r) => r.json() as Promise<{ superAdmin?: boolean }>)
      .then((d) => {
        // `cancelado` evita el aviso de React por actualizar un componente ya
        // desmontado si se navega antes de que responda.
        if (!cancelado) setVisible(Boolean(d.superAdmin));
      })
      .catch(() => {
        // Sin Supabase o sin sesión simplemente no se muestra el acceso.
      });

    return () => {
      cancelado = true;
    };
  }, []);

  if (!visible) return null;

  return (
    <Link
      href="/admin/dev"
      className="flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-2 text-xs font-bold text-violet-200 transition hover:bg-violet-500/25"
      title="Gestionar todos los restaurantes de la plataforma"
    >
      <Terminal className="h-3.5 w-3.5" />
      Plataforma
    </Link>
  );
}
