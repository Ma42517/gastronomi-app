"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigurado } from "@/lib/supabase/config";
import {
  CONFIG_POR_DEFECTO,
  filaAConfig,
  type ConfigPlataforma,
} from "@/lib/config-plataforma";

/**
 * Lee los ajustes globales de la plataforma en el navegador.
 *
 * Va directo a Supabase con la publishable key: la tabla tiene política de
 * lectura pública porque el comensal necesita la tipografía, la promoción y las
 * formas de pago ANTES de que nadie inicie sesión. Pasarlo por una ruta de API
 * solo añadiría un salto.
 *
 * Ante cualquier fallo devuelve los valores por defecto en lugar de dejar la app
 * sin tipografía ni métodos de pago: unos ajustes ilegibles no deben tumbar el
 * menú de un restaurante.
 */
export function useConfigPlataforma(): ConfigPlataforma {
  const [config, setConfig] = useState<ConfigPlataforma>(CONFIG_POR_DEFECTO);

  useEffect(() => {
    if (!supabaseConfigurado()) return;

    let cancelado = false;

    void (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("plataforma_config")
          .select("*")
          .eq("id", 1)
          .maybeSingle();

        if (error || !data || cancelado) return;
        setConfig(filaAConfig(data as Record<string, unknown>));
      } catch {
        // Se conservan los valores por defecto.
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  return config;
}
