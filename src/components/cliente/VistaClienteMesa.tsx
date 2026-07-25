"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  Gift,
  HeartCrack,
  MapPin,
  SearchX,
  Sparkles,
  User,
  UserCircle2,
  X,
} from "lucide-react";
import type { MenuItemMock, ProgramaLealtad, RestauranteMock } from "@/lib/mock-data";
import { useCartStore } from "@/lib/cart-store";
import { TarjetaSellos } from "./TarjetaSellos";
import { CategoriaPills } from "./CategoriaPills";
import { SeccionPopulares } from "./SeccionPopulares";
import { PlatilloHeroCard } from "./PlatilloHeroCard";
import { ConfiguradorPlatillo } from "./ConfiguradorPlatillo";
import { DetallePlatillo } from "./DetallePlatillo";
import { MenuInteractivo, anchorCategoria } from "./MenuInteractivo";
import { CarritoDrawer } from "./CarritoDrawer";
import { ModalPago } from "./ModalPago";
import { ModalRegistroPremio } from "./ModalRegistroPremio";
import { useNomAI } from "./NomAIContext";

/** Categoría virtual (no existe en el menú) para filtrar los favoritos. */
const CATEGORIA_FAVORITOS = "❤️ Favoritos";

/** ID del ítem de premio canjeado (se agrega al carrito con precio $0.00). */
const PREMIO_ID = "premio-lealtad";

interface VistaClienteMesaProps {
  restaurante: RestauranteMock;
  numeroMesa: string;
}

export function VistaClienteMesa({
  restaurante,
  numeroMesa,
}: VistaClienteMesaProps) {
  const { tema, menu, categorias, hero } = restaurante;

  const [categoriaActiva, setCategoriaActiva] = useState(categorias[0]);
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  const [configuradorAbierto, setConfiguradorAbierto] = useState(false);
  const [detalleItem, setDetalleItem] = useState<MenuItemMock | null>(null);
  const [lealtad, setLealtad] = useState<ProgramaLealtad>(restaurante.lealtad);
  // Lealtad / lead gen: intercepción del premio en la 5ª visita.
  const [modalRegistroAbierto, setModalRegistroAbierto] = useState(false);
  const [premioReclamado, setPremioReclamado] = useState(false);
  const [premioCanjeado, setPremioCanjeado] = useState(false);
  const [avisoExito, setAvisoExito] = useState<string | null>(null);
  // Registro proactivo desde el header (no espera la 5ª visita).
  const [modalProactivoAbierto, setModalProactivoAbierto] = useState(false);
  // Buscador global (la "lupita" del menú sticky).
  const [busqueda, setBusqueda] = useState("");

  // --- Carrito global (Zustand) ---
  const items = useCartStore((s) => s.items);
  const addToCart = useCartStore((s) => s.addToCart);
  const clearCart = useCartStore((s) => s.clearCart);
  const favoriteItems = useCartStore((s) => s.favoriteItems);
  const total = items.reduce((a, i) => a + i.precio * i.cantidad, 0);

  // Contexto de Ñom AI.
  const {
    setEscena,
    setRestauranteNombre,
    setPlatilloActual,
    setCategoriaActual,
    clienteNombre,
    setClienteNombre,
    carritoAbierto,
    cerrarCarrito,
  } = useNomAI();

  // Platillo héroe configurable (Ribeye).
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

  // --- Ñom AI: nombre del restaurante y escena activa ---
  useEffect(() => {
    setRestauranteNombre(tema.nombre_restaurante);
  }, [tema.nombre_restaurante, setRestauranteNombre]);

  // La escena controla la visibilidad de la barra de Ñom AI: solo se muestra en
  // "categorias". Durante un platillo (tarjeta inline), el drawer del carrito o
  // el checkout, la barra se OCULTA para evitar colisiones de botones.
  useEffect(() => {
    setEscena(
      configuradorAbierto || detalleItem
        ? "platillo"
        : modalPagoAbierto || carritoAbierto
          ? "carrito"
          : "categorias",
    );
  }, [
    configuradorAbierto,
    detalleItem,
    modalPagoAbierto,
    carritoAbierto,
    setEscena,
  ]);

  // Informa a Ñom AI qué platillo (y categoría) está viendo el cliente.
  useEffect(() => {
    const actual =
      configuradorAbierto && heroItem ? heroItem : detalleItem ?? null;
    setPlatilloActual(actual?.nombre ?? "");
    setCategoriaActual(actual?.categoria ?? "");
  }, [
    configuradorAbierto,
    heroItem,
    detalleItem,
    setPlatilloActual,
    setCategoriaActual,
  ]);

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

    // CIERRE DEL LOOP: si se pagó el premio, el ciclo vuelve a empezar en 0/5.
    if (incluiaPremio) {
      setLealtad((l) => ({ ...l, sellos_actuales: 0 }));
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
    setLealtad((l) => ({
      ...l,
      sellos_actuales: Math.min(nuevasVisitas, l.sellos_para_recompensa),
    }));
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
    cerrarCarrito();
    setModalPagoAbierto(true);
  };

  // Inyección del tema: la CSS var --brand alimenta todos los componentes hijos.
  const estiloTema = { "--brand": tema.color_primario } as CSSProperties;

  return (
    <div
      style={estiloTema}
      className="relative mx-auto flex min-h-screen max-w-md flex-col bg-gray-50 shadow-2xl sm:border-x sm:border-gray-200"
    >
      {/* HEADER PREMIUM — imagen de portada + overlay */}
      <header className="relative h-52 w-full shrink-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--brand) 75%, black), var(--brand))",
          }}
        />
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${tema.portada_url})` }}
          role="img"
          aria-label={`Portada de ${tema.nombre_restaurante}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/30" />

        {/* Badge de mesa + perfil (invitado con CTA de registro / saludo) */}
        <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
            <MapPin className="h-3.5 w-3.5" />
            Mesa {numeroMesa}
          </span>

          {/* Contenedor flex alineado a la derecha (perfil del usuario) */}
          <div className="flex items-center gap-2">
            {estaRegistrado ? (
              /* Registrado: saludo personalizado (sin CTA de registro) */
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
                <User className="h-3.5 w-3.5" />
                Hola, <span className="nombre-brillante">{clienteNombre}</span>
              </span>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/25 px-2.5 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-md">
                  <UserCircle2 className="h-4 w-4" />
                  Invitado
                </span>
                <button
                  type="button"
                  onClick={() => setModalProactivoAbierto(true)}
                  className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-red-600 to-orange-500 px-4 py-1.5 text-sm font-bold text-white shadow-lg shadow-red-500/30 transition-transform hover:scale-105 active:scale-95"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Regístrate
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navbar: LOGO del restaurante (o iniciales como placeholder) + nombre */}
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 px-5 pb-7 pt-5">
          {tema.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tema.logo_url}
              alt={`Logo de ${tema.nombre_restaurante}`}
              className="h-12 w-12 shrink-0 rounded-2xl bg-white/90 object-cover shadow-md"
            />
          ) : (
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-sm font-extrabold shadow-md backdrop-blur"
              style={{ color: "var(--brand)" }}
            >
              {tema.iniciales}
            </div>
          )}
          <div className="min-w-0 flex-1 pb-0.5">
            <h1 className="truncate text-xl font-extrabold leading-tight text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]">
              {tema.nombre_restaurante}
            </h1>
            {tema.eslogan && (
              <p className="truncate text-xs text-white/90 [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">
                {tema.eslogan}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="relative z-10 -mt-4 flex-1 space-y-5 rounded-t-3xl bg-gray-50 px-5 pb-32 pt-2">
        {/* 1) Navegación por categorías (pills, scroll horizontal, sticky) */}
        <CategoriaPills
          categorias={categoriasConFavoritos}
          activa={categoriaActiva}
          onSelect={irACategoria}
          busqueda={busqueda}
          onBuscar={setBusqueda}
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
        ) : (
          <>
            {/* Selección del Chef — fija arriba para dirigir la atención */}
            {heroItem && (
              <PlatilloHeroCard
                item={heroItem}
                etiqueta={hero.etiqueta}
                onPersonalizar={() => setConfiguradorAbierto(true)}
              />
            )}

            <TarjetaSellos
              lealtad={lealtad}
              onCanjear={canjearPremio}
              premioCanjeado={premioCanjeado}
            />

            {/* 2) Carrusel horizontal "Populares" */}
            <SeccionPopulares items={populares} onVerDetalle={setDetalleItem} />

            {/* 4) Feed principal agrupado por categoría (scroll vertical) */}
            <MenuInteractivo
              categorias={categorias}
              menu={menu}
              onVerDetalle={setDetalleItem}
            />
          </>
        )}
      </main>

      {/* MODAL DE PAGO / SPLIT BILL */}
      <ModalPago
        abierto={modalPagoAbierto}
        total={total}
        onCerrar={() => setModalPagoAbierto(false)}
        onPagoExitoso={handlePaymentSuccess}
      />

      {/* CONFIGURADOR INMERSIVO DEL PLATILLO HÉROE (Ribeye) */}
      {heroItem && (
        <ConfiguradorPlatillo
          abierto={configuradorAbierto}
          item={heroItem}
          guarniciones={hero.guarniciones}
          onCerrar={() => setConfiguradorAbierto(false)}
          onConfirmar={() => agregarMenuItem(heroItem)}
        />
      )}

      {/* DETALLE PREMIUM UNIVERSAL (cualquier platillo del menú) */}
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
