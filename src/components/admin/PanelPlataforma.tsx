"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  LayoutDashboard,
  Loader2,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
  Store,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Switch } from "./Switch";
import { AjustesPlataforma } from "./AjustesPlataforma";
import { MediaUploader } from "./MediaUploader";
import { BUCKET_RESTAURANTE } from "@/lib/subir-media";
import type { DisposicionMenu, EstiloEncabezado } from "@/types/database";

/**
 * PANEL DE PLATAFORMA (cliente) — lista y edita todos los restaurantes.
 *
 * Habla exclusivamente con /api/dev/*, que valida el privilegio de super admin
 * en el servidor. Aquí no hay ninguna comprobación de permisos: ocultar un botón
 * no es seguridad, y confiar en el navegador para autorizar sería el error
 * clásico. Esta capa solo dibuja.
 */

interface Restaurante {
  id: string;
  slug: string;
  nombre: string;
  eslogan: string | null;
  color_primario: string;
  iniciales: string | null;
  portada_url: string | null;
  logo_url: string | null;
  direccion: string | null;
  telefono: string | null;
  moneda: string;
  activo: boolean;
  sellos_para_recompensa: number;
  descripcion_recompensa: string | null;
  // --- Personalización (migración 010) ---
  header_style: EstiloEncabezado;
  menu_layout: DisposicionMenu;
  whatsapp_number: string | null;
  instagram_url: string | null;
  total_platillos: number;
  total_agotados: number;
  total_duenos: number;
}

interface Dueno {
  user_id: string;
  email: string;
  rol: string;
}

/** Formulario vacío para crear. */
const NUEVO: Partial<Restaurante> = {
  slug: "",
  nombre: "",
  eslogan: "",
  color_primario: "#DC2626",
  sellos_para_recompensa: 5,
  descripcion_recompensa: "Premio sorpresa",
  activo: true,
  // Los valores que reproducen el aspecto actual del menú.
  header_style: "solid",
  menu_layout: "grid",
};

type Pestana = "restaurantes" | "ajustes";

export function PanelPlataforma() {
  const router = useRouter();
  const [pestana, setPestana] = useState<Pestana>("restaurantes");
  const [lista, setLista] = useState<Restaurante[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  /** Slug que el Panel Administrador está editando ahora mismo. */
  const [slugActivo, setSlugActivo] = useState<string | null>(null);
  /** Slug en proceso de selección, para deshabilitar su botón. */
  const [seleccionando, setSeleccionando] = useState<string | null>(null);

  // Formulario: null = cerrado; objeto sin id = creación; con id = edición.
  const [form, setForm] = useState<Partial<Restaurante> | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Panel de dueños del restaurante abierto.
  const [duenosDe, setDuenosDe] = useState<Restaurante | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/restaurantes");
      const data = (await res.json()) as {
        restaurantes?: Restaurante[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setLista(data.restaurantes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la lista.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Se pregunta al servidor cuál está seleccionado en lugar de leer la cookie
  // aquí: el servidor es quien decide el respaldo cuando no hay ninguna elegida
  // (la variable de entorno), y duplicar esa regla en el navegador la dejaría
  // desincronizada en cuanto cambiara.
  useEffect(() => {
    let cancelado = false;

    void fetch("/api/dev/restaurante-activo")
      .then((r) => r.json() as Promise<{ slug?: string }>)
      .then((d) => {
        if (!cancelado && d.slug) setSlugActivo(d.slug);
      })
      .catch(() => {
        // Si falla, simplemente no se marca ninguna tarjeta como activa.
      });

    return () => {
      cancelado = true;
    };
  }, []);

  /**
   * Fija el restaurante que administrará el panel y lleva allí.
   *
   * La cookie la escribe el SERVIDOR y no el navegador: así la misma petición
   * que la crea puede comprobar antes que el restaurante exista de verdad, y se
   * evita que el panel acabe apuntando a un identificador inventado.
   */
  const seleccionar = async (r: Restaurante) => {
    setSeleccionando(r.slug);
    setError(null);
    try {
      const res = await fetch("/api/dev/restaurante-activo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: r.slug }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);

      setSlugActivo(r.slug);
      // `refresh()` antes de navegar: /admin y las rutas de escritura leen la
      // cookie en el servidor, y sin esto Next.js podría servir el panel desde
      // su caché del enrutador, todavía apuntando al restaurante anterior.
      router.refresh();
      router.push("/admin");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo seleccionar el restaurante.",
      );
    } finally {
      setSeleccionando(null);
    }
  };

  const guardar = async () => {
    if (!form) return;
    setGuardando(true);
    setError(null);
    try {
      const editando = Boolean(form.id);
      const res = await fetch("/api/dev/restaurantes", {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setForm(null);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  const alternarActivo = async (r: Restaurante) => {
    setError(null);
    try {
      const res = await fetch("/api/dev/restaurantes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...r, activo: !r.activo }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar el estado.");
    }
  };

  const borrar = async (r: Restaurante) => {
    // Confirmación por escritura del identificador. El navegador ya pregunta,
    // pero un "¿seguro?" se acepta por reflejo; teclear el slug obliga a
    // detenerse. Detrás se van el menú, las sesiones y el historial.
    const escrito = window.prompt(
      `Esto borra "${r.nombre}" con su menú (${r.total_platillos} platillos), sus sesiones y su historial de lealtad. No se puede deshacer.\n\nEscribe su identificador para confirmar:\n${r.slug}`,
    );
    if (escrito === null) return;

    setError(null);
    try {
      const res = await fetch(
        `/api/dev/restaurantes?id=${r.id}&confirmar=${encodeURIComponent(escrito.trim())}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo borrar.");
    }
  };

  return (
    <div className="space-y-5">
      {/* ===== PESTAÑAS =====
          Separan lo que es de CADA restaurante de lo que es de LA APP: son dos
          ámbitos distintos y mezclarlos invita a tocar por error los ajustes
          globales creyendo que se edita un restaurante. */}
      <nav className="flex gap-2">
        <BotonPestana
          activa={pestana === "restaurantes"}
          onClick={() => setPestana("restaurantes")}
          icono={<Store className="h-3.5 w-3.5" />}
        >
          Restaurantes
        </BotonPestana>
        <BotonPestana
          activa={pestana === "ajustes"}
          onClick={() => setPestana("ajustes")}
          icono={<Settings className="h-3.5 w-3.5" />}
        >
          Ajustes de la app
        </BotonPestana>
      </nav>

      {pestana === "ajustes" && <AjustesPlataforma />}

      {pestana === "restaurantes" && (
      <div className="space-y-5">
      {/* ===== Barra de acciones ===== */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setForm({ ...NUEVO })}
          className="flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500 active:scale-95"
        >
          <Plus className="h-4 w-4" strokeWidth={3} />
          Nuevo restaurante
        </button>

        <button
          type="button"
          onClick={() => void cargar()}
          className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-white/50 transition hover:text-white/80"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Recargar
        </button>

        {lista && (
          <span className="text-xs text-white/35">
            {lista.length} restaurante{lista.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {error && (
        <p className="flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs font-medium leading-relaxed text-rose-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {/* ===== Listado ===== */}
      {cargando && !lista ? (
        <div className="grid place-items-center rounded-2xl border border-white/10 py-20">
          <Loader2 className="h-6 w-6 animate-spin text-white/30" />
        </div>
      ) : lista && lista.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
          <p className="text-sm text-white/40">
            Todavía no hay restaurantes en la plataforma.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {(lista ?? []).map((r) => {
            const enElPanel = r.slug === slugActivo;
            return (
            <li
              key={r.id}
              // El activo se resalta con borde y halo: al cambiar de restaurante
              // hay que poder ver de un vistazo sobre cuál se está trabajando.
              className={`space-y-3 rounded-2xl border bg-white/[0.04] p-4 backdrop-blur-xl transition ${
                enElPanel
                  ? "border-sky-400/50 shadow-[0_0_28px_-6px_rgba(56,189,248,0.45)]"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Identidad visual: el color de marca de cada restaurante */}
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xs font-extrabold text-white"
                  style={{ background: r.color_primario }}
                >
                  {r.iniciales ?? r.nombre.slice(0, 2).toUpperCase()}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{r.nombre}</p>
                  <p className="truncate font-mono text-[11px] text-white/40">
                    /{r.slug}
                  </p>
                  {r.eslogan && (
                    <p className="mt-0.5 truncate text-xs text-white/35">
                      {r.eslogan}
                    </p>
                  )}
                </div>

                {enElPanel && (
                  <span className="shrink-0 rounded-full bg-sky-500/15 px-2 py-1 text-[10px] font-bold uppercase text-sky-300">
                    En el panel
                  </span>
                )}

                {!r.activo && (
                  <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-bold uppercase text-amber-300">
                    Inactivo
                  </span>
                )}
              </div>

              {/* Métricas */}
              <div className="flex flex-wrap gap-2 text-[11px]">
                <Metrica valor={r.total_platillos} etiqueta="platillos" />
                {r.total_agotados > 0 && (
                  <Metrica
                    valor={r.total_agotados}
                    etiqueta="agotados"
                    tono="aviso"
                  />
                )}
                <Metrica
                  valor={r.total_duenos}
                  etiqueta={r.total_duenos === 1 ? "dueño" : "dueños"}
                  tono={r.total_duenos === 0 ? "error" : "normal"}
                />
                <Metrica
                  valor={r.sellos_para_recompensa}
                  etiqueta="visitas premio"
                />
              </div>

              {/* Acciones */}
              <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.07] pt-3">
                <Switch
                  activo={r.activo}
                  onCambiar={() => void alternarActivo(r)}
                  etiqueta={r.activo ? "Visible" : "Oculto"}
                />

                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {/* La acción principal: pasar a editar el menú de ESTE
                      restaurante. Deja de ser "el restaurante del despliegue" y
                      pasa a ser el que se elija aquí. */}
                  <button
                    type="button"
                    onClick={() => void seleccionar(r)}
                    disabled={seleccionando !== null}
                    className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                      enElPanel
                        ? "border border-sky-400/40 bg-sky-500/15 text-sky-200 hover:bg-sky-500/25"
                        : "bg-sky-600 text-white shadow-lg shadow-sky-600/25 hover:bg-sky-500"
                    }`}
                    title={`Administrar el menú de ${r.nombre}`}
                  >
                    {seleccionando === r.slug ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <LayoutDashboard className="h-3.5 w-3.5" />
                    )}
                    {enElPanel ? "Ir al panel" : "Administrar"}
                  </button>

                  <a
                    href={`/mesa/${r.slug}/1`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-white/60 transition hover:text-white"
                    title="Abrir la vista del cliente"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver
                  </a>

                  <button
                    type="button"
                    onClick={() => setDuenosDe(r)}
                    className="flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-white/60 transition hover:text-white"
                  >
                    <Users className="h-3.5 w-3.5" />
                    Dueños
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm(r)}
                    className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/[0.14]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => void borrar(r)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/30 transition hover:bg-rose-500/20 hover:text-rose-400"
                    title="Borrar restaurante"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
            );
          })}
        </ul>
      )}

      </div>
      )}

      {/* ===== Modales ===== */}
      {form && (
        <ModalRestaurante
          form={form}
          setForm={setForm}
          guardar={guardar}
          guardando={guardando}
          cerrar={() => setForm(null)}
        />
      )}

      {duenosDe && (
        <ModalDuenos
          restaurante={duenosDe}
          cerrar={() => {
            setDuenosDe(null);
            void cargar();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------

function BotonPestana({
  activa,
  onClick,
  icono,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  icono: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition ${
        activa
          ? "border-violet-400/50 bg-violet-500/20 text-white"
          : "border-white/10 bg-white/[0.04] text-white/55 hover:bg-white/[0.08]"
      }`}
    >
      {icono}
      {children}
    </button>
  );
}

function Metrica({
  valor,
  etiqueta,
  tono = "normal",
}: {
  valor: number;
  etiqueta: string;
  tono?: "normal" | "aviso" | "error";
}) {
  const tonos = {
    normal: "border-white/10 bg-white/[0.04] text-white/60",
    aviso: "border-amber-500/25 bg-amber-500/10 text-amber-300",
    error: "border-rose-500/25 bg-rose-500/10 text-rose-300",
  } as const;

  return (
    <span
      className={`rounded-full border px-2.5 py-1 font-semibold ${tonos[tono]}`}
    >
      <span className="font-extrabold">{valor}</span> {etiqueta}
    </span>
  );
}

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

/** Formulario de creación / edición. */
function ModalRestaurante({
  form,
  setForm,
  guardar,
  guardando,
  cerrar,
}: {
  form: Partial<Restaurante>;
  setForm: (f: Partial<Restaurante>) => void;
  guardar: () => Promise<void>;
  guardando: boolean;
  cerrar: () => void;
}) {
  const editando = Boolean(form.id);
  const set = <K extends keyof Restaurante>(k: K, v: Restaurante[K]) =>
    setForm({ ...form, [k]: v });

  /**
   * El formulario se partió en dos pestañas porque ya no cabía: con la
   * personalización añadida, de un tirón obligaba a desplazarse por más de una
   * pantalla y media, y los campos que de verdad se tocan a diario (nombre,
   * precio del premio, visibilidad) quedaban enterrados entre ajustes que se
   * configuran una vez y no se vuelven a mirar.
   *
   * Se reutiliza `BotonPestana`, el mismo control que ya separa "Restaurantes"
   * de "Ajustes de la app": una pestaña debe verse igual en toda la aplicación.
   */
  const [pestana, setPestana] = useState<"general" | "personalizacion">(
    "general",
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={cerrar}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#12121a] text-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <h2 className="truncate text-lg font-bold">
            {editando ? "Editar restaurante" : "Nuevo restaurante"}
          </h2>
          <button
            type="button"
            onClick={cerrar}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Pestañas del formulario. Van fuera del área desplazable para seguir
            visibles al bajar por una lista larga de campos. */}
        <nav className="flex gap-2 border-b border-white/10 px-5 py-3">
          <BotonPestana
            activa={pestana === "general"}
            onClick={() => setPestana("general")}
            icono={<Store className="h-3.5 w-3.5" />}
          >
            General
          </BotonPestana>
          <BotonPestana
            activa={pestana === "personalizacion"}
            onClick={() => setPestana("personalizacion")}
            icono={<Palette className="h-3.5 w-3.5" />}
          >
            Personalización
          </BotonPestana>
        </nav>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {pestana === "general" && (
          <>
          <Campo etiqueta="Nombre">
            <input
              type="text"
              value={form.nombre ?? ""}
              onChange={(e) => set("nombre", e.target.value)}
              placeholder="Taquería El Primo"
              className={inputCls}
            />
          </Campo>

          <Campo
            etiqueta="Identificador (slug)"
            ayuda={`Aparece en la URL pública: /mesa/${form.slug || "mi-restaurante"}/4. Se normaliza al guardar (sin acentos ni espacios).`}
          >
            <input
              type="text"
              value={form.slug ?? ""}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="el-primo"
              className={`${inputCls} font-mono`}
            />
          </Campo>

          <Campo etiqueta="Eslogan">
            <input
              type="text"
              value={form.eslogan ?? ""}
              onChange={(e) => set("eslogan", e.target.value)}
              placeholder="Los tacos que unen a la familia"
              className={inputCls}
            />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Color de marca">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.color_primario ?? "#DC2626"}
                  onChange={(e) => set("color_primario", e.target.value)}
                  className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                />
                <input
                  type="text"
                  value={form.color_primario ?? ""}
                  onChange={(e) => set("color_primario", e.target.value)}
                  placeholder="#DC2626"
                  className={`${inputCls} font-mono`}
                />
              </div>
            </Campo>

            <Campo etiqueta="Iniciales" ayuda="Si no hay logo.">
              <input
                type="text"
                value={form.iniciales ?? ""}
                onChange={(e) =>
                  set("iniciales", e.target.value.toUpperCase().slice(0, 3))
                }
                placeholder="EP"
                className={`${inputCls} text-center`}
              />
            </Campo>
          </div>

          <MediaUploader
            tipo="imagen"
            bucket={BUCKET_RESTAURANTE}
            etiqueta="Foto de portada"
            valor={form.portada_url ?? undefined}
            onCambiar={(url) => set("portada_url", url ?? null)}
            ayuda="Se ve a lo ancho en la cabecera del menú, así que conviene una foto horizontal."
          />

          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Visitas para el premio">
              <input
                type="number"
                min={1}
                max={20}
                value={form.sellos_para_recompensa ?? 5}
                onChange={(e) =>
                  set("sellos_para_recompensa", Number(e.target.value))
                }
                className={inputCls}
              />
            </Campo>
            <Campo etiqueta="Moneda">
              <input
                type="text"
                value={form.moneda ?? "MXN"}
                onChange={(e) => set("moneda", e.target.value.toUpperCase())}
                className={inputCls}
              />
            </Campo>
          </div>

          <Campo etiqueta="Premio de lealtad">
            <input
              type="text"
              value={form.descripcion_recompensa ?? ""}
              onChange={(e) => set("descripcion_recompensa", e.target.value)}
              placeholder="Orden de Pastor gratis"
              className={inputCls}
            />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Teléfono">
              <input
                type="tel"
                value={form.telefono ?? ""}
                onChange={(e) => set("telefono", e.target.value)}
                className={inputCls}
              />
            </Campo>
            <Campo etiqueta="Dirección">
              <input
                type="text"
                value={form.direccion ?? ""}
                onChange={(e) => set("direccion", e.target.value)}
                className={inputCls}
              />
            </Campo>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div>
              <p className="text-sm font-bold">
                {form.activo ? "Visible" : "Oculto"}
              </p>
              <p className="text-xs text-white/40">
                Un restaurante oculto no atiende a los clientes.
              </p>
            </div>
            <Switch
              activo={form.activo ?? true}
              onCambiar={(v) => set("activo", v)}
            />
          </div>
          </>
          )}

          {pestana === "personalizacion" && (
          <>
            {/* ===== REDES ===== */}
            <Campo
              etiqueta="WhatsApp"
              ayuda="Con clave de país y sin signos. Se guarda limpio: 52 55 1234-5678 queda como 525512345678."
            >
              <input
                type="tel"
                value={form.whatsapp_number ?? ""}
                onChange={(e) => set("whatsapp_number", e.target.value)}
                placeholder="5215512345678"
                className={`${inputCls} font-mono`}
              />
            </Campo>

            <Campo
              etiqueta="Instagram"
              ayuda="Vale el usuario o la dirección completa; se normaliza al guardar."
            >
              <input
                type="text"
                value={form.instagram_url ?? ""}
                onChange={(e) => set("instagram_url", e.target.value)}
                placeholder="@mitaqueria"
                className={inputCls}
              />
            </Campo>

            {/* ===== ASPECTO DEL MENÚ ===== */}
            <div className="space-y-3 border-t border-white/[0.07] pt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-white/50">
                Aspecto del menú
              </p>

              {/* Los dos interruptores usan el MISMO recuadro que "Visible" de
                  la pestaña General, para que se lean como el mismo tipo de
                  control y no como una sección aparte. */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold">
                    Cabecera {form.header_style === "glass" ? "translúcida" : "sólida"}
                  </p>
                  <p className="text-xs leading-relaxed text-white/40">
                    {form.header_style === "glass"
                      ? "La foto de portada se ve difuminada bajo un velo de cristal."
                      : "La foto de portada se ve nítida, como hasta ahora."}
                  </p>
                </div>
                <Switch
                  activo={form.header_style === "glass"}
                  onCambiar={(v) => set("header_style", v ? "glass" : "solid")}
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold">
                    Platillos en {form.menu_layout === "list" ? "una columna" : "dos columnas"}
                  </p>
                  <p className="text-xs leading-relaxed text-white/40">
                    {form.menu_layout === "list"
                      ? "Uno debajo de otro, más grandes. Útil con pocos platillos."
                      : "Cuadrícula de dos, como hasta ahora. Se ve más carta de un vistazo."}
                  </p>
                </div>
                <Switch
                  activo={form.menu_layout === "list"}
                  onCambiar={(v) => set("menu_layout", v ? "list" : "grid")}
                />
              </div>
            </div>
          </>
          )}
        </div>

        <footer className="flex items-center gap-3 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={cerrar}
            className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-bold text-white/70 transition hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void guardar()}
            disabled={guardando}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500 active:scale-[0.98] disabled:opacity-60"
          >
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
            {editando ? "Guardar cambios" : "Crear restaurante"}
          </button>
        </footer>
      </div>
    </div>
  );
}

/** Gestión de dueños de un restaurante. */
function ModalDuenos({
  restaurante,
  cerrar,
}: {
  restaurante: Restaurante;
  cerrar: () => void;
}) {
  const [duenos, setDuenos] = useState<Dueno[] | null>(null);
  const [email, setEmail] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(
        `/api/dev/duenos?restauranteId=${restaurante.id}`,
      );
      const data = (await res.json()) as { duenos?: Dueno[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setDuenos(data.duenos ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar.");
      setDuenos([]);
    }
  }, [restaurante.id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const agregar = async () => {
    if (!email.trim()) return;
    setOcupado(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/duenos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restauranteId: restaurante.id, email }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setEmail("");
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo agregar.");
    } finally {
      setOcupado(false);
    }
  };

  const quitar = async (d: Dueno) => {
    setError(null);
    try {
      const res = await fetch(
        `/api/dev/duenos?restauranteId=${restaurante.id}&userId=${d.user_id}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo quitar.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={cerrar}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      <div className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#12121a] text-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">Dueños</h2>
            <p className="truncate text-xs text-white/40">
              {restaurante.nombre}
            </p>
          </div>
          <button
            type="button"
            onClick={cerrar}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {/* Alta por correo */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">
              Dar acceso a un correo
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void agregar();
                }}
                placeholder="dueno@correo.com"
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => void agregar()}
                disabled={ocupado || !email.trim()}
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white transition hover:bg-violet-500 disabled:opacity-40"
              >
                {ocupado ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-white/35">
              La cuenta debe existir ya en Supabase (Authentication &gt; Users).
            </p>
          </div>

          {error && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium leading-relaxed text-rose-300">
              {error}
            </p>
          )}

          {/* Lista */}
          {duenos === null ? (
            <div className="grid place-items-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-white/30" />
            </div>
          ) : duenos.length === 0 ? (
            <p className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/10 px-3 py-3 text-xs leading-relaxed text-amber-300">
              Este restaurante no tiene dueños: nadie puede editar su menú.
            </p>
          ) : (
            <ul className="space-y-2">
              {duenos.map((d) => (
                <li
                  key={d.user_id}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
                >
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {d.email}
                  </span>
                  <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase text-white/45">
                    {d.rol}
                  </span>
                  <button
                    type="button"
                    onClick={() => void quitar(d)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/30 transition hover:bg-rose-500/20 hover:text-rose-400"
                    title="Quitar acceso"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
