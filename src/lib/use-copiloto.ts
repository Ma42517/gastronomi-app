"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  copilotoLocal,
  firmaPayload,
  type CopilotoPayload,
  type GrupoElegido,
  type GrupoPendiente,
} from "@/lib/copiloto";
import type { GrupoModificador, MenuItemMock } from "@/lib/mock-data";

/**
 * Ventana de espera antes de llamar al modelo. Absorbe las ráfagas de toques
 * (el cliente suele elegir salsa y preparación en menos de un segundo) para no
 * disparar una petición por cada toque.
 */
const DEBOUNCE_MS = 450;

interface Params {
  item: MenuItemMock | null;
  selecciones: Record<string, string[]>;
  /** Solo consulta a la IA mientras el modal está abierto. */
  activo: boolean;
  /** Complemento a ofrecer cuando el platillo ya está completo (venta cruzada). */
  complemento?: { nombre: string; motivo: string };
}

interface Resultado {
  texto: string;
  /** true mientras el modelo redacta (para pulsar el ícono, sin vaciar texto). */
  pensando: boolean;
}

/**
 * COPILOTO DE IA en tiempo real para el detalle del platillo.
 *
 * Estrategia de dos capas para que la reacción se sienta INMEDIATA sin sacrificar
 * la calidad del texto:
 *
 *  1. CAPA LOCAL (0 ms): al toque, `copilotoLocal()` compone un texto
 *     determinista y persuasivo. Se pinta en el mismo frame.
 *  2. CAPA IA (~1 s): tras el debounce, el modelo redacta una versión más rica
 *     y reemplaza la local con un crossfade.
 *
 * Si la IA falla o no hay API key, la capa 1 se queda como texto final: el
 * cliente nunca ve un espacio vacío ni un spinner.
 */
export function useCopiloto({
  item,
  selecciones,
  activo,
  complemento,
}: Params): Resultado {
  const [textoIA, setTextoIA] = useState<string | null>(null);
  const [pensando, setPensando] = useState(false);

  // Caché por firma de selección: evita repetir la llamada cuando el cliente
  // vuelve a una combinación que ya visitó (muy común al comparar salsas).
  const cache = useRef<Map<string, string>>(new Map());
  const peticion = useRef<AbortController | null>(null);

  const payload = useMemo<CopilotoPayload | null>(() => {
    if (!item) return null;

    const modifiers: GrupoModificador[] = item.modifiers ?? [];

    const grupos: GrupoElegido[] = modifiers
      .map((g) => {
        const elegidas = selecciones[g.id] ?? [];
        return {
          id: g.id,
          titulo: g.titulo,
          opciones: g.opciones
            .filter((o) => elegidas.includes(o.id))
            .map((o) => ({ id: o.id, nombre: o.nombre })),
        };
      })
      .filter((g) => g.opciones.length > 0);

    const pendientes: GrupoPendiente[] = modifiers
      .filter((g) => g.requerido && (selecciones[g.id]?.length ?? 0) === 0)
      .map((g) => ({ id: g.id, titulo: g.titulo }));

    return {
      platillo: item.nombre,
      descripcion: item.descripcion,
      categoria: item.categoria,
      grupos,
      pendientes,
      // El complemento solo se ofrece cuando ya no falta ningún obligatorio.
      complemento: pendientes.length === 0 ? complemento : undefined,
    };
  }, [item, selecciones, complemento]);

  const firma = payload ? firmaPayload(payload) : "";

  // Capa 1: texto local, síncrono. Nunca hay pantalla vacía.
  const textoLocal = payload ? copilotoLocal(payload) : "";

  // Capa 2: consulta al modelo con debounce + cancelación.
  useEffect(() => {
    if (!activo || !payload) {
      setTextoIA(null);
      setPensando(false);
      return;
    }

    // Golpe de caché: se aplica sin debounce ni parpadeo.
    const enCache = cache.current.get(firma);
    if (enCache) {
      setTextoIA(enCache);
      setPensando(false);
      return;
    }

    // La selección cambió: se suelta el texto IA anterior (ya no describe lo
    // que el cliente tiene en pantalla) y manda la capa local mientras tanto.
    setTextoIA(null);
    setPensando(true);

    const temporizador = window.setTimeout(async () => {
      peticion.current?.abort();
      const controlador = new AbortController();
      peticion.current = controlador;

      try {
        const res = await fetch("/api/copiloto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controlador.signal,
        });

        if (!res.ok) {
          // 503 (sin API key) es un caso esperado: se queda el texto local.
          setPensando(false);
          return;
        }

        const data: { texto?: string } = await res.json();
        if (data.texto) {
          cache.current.set(firma, data.texto);
          setTextoIA(data.texto);
        }
      } catch {
        // Abortos y errores de red: la capa local ya está en pantalla.
      } finally {
        if (!controlador.signal.aborted) setPensando(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(temporizador);
    };
    // `firma` resume el payload: evita re-disparos por identidad de objeto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma, activo]);

  // Al cambiar de platillo se limpia la caché (es por platillo, no global).
  useEffect(() => {
    cache.current.clear();
    setTextoIA(null);
    return () => peticion.current?.abort();
  }, [item?.id]);

  return { texto: textoIA ?? textoLocal, pensando };
}
