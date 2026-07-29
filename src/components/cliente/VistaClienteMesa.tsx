"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import {
  Compass,
  Gift,
  HeartCrack,
  Instagram,
  MapPin,
  MessageCircle,
  SearchX,
  Sparkles,
  Store,
  User,
  UserCircle2,
  X,
} from "lucide-react";
import type { MenuItemMock, RestauranteMock } from "@/lib/mock-data";
import { useCartStore } from "@/lib/cart-store";
import {
  useRestauranteStore,
  type LealtadEditable,
} from "@/lib/restaurante-store";
import { TarjetaSellos } from "./TarjetaSellos";
import { CategoriaPills } from "./CategoriaPills";
import { SeccionPopulares } from "./SeccionPopulares";
import { PlatilloHeroCard } from "./PlatilloHeroCard";
import { DetallePlatillo } from "./DetallePlatillo";
import { MenuInteractivo, anchorCategoria } from "./MenuInteractivo";
import { obtenerMaridaje } from "@/lib/maridajes";
import { CarritoDrawer } from "./CarritoDrawer";
import { BarraNavegacion, type TabActivo } from "./BarraNavegacion";
import type { Modalidad } from "./SelectorModalidad";
import { ModalPago } from "./ModalPago";
import { ModalRegistroPremio } from "./ModalRegistroPremio";
import { HidratarRestaurante } from "@/components/HidratarRestaurante";
import { useConfigPlataforma } from "@/lib/use-config-plataforma";
import { pilaDeFuente } from "@/lib/config-plataforma";
import { useNomAI } from "./NomAIContext";

/** Categoría virtual (no existe en el menú) para filtrar los favoritos. */
const CATEGORIA_FAVORITOS = "❤️ Favoritos";

/** ID del ítem de premio canjeado (se agrega al carrito con precio $0.00). */
const PREMIO_ID = "premio-lealtad";

interface VistaClienteMesaProps {
  restaurante: RestauranteMock;
  numeroMesa: string;
  /**
   * Slug del restaurante tomado de la URL. Determina QUÉ restaurante se sirve;
   * el prop `restaurante` queda solo como semilla mientras llega la base.
   */
  slug?: string;
}

export function VistaClienteMesa({
  restaurante,
  numeroMesa,
  slug,
}: VistaClienteMesaProps) {
  const { hero } = restaurante;

  /**
   * TEMA VIVO. Si la base ya respondió, manda su tema; si no, el del mock.
   * Sin esto, un restaurante creado desde el panel de plataforma se vería con
   * el nombre, el color y la portada de la Taquería El Primo.
   */
  const temaRemoto = useRestauranteStore((s) => s.tema);
  const tema = temaRemoto ?? restaurante.tema;

  // MENÚ Y LEALTAD VIVOS: se leen del store, no del mock. Así lo que el dueño
  // guarda en el Panel Administrador (precio, foto, agotado, premio) aparece
  // aquí en cuanto se vuelve al menú. El store arranca sembrado con el mock,
  // por lo que sin ninguna edición el resultado es idéntico al de antes.
  const menu = useRestauranteStore((s) => s.menu);
  const lealtadConfig = useRestauranteStore((s) => s.lealtad);

  /**
   * ¿LOS DATOS DEL STORE SON DE ESTE RESTAURANTE?
   *
   * `slugActual` dice a qué negocio pertenece lo que hay en memoria. Mientras no
   * coincida con el slug de la URL, lo que hubiera cargado antes (o la semilla
   * del mock) es de otro restaurante y NO se pinta: se muestra el esqueleto de
   * carga. Así se elimina el destello en el que la carta de la Taquería El Primo
   * aparecía durante un instante en la mesa de otro restaurante.
   *
   * En modo demostración (sin Supabase) no hay nada que esperar y el mock es
   * legítimo, así que se muestra directamente.
   */
  const estadoNube = useRestauranteStore((s) => s.estadoNube);
  const slugActual = useRestauranteStore((s) => s.slugActual);
  const modoDemostracion = estadoNube === "local";
  const datosDeEsteRestaurante = modoDemostracion || slugActual === (slug ?? null);

  /**
   * SECCIONES DEL MENÚ. El orden base lo define el restaurante
   * (`restaurante.categorias`), pero si el administrador inventa una categoría
   * nueva en el panel, se añade al final en lugar de quedar invisible.
   * La categoría del platillo héroe se omite: ya tiene su tarjeta destacada.
   */
  const categorias = (() => {
    const categoriaHero = menu.find((m) => m.id === hero.item_id)?.categoria;

    // Las secciones salen del MENÚ QUE SE ESTÁ SIRVIENDO, no del mock.
    //
    // Antes se partía de `restaurante.categorias` (siempre las de la Taquería
    // El Primo, porque llega como prop desde la página) y se le añadían las
    // nuevas. Resultado: cualquier restaurante mostraba "Tacos", "Tortas" y
    // "Volcanes" aunque no vendiera nada de eso, con las secciones vacías.
    const presentes = Array.from(new Set(menu.map((m) => m.categoria))).filter(
      (c) =>
        c !== categoriaHero &&
        // "Postres" existe solo para el cross-sell del carrito.
        c !== "Postres",
    );

    // Del mock se conserva únicamente el ORDEN preferido, que está pensado para
    // que la carta se lea de salado a dulce. Las categorías que no existan en
    // este restaurante simplemente no aparecen.
    const ordenadas = restaurante.categorias.filter((c) => presentes.includes(c));
    const resto = presentes.filter((c) => !ordenadas.includes(c));
    return [...ordenadas, ...resto];
  })();

  const [categoriaActiva, setCategoriaActiva] = useState(categorias[0]);
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  const [detalleItem, setDetalleItem] = useState<MenuItemMock | null>(null);
  // Solo el PROGRESO del cliente es estado local; el resto de la tarjeta
  // (cuántos sellos hacen falta, cuál es el premio y su foto) lo manda el
  // administrador desde el panel.
  const [sellosActuales, setSellosActuales] = useState(
    restaurante.lealtad.sellos_actuales,
  );
  const lealtad: LealtadEditable = {
    ...lealtadConfig,
    sellos_actuales: Math.min(
      sellosActuales,
      lealtadConfig.sellos_para_recompensa,
    ),
  };
  // Lealtad / lead gen: intercepción del premio en la 5ª visita.
  const [modalRegistroAbierto, setModalRegistroAbierto] = useState(false);
  const [premioReclamado, setPremioReclamado] = useState(false);
  const [premioCanjeado, setPremioCanjeado] = useState(false);
  const [avisoExito, setAvisoExito] = useState<string | null>(null);
  // Registro proactivo desde el header (no espera la 5ª visita).
  const [modalProactivoAbierto, setModalProactivoAbierto] = useState(false);
  // Buscador global (la "lupita" del menú sticky).
  const [busqueda, setBusqueda] = useState("");
  // Navegación por tabs de la barra flotante inferior.
  const [tab, setTab] = useState<TabActivo>("home");
  // Micro-interacción: destello del botón VIP al agregar algo o sumar un sello.
  const [brillarVIP, setBrillarVIP] = useState(false);
  // --- Módulos operativos del checkout ---
  const [modalidad, setModalidad] = useState<Modalidad>("local");
  // La mesa NO es editable: viene del QR escaneado (`numeroMesa` de la URL).
  const [propina, setPropina] = useState(0);
  const [porcentajePropina, setPorcentajePropina] = useState<number | null>(null);

  // --- Carrito global (Zustand) ---
  const items = useCartStore((s) => s.items);
  const addToCart = useCartStore((s) => s.addToCart);
  const clearCart = useCartStore((s) => s.clearCart);
  const favoriteItems = useCartStore((s) => s.favoriteItems);
  const subtotal = items.reduce((a, i) => a + i.precio * i.cantidad, 0);
  // Total exacto a cobrar (a centavos): subtotal + propina.
  const total = Math.round((subtotal + propina) * 100) / 100;

  // Contexto de Ñom AI.
  const {
    setEscena,
    setRestauranteNombre,
    setPlatilloActual,
    setCategoriaActual,
    clienteNombre,
    setClienteNombre,
    carritoAbierto,
    abrirCarrito,
    cerrarCarrito,
    abrirChat,
    mostrarBurbuja,
    cerrarBurbuja,
  } = useNomAI();

  // Corte del chef (Ribeye): tarjeta destacada arriba del menú.
  const heroItem = menu.find((m) => m.id === hero.item_id);
  // Postre sugerido para el cierre de venta.
  const postreSugerido =
    menu.find((m) => m.id === "p-flan" && m.disponible) ?? null;
  // Platillos destacados para el carrusel "Populares".
  const populares = menu.filter((m) => m.isPopular);

  // ¿El cliente ya está registrado? (deja de ser invitado en toda la UI)
  const estaRegistrado = clienteNombre.trim().length > 0;

  // BÚSQUEDA GLOBAL: filtra por nombre o descripción e ignora la categorización
  // normal mientras esté activa.
  const buscando = busqueda.trim().length > 0;
  const resultadosBusqueda = (() => {
    if (!buscando) return [];
    const q = busqueda.trim().toLowerCase();
    return menu.filter(
      (m) =>
        m.nombre.toLowerCase().includes(q) ||
        m.descripcion.toLowerCase().includes(q),
    );
  })();

  // Categoría virtual de favoritos, primera en las pills.
  const categoriasConFavoritos = [CATEGORIA_FAVORITOS, ...categorias];
  const modoFavoritos = categoriaActiva === CATEGORIA_FAVORITOS;
  const platillosFavoritos = menu.filter((m) => favoriteItems.includes(m.id));

  /**
   * MICRO-INTERACCIÓN: cuando el cliente agrega un platillo (crece el carrito)
   * o suma un sello, el botón VIP de la barra emite un destello para recordarle
   * que está avanzando hacia su recompensa.
   */
  const totalItems = items.reduce((a, i) => a + i.cantidad, 0);
  const itemsPrevios = useRef(totalItems);
  const idsPrevios = useRef<string[]>(items.map((i) => i.id));
  const sellosPrevios = useRef(lealtad.sellos_actuales);

  useEffect(() => {
    const crecioCarrito = totalItems > itemsPrevios.current;
    const sumoSello = lealtad.sellos_actuales > sellosPrevios.current;
    const idsAntes = idsPrevios.current;

    itemsPrevios.current = totalItems;
    sellosPrevios.current = lealtad.sellos_actuales;
    idsPrevios.current = items.map((i) => i.id);

    if (!crecioCarrito && !sumoSello) return;

    // Destello del botón VIP.
    setBrillarVIP(true);
    const t = window.setTimeout(() => setBrillarVIP(false), 1500);

    // VIÑETA PROACTIVA: al agregar un platillo, Ñom AI reacciona sobre el botón
    // central sugiriendo el maridaje real (nunca si lo agregado ya es bebida).
    if (crecioCarrito) {
      const nuevoId =
        items.find((i) => !idsAntes.includes(i.id))?.id ??
        items[items.length - 1]?.id;
      const platillo = menu.find((m) => m.id === nuevoId);

      if (platillo && platillo.categoria !== "Bebidas") {
        const { items: complementos } = obtenerMaridaje(platillo, menu);
        const sugerido = complementos.find(
          (c) => !items.some((i) => i.id === c.id),
        );
        if (sugerido) {
          mostrarBurbuja({
            mensaje: `¡Gran elección! ${platillo.emoji} ¿Ganas de acompañar tu ${platillo.nombre} con ${sugerido.nombre}?`,
            sugerido: {
              id: sugerido.id,
              nombre: sugerido.nombre,
              precio: sugerido.precio,
              emoji: sugerido.emoji,
            },
          });
        }
      }
    }

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalItems, lealtad.sellos_actuales]);

  // El aviso de éxito es temporal: se oculta solo tras unos segundos para no
  // quedarse fijo tapando la tarjeta de beneficios.
  useEffect(() => {
    if (!avisoExito) return;
    const t = window.setTimeout(() => setAvisoExito(null), 4500);
    return () => window.clearTimeout(t);
  }, [avisoExito]);

  // Navegación por pills: desplaza suavemente a la sección de la categoría.
  const irACategoria = (categoria: string) => {
    setCategoriaActiva(categoria);
    if (categoria === CATEGORIA_FAVORITOS) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // Espera un frame para que el feed complete se haya renderizado.
    requestAnimationFrame(() =>
      document
        .getElementById(anchorCategoria(categoria))
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  /**
   * La categoría activa se fija al montar, cuando el menú puede estar todavía
   * vacío. Cuando llega el del restaurante correcto, la que estaba seleccionada
   * puede no existir en él (o ser `undefined`), y las pills se quedarían sin
   * ninguna marcada. Se reengancha a la primera sección real.
   */
  const claveCategorias = categorias.join("|");
  useEffect(() => {
    if (categorias.length === 0) return;
    if (
      categoriaActiva !== CATEGORIA_FAVORITOS &&
      !categorias.includes(categoriaActiva)
    ) {
      setCategoriaActiva(categorias[0]);
    }
    // `claveCategorias` en vez del array: se recrea en cada render y dispararía
    // el efecto siempre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveCategorias]);

  // --- Ñom AI: nombre del restaurante y escena activa ---
  useEffect(() => {
    setRestauranteNombre(tema.nombre_restaurante);
  }, [tema.nombre_restaurante, setRestauranteNombre]);

  // La escena controla la visibilidad de la barra de Ñom AI: solo se muestra en
  // "categorias". Durante un platillo (tarjeta inline), el drawer del carrito o
  // el checkout, la barra se OCULTA para evitar colisiones de botones.
  useEffect(() => {
    setEscena(
      detalleItem
        ? "platillo"
        : modalPagoAbierto || carritoAbierto
          ? "carrito"
          : "categorias",
    );
  }, [detalleItem, modalPagoAbierto, carritoAbierto, setEscena]);

  // Informa a Ñom AI qué platillo (y categoría) está viendo el cliente.
  // Con el Ribeye unificado en DetallePlatillo, `detalleItem` es la única
  // fuente: ya no hay que distinguir el configurador del héroe.
  useEffect(() => {
    setPlatilloActual(detalleItem?.nombre ?? "");
    setCategoriaActual(detalleItem?.categoria ?? "");
  }, [detalleItem, setPlatilloActual, setCategoriaActual]);

  // --- Handlers ---
  const agregarMenuItem = (item: MenuItemMock) =>
    addToCart({
      id: item.id,
      nombre: item.nombre,
      precio: item.precio,
      emoji: item.emoji,
    });

  /**
   * Post-pago: suma +1 visita y, si llega a la meta (5), INTERCEPTA el premio
   * lanzando el modal de celebración + registro (captura de datos) en lugar de
   * entregarlo de inmediato.
   */
  const handlePaymentSuccess = () => {
    // Se evalúa ANTES de vaciar el carrito: ¿la orden incluía el premio canjeado?
    const incluiaPremio = items.some((i) => i.id === PREMIO_ID);
    clearCart();
    // La propina no se arrastra a la siguiente orden.
    setPropina(0);
    setPorcentajePropina(null);

    // CIERRE DEL LOOP: si se pagó el premio, el ciclo vuelve a empezar en 0/5.
    if (incluiaPremio) {
      setSellosActuales(0);
      setPremioCanjeado(false);
      setPremioReclamado(false);
      setAvisoExito(
        `¡Gracias${clienteNombre ? `, ${clienteNombre}` : ""}! Tu premio fue canjeado. Tu tarjeta empieza de nuevo. 🌮`,
      );
      return;
    }

    // Flujo normal: +1 visita. Se calcula fuera del updater para no producir
    // efectos secundarios dentro de él (React puede invocarlo más de una vez).
    const nuevasVisitas = lealtad.sellos_actuales + 1;
    setSellosActuales(nuevasVisitas);
    if (nuevasVisitas >= lealtad.sellos_para_recompensa && !premioReclamado) {
      setModalRegistroAbierto(true);
    }
  };

  /** Registro voluntario desde el header (no reclama premio, solo crea cuenta). */
  const handleRegistroProactivo = ({
    nombre,
    whatsapp,
  }: {
    nombre: string;
    whatsapp: string;
  }) => {
    console.info("[Beneficios Ñom] Registro proactivo:", { nombre, whatsapp });
    setClienteNombre(nombre.split(" ")[0]);
    setModalProactivoAbierto(false);
    setAvisoExito(
      `¡Bienvenido, ${nombre.split(" ")[0]}! Ya acumulas puntos VIP en cada compra.`,
    );
  };

  /** Canje del premio: se agrega a la orden con precio $0.00. */
  const canjearPremio = () => {
    addToCart({
      id: PREMIO_ID,
      nombre: `${lealtad.descripcion_recompensa} (Premio)`,
      precio: 0,
      emoji: "🎁",
    });
    setPremioCanjeado(true);
    setAvisoExito(
      `¡Tu ${lealtad.descripcion_recompensa} se añadió gratis a tu orden! 🎁`,
    );
  };

  /** Registro completado: guarda el lead, cierra el modal y confirma en la UI. */
  const handleRegistroPremio = ({
    nombre,
    whatsapp,
  }: {
    nombre: string;
    whatsapp: string;
  }) => {
    // En producción: enviar {nombre, whatsapp} al CRM/backend del restaurante.
    console.info("[Beneficios Ñom] Nuevo registro:", { nombre, whatsapp });
    // Personalización inmediata: deja de ser "invitado" en toda la app (header + IA).
    setClienteNombre(nombre.split(" ")[0]);
    setPremioReclamado(true);
    setModalRegistroAbierto(false);
    setAvisoExito(
      `¡Listo, ${nombre}! Tu recompensa está guardada en tu perfil.`,
    );
  };

  // REGLA DE ORO: el pago del drawer va DIRECTO al checkout. La IA NO interrumpe
  // este clic con sugerencias (el postre se ofrece ANTES, como banner del drawer).
  const pagarAhora = () => {
    // "Para llevar" exige nombre para identificar la orden: si el cliente no
    // está registrado, se le pide primero (mismo modal de captura).
    if (modalidad === "llevar" && !estaRegistrado) {
      cerrarCarrito();
      setModalProactivoAbierto(true);
      setAvisoExito(
        "Para pedidos para llevar necesitamos tu nombre para identificar la orden 🥡",
      );
      return;
    }
    cerrarCarrito();
    setModalPagoAbierto(true);
  };

  // Ajustes globales que decide el dueño de la APP (no el del restaurante).
  const plataforma = useConfigPlataforma();

  // Inyección del tema: --brand alimenta a todos los componentes hijos, y
  // `fontFamily` aplica la tipografía elegida en el panel de plataforma a todo
  // el árbol de la vista del cliente.
  const estiloTema = {
    "--brand": tema.color_primario,
    fontFamily: pilaDeFuente(plataforma.fuente),
  } as CSSProperties;

  // --- Personalización que eligió el dueño (migración 010) ---
  const esCabeceraCristal = tema.header_style === "glass";
  const hayRedes = Boolean(tema.whatsapp_number || tema.instagram_url);

  // ===== EL SLUG DE LA URL NO ES DE NINGÚN RESTAURANTE =====
  // Antes este caso terminaba mostrando la carta y la marca de la Taquería El
  // Primo, porque al no haber datos remotos se caía al mock. Un comensal podía
  // acabar pidiendo de un menú que no era el de su mesa.
  if (estadoNube === "no-existe") {
    return (
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 bg-gray-50 px-8 text-center shadow-2xl sm:border-x sm:border-gray-200">
        {/* Se mantiene montado: si se navega a otro slug, hay que reintentar la
            carga. Sin esto la pantalla de error se quedaría pegada. */}
        <HidratarRestaurante slug={slug} />

        <span className="grid h-16 w-16 place-items-center rounded-3xl bg-white text-gray-300 shadow-sm ring-1 ring-gray-100">
          <Store className="h-8 w-8" strokeWidth={1.5} />
        </span>

        <h1 className="text-xl font-extrabold leading-tight text-zinc-950">
          Este restaurante no está disponible
        </h1>
        <p className="text-sm leading-relaxed text-gray-500">
          No encontramos ningún restaurante en{" "}
          <code className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs text-gray-700">
            /{slug}
          </code>
          . Puede que el enlace esté mal escrito o que el negocio ya no esté
          publicado.
        </p>

        <Link
          href="/explorar"
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-zinc-800 active:scale-95"
        >
          <Compass className="h-4 w-4" />
          Ver restaurantes disponibles
        </Link>
      </div>
    );
  }

  // ===== TODAVÍA NO SABEMOS QUÉ CARTA TOCA =====
  // Lo que hay en memoria pertenece a otro restaurante (o aún no hay nada). Se
  // muestra un esqueleto en lugar de una carta ajena: es la diferencia entre
  // "espera un segundo" y "aquí tienes el menú equivocado".
  if (!datosDeEsteRestaurante) {
    return (
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col bg-gray-50 shadow-2xl sm:border-x sm:border-gray-200">
        <HidratarRestaurante slug={slug} />

        <div className="h-52 w-full shrink-0 animate-pulse bg-gray-200" />

        <div className="-mt-4 flex-1 space-y-5 rounded-t-3xl bg-gray-50 px-5 pt-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-gray-200" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-gray-200" />
            </div>
          </div>

          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-8 w-24 shrink-0 animate-pulse rounded-full bg-gray-200"
              />
            ))}
          </div>

          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 w-full animate-pulse rounded-3xl bg-gray-200"
              />
            ))}
          </div>

          <p className="pb-8 text-center text-xs text-gray-400">
            Cargando el menú…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={estiloTema}
      className="relative mx-auto flex min-h-screen max-w-md flex-col bg-gray-50 shadow-2xl sm:border-x sm:border-gray-200"
    >
      {/* Carga el restaurante de ESTA url (y los cambios del panel del dueño). */}
      <HidratarRestaurante slug={slug} />

      {/* HEADER PREMIUM — imagen de portada + overlay */}
      <header className="relative h-52 w-full shrink-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--brand) 75%, black), var(--brand))",
          }}
        />
        {/* En modo cristal la foto baja al 70 % para que el color de marca de la
            capa inferior se transparente por debajo. El color NO cambia: es el
            mismo degradado de siempre, solo se deja ver. */}
        <div
          className={`absolute inset-0 bg-cover bg-center ${
            esCabeceraCristal ? "opacity-70" : ""
          }`}
          style={{ backgroundImage: `url(${tema.portada_url})` }}
          role="img"
          aria-label={`Portada de ${tema.nombre_restaurante}`}
        />
        {/* Velo más ligero que antes: ya no hay texto en la base de la foto que
            necesite contraste, solo los badges de arriba.
            El `backdrop-blur-md` va AQUÍ y no en la capa de la foto porque
            `backdrop-filter` difumina lo que queda DETRÁS del elemento: puesto
            sobre la propia imagen no haría nada. */}
        <div
          className={`absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/25 ${
            esCabeceraCristal ? "backdrop-blur-md" : ""
          }`}
        />

        {/* ===== NAVBAR SUPERIOR: mesa a la izquierda, perfil + CTA a la
             derecha. El CTA de registro late para ser lo primero que note el
             cliente al abrir la app. ===== */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 px-4 py-2">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
            <MapPin className="h-3.5 w-3.5" />
            Mesa {numeroMesa}
          </span>

          {/* Perfil del usuario + llamada a la acción */}
          <div className="flex min-w-0 items-center gap-2">
            {estaRegistrado ? (
              /* Registrado: saludo personalizado (sin CTA de registro) */
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
                <User className="h-3.5 w-3.5" />
                Hola, <span className="nombre-brillante">{clienteNombre}</span>
              </span>
            ) : (
              <>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/20 bg-black/25 px-2 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-md">
                  <UserCircle2 className="h-4 w-4" />
                  Invitado
                </span>
                {/* Copy corto a propósito: "Regístrate y obtén recompensas"
                    no cabía en el navbar de un móvil y se cortaba a media
                    frase, que es peor que no decirlo. El beneficio se explica
                    dentro del modal, no en un botón de 90px. */}
                <button
                  type="button"
                  onClick={() => setModalProactivoAbierto(true)}
                  className="animate-cta-latido inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-red-600 px-3.5 py-1.5 text-xs font-black uppercase text-white shadow-lg shadow-orange-500/30 transition-transform hover:scale-105 active:scale-95"
                >
                  <Sparkles className="h-3 w-3 shrink-0" />
                  Regístrate
                </button>
              </>
            )}
          </div>
        </div>

        {/* El logo y el nombre del restaurante ya NO van sobre la foto: se
            movieron al área clara de abajo para poder pintarlos en negro. */}
      </header>

      {/* CONTENIDO */}
      <main className="relative z-10 -mt-4 flex-1 space-y-5 rounded-t-3xl bg-gray-50 px-5 pb-32 pt-2">
        {/* PROMOCIÓN GLOBAL de la plataforma. La anuncia el dueño de la app, así
            que va antes de la identidad del restaurante: no es su oferta. */}
        {plataforma.promo_activa && plataforma.promo_titulo && (
          <div
            className="animate-fade-in mt-3 rounded-2xl px-4 py-3 text-white shadow-lg"
            style={{ background: plataforma.promo_color }}
            role="status"
          >
            <p className="text-sm font-extrabold leading-tight">
              {plataforma.promo_titulo}
            </p>
            {plataforma.promo_mensaje && (
              <p className="mt-0.5 text-xs leading-relaxed opacity-90">
                {plataforma.promo_mensaje}
              </p>
            )}
          </div>
        )}
        {/* ===== IDENTIDAD DEL RESTAURANTE =====
            Antes vivía sobre la foto de portada y por eso el nombre tenía que
            ser blanco con sombra. Aquí, sobre el fondo claro, puede ir en negro
            y se lee sin depender del brillo de la foto de cada restaurante. */}
        <div className="flex items-center gap-3 pt-3">
          {tema.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tema.logo_url}
              alt={`Logo de ${tema.nombre_restaurante}`}
              className="h-12 w-12 shrink-0 rounded-2xl bg-white object-cover shadow-md ring-1 ring-black/5"
            />
          ) : (
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-extrabold shadow-md ring-1 ring-black/5"
              style={{ color: "var(--brand)" }}
            >
              {tema.iniciales}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-extrabold leading-tight text-zinc-950">
              {tema.nombre_restaurante}
            </h1>
            {tema.eslogan && (
              <p className="truncate text-xs text-gray-500">{tema.eslogan}</p>
            )}
          </div>
        </div>

        {tab === "vip" ? (
          /* ===== TAB VIP / PREMIOS: aquí vive la tarjeta de Beneficios ===== */
          <div className="space-y-5 pt-3">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">
                Beneficios y premios
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Acumula visitas y desbloquea recompensas en cada compra.
              </p>
            </div>

            <TarjetaSellos
              lealtad={lealtad}
              onCanjear={canjearPremio}
              premioCanjeado={premioCanjeado}
            />

            {!estaRegistrado && (
              <button
                type="button"
                onClick={() => setModalProactivoAbierto(true)}
                className="flex w-full items-center justify-center gap-2 rounded-3xl bg-gradient-to-r from-red-600 to-orange-500 px-6 py-4 text-base font-bold text-white shadow-lg shadow-red-500/30 transition hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="h-5 w-5" />
                Regístrate para guardar tus premios
              </button>
            )}

            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <p className="mb-2 text-sm font-bold text-gray-900">
                ¿Cómo funciona?
              </p>
              <ol className="space-y-2 text-sm leading-relaxed text-gray-500">
                <li>1. Cada orden pagada suma una visita.</li>
                <li>
                  2. Al llegar a {lealtad.sellos_para_recompensa} visitas
                  desbloqueas tu {lealtad.descripcion_recompensa}.
                </li>
                <li>3. Canjéalo desde aquí y el ciclo empieza de nuevo.</li>
              </ol>
            </div>
          </div>
        ) : tab === "perfil" ? (
          /* ===== TAB PERFIL ===== */
          <div className="space-y-5 pt-3">
            <div className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white"
                style={{
                  background:
                    "linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 55%, #f59e0b))",
                }}
              >
                <User className="h-7 w-7" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-extrabold text-gray-900">
                  {estaRegistrado ? `Hola, ${clienteNombre}` : "Invitado"}
                </p>
                <p className="text-sm text-gray-500">
                  {estaRegistrado
                    ? `${lealtad.sellos_actuales} de ${lealtad.sellos_para_recompensa} visitas`
                    : "Regístrate para guardar tus favoritos y premios"}
                </p>
              </div>
            </div>

            {!estaRegistrado && (
              <button
                type="button"
                onClick={() => setModalProactivoAbierto(true)}
                className="flex w-full items-center justify-center gap-2 rounded-3xl bg-gradient-to-r from-red-600 to-orange-500 px-6 py-4 text-base font-bold text-white shadow-lg shadow-red-500/30 transition hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="h-5 w-5" />
                Crear mi cuenta
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setTab("home");
                irACategoria(CATEGORIA_FAVORITOS);
              }}
              className="flex w-full items-center gap-3 rounded-3xl bg-white p-5 text-left shadow-sm ring-1 ring-gray-100 transition active:scale-[0.99]"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-500">
                ❤️
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold text-gray-900">
                  Mis favoritos
                </span>
                <span className="block text-xs text-gray-500">
                  {favoriteItems.length} platillo
                  {favoriteItems.length === 1 ? "" : "s"} guardado
                  {favoriteItems.length === 1 ? "" : "s"}
                </span>
              </span>
            </button>

            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <p className="text-sm font-bold text-gray-900">Mesa actual</p>
              <p className="mt-0.5 text-sm text-gray-500">
                Estás en la mesa {numeroMesa} de {tema.nombre_restaurante}.
              </p>
            </div>
          </div>
        ) : (
          <>
        {/* 1) Navegación por categorías (pills, scroll horizontal, sticky) */}
        <CategoriaPills
          categorias={categoriasConFavoritos}
          activa={categoriaActiva}
          onSelect={irACategoria}
        />

        {buscando ? (
          /* --- BÚSQUEDA ACTIVA: resultados planos, sin categorización --- */
          <MenuInteractivo
            categorias={["Resultados"]}
            menu={resultadosBusqueda.map((m) => ({
              ...m,
              categoria: "Resultados",
            }))}
            tituloUnico={`Resultados para "${busqueda.trim()}"`}
            onVerDetalle={setDetalleItem}
            layout={tema.menu_layout}
            vacio={
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white/60 px-6 py-14 text-center">
                <SearchX className="h-12 w-12 text-gray-300" strokeWidth={1.5} />
                <p className="mt-4 max-w-[16rem] text-sm font-medium leading-relaxed text-gray-500">
                  No encontramos “{busqueda.trim()}” en el menú. Prueba con otra
                  palabra.
                </p>
              </div>
            }
          />
        ) : modoFavoritos ? (
          /* --- MODO FAVORITOS: solo los platillos con corazón activo --- */
          <MenuInteractivo
            categorias={[CATEGORIA_FAVORITOS]}
            menu={platillosFavoritos.map((m) => ({
              ...m,
              categoria: CATEGORIA_FAVORITOS,
            }))}
            tituloUnico="Tus favoritos"
            onVerDetalle={setDetalleItem}
            layout={tema.menu_layout}
            vacio={
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white/60 px-6 py-14 text-center">
                <HeartCrack className="h-12 w-12 text-gray-300" strokeWidth={1.5} />
                <p className="mt-4 max-w-[16rem] text-sm font-medium leading-relaxed text-gray-500">
                  Aún no tienes platillos favoritos. ¡Dale al corazón a los que
                  más se te antojen!
                </p>
              </div>
            }
          />
        ) : menu.length === 0 ? (
          /* --- El restaurante existe, pero su carta está vacía ---
             Se dice tal cual. Rellenar el hueco con los platillos de otro
             negocio es justo el fallo que se está corrigiendo. */
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white/60 px-6 py-14 text-center">
            <Store className="h-12 w-12 text-gray-300" strokeWidth={1.5} />
            <p className="mt-4 text-sm font-bold text-gray-700">
              {tema.nombre_restaurante} aún no publicó su menú
            </p>
            <p className="mt-1 max-w-[17rem] text-sm leading-relaxed text-gray-500">
              El restaurante ya está registrado, pero todavía no ha dado de alta
              sus platillos. Vuelve a intentarlo en un rato.
            </p>
          </div>
        ) : (
          <>
            {/* Selección del Chef — fija arriba para dirigir la atención */}
            {/* Selección del Chef — tarjeta destacada, fija arriba del menú.
                Abre el MISMO modal que el resto (con sus modificadores de
                término y guarnición), así el botón de confirmación es el
                componente estandarizado. */}
            {heroItem && (
              <PlatilloHeroCard
                item={heroItem}
                etiqueta={hero.etiqueta}
                onPersonalizar={() => setDetalleItem(heroItem)}
              />
            )}

            {/* 2) Carrusel horizontal "Populares" */}
            <SeccionPopulares items={populares} onVerDetalle={setDetalleItem} />

            {/* 4) Feed principal agrupado por categoría (scroll vertical) */}
            <MenuInteractivo
              categorias={categorias}
              menu={menu}
              onVerDetalle={setDetalleItem}
              layout={tema.menu_layout}
            />
          </>
        )}
          </>
        )}

        {/* ===== REDES DEL RESTAURANTE =====
            Al pie del contenido y no como botón flotante: abajo ya vive la barra
            de navegación, y un botón flotante más competiría con "Pagar" por el
            mismo pulgar. Solo aparece si el dueño llenó algún dato.
            El color es `var(--brand)`, el mismo del tema, sobre las tarjetas
            blancas que ya se usan en toda la vista. */}
        {hayRedes && (
          <div className="flex items-center justify-center gap-3 pt-4">
            {tema.whatsapp_number && (
              <a
                href={`https://wa.me/${tema.whatsapp_number}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`Escribir a ${tema.nombre_restaurante} por WhatsApp`}
                title="WhatsApp"
                className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm ring-1 ring-gray-100 transition hover:shadow-md active:scale-95"
                style={{ color: "var(--brand)" }}
              >
                <MessageCircle className="h-[18px] w-[18px]" />
              </a>
            )}

            {tema.instagram_url && (
              <a
                href={tema.instagram_url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Ver ${tema.nombre_restaurante} en Instagram`}
                title="Instagram"
                className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm ring-1 ring-gray-100 transition hover:shadow-md active:scale-95"
                style={{ color: "var(--brand)" }}
              >
                <Instagram className="h-[18px] w-[18px]" />
              </a>
            )}
          </div>
        )}
      </main>

      {/* BARRA DE NAVEGACIÓN FLOTANTE (estilo Uber Eats) */}
      <BarraNavegacion
        tab={tab}
        onTab={(t) => {
          cerrarBurbuja();
          setTab(t);
        }}
        onAbrirChat={() => {
          // Tocar la píldora con la viñeta abierta despliega el chat completo.
          cerrarBurbuja();
          abrirChat();
        }}
        onPagarOrden={() => {
          cerrarBurbuja();
          abrirCarrito();
        }}
        brillarVIP={brillarVIP}
        busqueda={busqueda}
        onBuscar={setBusqueda}
      />

      {/* MODAL DE PAGO / SPLIT BILL */}
      <ModalPago
        abierto={modalPagoAbierto}
        total={total}
        propina={propina}
        modalidad={modalidad}
        mesa={numeroMesa}
        slug={slug}
        onCerrar={() => setModalPagoAbierto(false)}
        onPagoExitoso={handlePaymentSuccess}
      />

      {/* DETALLE PREMIUM UNIVERSAL — un solo modal para TODO el menú,
          incluido el Ribeye (antes tenía su propio ConfiguradorPlatillo). */}
      <DetallePlatillo
        abierto={detalleItem !== null}
        item={detalleItem}
        onCerrar={() => setDetalleItem(null)}
      />

      {/* DRAWER DEL CARRITO — independiente del chat. La sugerencia de postre es
          un banner ANTES de pagar; el botón de pago va directo al checkout. */}
      <CarritoDrawer
        abierto={carritoAbierto}
        onCerrar={cerrarCarrito}
        onPagar={pagarAhora}
        sugerido={postreSugerido}
        onAgregarSugerido={() =>
          postreSugerido && agregarMenuItem(postreSugerido)
        }
        modalidad={modalidad}
        onCambiarModalidad={setModalidad}
        propina={propina}
        porcentajePropina={porcentajePropina}
        onCambiarPropina={(pct, monto) => {
          setPorcentajePropina(pct);
          setPropina(monto);
        }}
      />

      {/* CLÍMAX DE LEALTAD: celebración + captura de datos en la 5ª visita */}
      <ModalRegistroPremio
        abierto={modalRegistroAbierto}
        premio={lealtad.descripcion_recompensa}
        onRegistrar={handleRegistroPremio}
      />

      {/* REGISTRO PROACTIVO: mismo modal, disparado desde el header */}
      <ModalRegistroPremio
        abierto={modalProactivoAbierto}
        modo="proactivo"
        premio={lealtad.descripcion_recompensa}
        onCerrar={() => setModalProactivoAbierto(false)}
        onRegistrar={handleRegistroProactivo}
      />

      {/* Confirmación de recompensa guardada */}
      {avisoExito && (
        <div className="fixed inset-x-0 bottom-24 z-[75] mx-auto max-w-md px-4">
          <div className="animate-toast flex items-start gap-3 rounded-2xl border border-green-200 bg-white p-4 shadow-2xl">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Gift className="h-4 w-4" />
            </span>
            <p className="flex-1 text-sm font-semibold leading-snug text-gray-900">
              {avisoExito}
            </p>
            <button
              type="button"
              onClick={() => setAvisoExito(null)}
              className="shrink-0 rounded-full p-1 text-gray-400 transition hover:bg-gray-100"
              aria-label="Cerrar aviso"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
