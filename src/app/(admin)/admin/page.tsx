"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gift, Pencil, Plus, RotateCcw, UtensilsCrossed } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { MenuItemMock } from "@/lib/mock-data";
import { platilloVacio, useRestauranteStore } from "@/lib/restaurante-store";
import { HidratarRestaurante } from "@/components/HidratarRestaurante";
import { EstadoConexion } from "@/components/admin/EstadoConexion";
import { ModalPlatillo } from "@/components/admin/ModalPlatillo";
import { PanelRecompensas } from "@/components/admin/PanelRecompensas";
import { Switch } from "@/components/admin/Switch";

/**
 * PANEL ADMINISTRADOR — Gestor de menú del dueño.
 * URL: /admin
 *
 * Mantiene la estética dark premium de la landing (fondo #0a0a0f, halos
 * difusos, superficies de cristal) y el acento violeta que identifica a esta
 * área en la tarjeta de entrada.
 *
 * Todo lo que se guarda aquí va al store del restaurante, que es el MISMO que
 * lee la Vista Cliente: un cambio de precio o de foto se ve al instante al
 * volver al menú.
 */

/** Pestaña virtual del módulo de lealtad (no es una categoría del menú). */
const TAB_RECOMPENSAS = "Recompensas";

export default function PanelAdmin() {
  const menu = useRestauranteStore((s) => s.menu);
  const alternarDisponibilidad = useRestauranteStore(
    (s) => s.alternarDisponibilidad,
  );
  const restablecer = useRestauranteStore((s) => s.restablecer);

  // Las categorías se derivan del menú vivo: si el dueño crea un platillo en
  // una categoría nueva, la pestaña aparece sola.
  const categorias = Array.from(new Set(menu.map((m) => m.categoria)));
  const tabs = [...categorias, TAB_RECOMPENSAS];

  const [tab, setTab] = useState(categorias[0] ?? TAB_RECOMPENSAS);
  const [editando, setEditando] = useState<MenuItemMock | null>(null);

  const platillos = menu.filter((m) => m.categoria === tab);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0f] text-white">
      {/* Trae los cambios guardados en sesiones anteriores. */}
      <HidratarRestaurante />

      {/* Halos ambientales, como en la landing */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-float-slow absolute -left-24 -top-10 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />
        <div
          className="animate-float-slow absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-6 sm:px-8">
        {/* ===== HEADER ===== */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <Link
              href="/"
              className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-white/40 transition hover:text-white/70"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver al inicio
            </Link>
            <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">
              Panel Administrador
            </h1>
            <p className="text-sm text-white/45">
              Gestiona tu menú, precios y recompensas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/mesa/el-primo/4"
              className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-bold text-white/80 backdrop-blur-xl transition hover:bg-white/[0.12]"
            >
              Ver como cliente →
            </Link>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "¿Descartar todos tus cambios y volver al menú original?",
                  )
                ) {
                  restablecer();
                }
              }}
              className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-white/50 transition hover:border-rose-400/40 hover:text-rose-300"
              title="Restablecer el menú original"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restablecer
            </button>
          </div>
        </header>

        {/* Estado real de la conexión: sin esto el dueño no sabría si su
            cambio quedó en la nube o solo en este navegador. */}
        <EstadoConexion />

        {/* ===== PESTAÑAS DE CATEGORÍA ===== */}
        <nav className="mb-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((t) => {
            const activa = t === tab;
            const esRecompensas = t === TAB_RECOMPENSAS;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition ${
                  activa
                    ? "border-violet-400/50 bg-violet-500/20 text-white"
                    : "border-white/10 bg-white/[0.04] text-white/55 hover:bg-white/[0.08]"
                }`}
              >
                {esRecompensas && <Gift className="h-3.5 w-3.5" />}
                {t}
                {!esRecompensas && (
                  <span className="text-[11px] font-semibold text-white/35">
                    {menu.filter((m) => m.categoria === t).length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ===== CONTENIDO ===== */}
        {tab === TAB_RECOMPENSAS ? (
          <PanelRecompensas />
        ) : (
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">{tab}</h2>
              <button
                type="button"
                onClick={() => setEditando(platilloVacio(tab))}
                className="flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500 active:scale-95"
              >
                <Plus className="h-4 w-4" strokeWidth={3} />
                Nuevo platillo
              </button>
            </div>

            {platillos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
                <UtensilsCrossed
                  className="mx-auto h-10 w-10 text-white/15"
                  strokeWidth={1.5}
                />
                <p className="mt-3 text-sm text-white/40">
                  No hay platillos en {tab}.
                </p>
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {platillos.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl transition hover:border-white/20"
                  >
                    <div className="flex items-center gap-3">
                      {/* Foto (o emoji de respaldo) */}
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
                        {p.imagen_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.imagen_url}
                            alt={p.nombre}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-2xl">
                            {p.emoji}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{p.nombre}</p>
                        <p className="text-sm font-bold text-violet-300">
                          {formatCurrency(p.precio)}
                        </p>
                        {p.modifiers && p.modifiers.length > 0 && (
                          <p className="mt-0.5 truncate text-[11px] text-white/35">
                            {p.modifiers.length}{" "}
                            {p.modifiers.length === 1
                              ? "grupo de opciones"
                              : "grupos de opciones"}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-white/[0.07] pt-3">
                      {/* Atajo de disponibilidad: lo más frecuente del día a
                          día (se acabó el pastor) sin abrir el formulario. */}
                      <Switch
                        activo={p.disponible}
                        onCambiar={() => alternarDisponibilidad(p.id)}
                        etiqueta={p.disponible ? "Disponible" : "Agotado"}
                      />

                      <button
                        type="button"
                        onClick={() => setEditando(p)}
                        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-white/[0.14]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {/* Formulario de creación / edición */}
      <ModalPlatillo
        abierto={editando !== null}
        platillo={editando}
        onCerrar={() => setEditando(null)}
      />
    </main>
  );
}
