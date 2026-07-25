"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { GrupoModificador, MenuItemMock } from "@/lib/mock-data";
import {
  grupoVacio,
  nuevoIdPlatillo,
  useRestauranteStore,
} from "@/lib/restaurante-store";
import { CampoImagen } from "./CampoImagen";
import { Switch } from "./Switch";

interface ModalPlatilloProps {
  abierto: boolean;
  /** Platillo a editar. Si su `id` está vacío, es una creación. */
  platillo: MenuItemMock | null;
  onCerrar: () => void;
}

/**
 * FORMULARIO DE PLATILLO (crear / editar) en modal.
 *
 * Trabaja sobre una COPIA local (`borrador`) y solo escribe en el store al
 * pulsar "Guardar". Así el dueño puede cerrar sin miedo: nada se toca hasta
 * que confirma, y la Vista Cliente no ve estados a medio editar.
 */
export function ModalPlatillo({
  abierto,
  platillo,
  onCerrar,
}: ModalPlatilloProps) {
  const guardarPlatillo = useRestauranteStore((s) => s.guardarPlatillo);
  const eliminarPlatillo = useRestauranteStore((s) => s.eliminarPlatillo);

  const [borrador, setBorrador] = useState<MenuItemMock | null>(platillo);
  const [errores, setErrores] = useState<string[]>([]);

  // Al abrir (o cambiar de platillo) se reinicia el borrador.
  useEffect(() => {
    setBorrador(platillo);
    setErrores([]);
  }, [platillo, abierto]);

  if (!abierto || !borrador) return null;

  const esNuevo = borrador.id === "";
  const set = <K extends keyof MenuItemMock>(
    campo: K,
    valor: MenuItemMock[K],
  ) => setBorrador((b) => (b ? { ...b, [campo]: valor } : b));

  // --- Editor de modificadores -------------------------------------------
  const grupos = borrador.modifiers ?? [];

  const setGrupos = (nuevos: GrupoModificador[]) =>
    set("modifiers", nuevos.length > 0 ? nuevos : undefined);

  const actualizarGrupo = (i: number, cambios: Partial<GrupoModificador>) =>
    setGrupos(grupos.map((g, idx) => (idx === i ? { ...g, ...cambios } : g)));

  /**
   * Las opciones se editan como texto separado por comas: para 3-4 salsas es
   * mucho más rápido que una lista con un input por opción. Los ids se derivan
   * del nombre, así que se conservan al reordenar.
   */
  const opcionesATexto = (g: GrupoModificador) =>
    g.opciones.map((o) => o.nombre).join(", ");

  const textoAOpciones = (texto: string) =>
    texto
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((nombre) => ({
        id: nombre
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
        nombre,
      }));

  // --- Guardado ----------------------------------------------------------
  const guardar = () => {
    const fallos: string[] = [];
    if (!borrador.nombre.trim()) fallos.push("El nombre es obligatorio.");
    if (!Number.isFinite(borrador.precio) || borrador.precio < 0)
      fallos.push("El precio debe ser un número mayor o igual a 0.");
    grupos.forEach((g, i) => {
      if (!g.titulo.trim())
        fallos.push(`El grupo de opciones #${i + 1} necesita un título.`);
      if (g.opciones.length === 0)
        fallos.push(`"${g.titulo || `Grupo #${i + 1}`}" no tiene opciones.`);
    });

    if (fallos.length > 0) {
      setErrores(fallos);
      return;
    }

    guardarPlatillo({
      ...borrador,
      id: esNuevo ? nuevoIdPlatillo(borrador.nombre) : borrador.id,
      nombre: borrador.nombre.trim(),
      descripcion: borrador.descripcion.trim(),
      precio: Number(borrador.precio),
    });
    onCerrar();
  };

  const borrar = () => {
    if (esNuevo) return;
    eliminarPlatillo(borrador.id);
    onCerrar();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onCerrar}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#12121a] text-white shadow-2xl sm:rounded-3xl">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">
              {esNuevo ? "Nuevo platillo" : "Editar platillo"}
            </h2>
            <p className="text-xs text-white/40">{borrador.categoria}</p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Cuerpo */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* 1) Fotografía */}
          <CampoImagen
            valor={borrador.imagen_url}
            emoji={borrador.emoji}
            onCambiar={(img) => set("imagen_url", img)}
          />

          {/* 2) Nombre */}
          <Campo etiqueta="Nombre del platillo">
            <input
              type="text"
              value={borrador.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              placeholder="Ej. Taco al Pastor"
              className={inputCls}
            />
          </Campo>

          {/* 3) Precio + emoji de respaldo */}
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <Campo etiqueta="Precio (MXN)">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3">
                <span className="text-sm font-bold text-white/40">$</span>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  inputMode="decimal"
                  value={borrador.precio}
                  onChange={(e) => set("precio", Number(e.target.value))}
                  className="w-full bg-transparent py-2.5 text-sm font-bold text-white outline-none"
                />
              </div>
            </Campo>
            <Campo etiqueta="Emoji">
              <input
                type="text"
                value={borrador.emoji}
                onChange={(e) => set("emoji", e.target.value.slice(0, 4))}
                className={`${inputCls} w-20 text-center text-lg`}
              />
            </Campo>
          </div>

          {/* Descripción: no se muestra al cliente (Ñom AI escribe el texto),
              pero es la fuente de ingredientes que evita que la IA invente. */}
          <Campo
            etiqueta="Descripción (contexto para Ñom AI)"
            ayuda="El cliente no la ve: Ñom AI la usa para saber qué lleva el platillo y no inventar ingredientes."
          >
            <textarea
              value={borrador.descripcion}
              onChange={(e) => set("descripcion", e.target.value)}
              rows={2}
              placeholder="Ingredientes reales del platillo…"
              className={`${inputCls} resize-none`}
            />
          </Campo>

          {/* 4) Modificadores */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wide text-white/50">
                Opciones del platillo
              </label>
              <button
                type="button"
                onClick={() => setGrupos([...grupos, grupoVacio(grupos.length)])}
                className="flex items-center gap-1 rounded-full bg-violet-500/15 px-3 py-1 text-xs font-bold text-violet-300 transition hover:bg-violet-500/25"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                Agregar grupo
              </button>
            </div>

            {grupos.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-white/35">
                Sin opciones. Se agrega directo al carrito.
              </p>
            ) : (
              <div className="space-y-3">
                {grupos.map((g, i) => (
                  <div
                    key={g.id}
                    className="space-y-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={g.titulo}
                        onChange={(e) =>
                          actualizarGrupo(i, { titulo: e.target.value })
                        }
                        placeholder="Título (ej. Elige tu salsa)"
                        className={`${inputCls} flex-1`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setGrupos(grupos.filter((_, idx) => idx !== i))
                        }
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/40 transition hover:bg-rose-500/20 hover:text-rose-400"
                        aria-label="Quitar grupo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={opcionesATexto(g)}
                      onChange={(e) =>
                        actualizarGrupo(i, {
                          opciones: textoAOpciones(e.target.value),
                        })
                      }
                      placeholder="Opciones separadas por coma: Roja, Verde, Habanero"
                      className={inputCls}
                    />

                    <div className="flex flex-wrap items-center gap-4">
                      <Switch
                        activo={!!g.requerido}
                        onCambiar={(v) => actualizarGrupo(i, { requerido: v })}
                        etiqueta="Obligatorio"
                      />
                      <Switch
                        activo={g.tipo === "multi"}
                        onCambiar={(v) =>
                          actualizarGrupo(i, { tipo: v ? "multi" : "single" })
                        }
                        etiqueta="Permite varias"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5) Disponibilidad */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div>
              <p className="text-sm font-bold">
                {borrador.disponible ? "Disponible" : "Agotado"}
              </p>
              <p className="text-xs text-white/40">
                {borrador.disponible
                  ? "Visible y pedible en el menú."
                  : "Se muestra en gris y no se puede pedir."}
              </p>
            </div>
            <Switch
              activo={borrador.disponible}
              onCambiar={(v) => set("disponible", v)}
            />
          </div>

          {errores.length > 0 && (
            <ul className="space-y-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-300">
              {errores.map((e) => (
                <li key={e}>· {e}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Pie de acciones */}
        <footer className="flex items-center gap-3 border-t border-white/10 px-5 py-4">
          {!esNuevo && (
            <button
              type="button"
              onClick={borrar}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/50 transition hover:bg-rose-500/20 hover:text-rose-400"
              aria-label="Eliminar platillo"
            >
              <Trash2 className="h-4.5 w-4.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onCerrar}
            className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-bold text-white/70 transition hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            className="flex-1 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500 active:scale-[0.98]"
          >
            Guardar
          </button>
        </footer>
      </div>
    </div>
  );
}

/** Clases compartidas de los inputs del panel. */
const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-400/60";

function Campo({
  etiqueta,
  ayuda,
  children,
}: {
  etiqueta: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">
        {etiqueta}
      </label>
      {children}
      {ayuda && (
        <p className="mt-1.5 text-[11px] leading-snug text-white/35">{ayuda}</p>
      )}
    </div>
  );
}
