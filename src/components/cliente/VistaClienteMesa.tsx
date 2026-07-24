"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { MapPin } from "lucide-react";
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
import { useNomAI } from "./NomAIContext";

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

  // --- Carrito global (Zustand) ---
  const items = useCartStore((s) => s.items);
  const addToCart = useCartStore((s) => s.addToCart);
  const clearCart = useCartStore((s) => s.clearCart);
  const total = items.reduce((a, i) => a + i.precio * i.cantidad, 0);

  // Contexto de Ñom AI.
  const {
    setEscena,
    setRestauranteNombre,
    setPlatilloActual,
    setCategoriaActual,
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

  // Navegación por pills: desplaza suavemente a la sección de la categoría.
  const irACategoria = (categoria: string) => {
    setCategoriaActiva(categoria);
    document
      .getElementById(anchorCategoria(categoria))
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const onPagoExitoso = () => {
    setLealtad((l) => ({
      ...l,
      sellos_actuales: Math.min(l.sellos_actuales + 1, l.sellos_para_recompensa),
    }));
    clearCart();
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

        {/* Badge de mesa (glassmorphism) */}
        <div className="absolute right-4 top-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
            <MapPin className="h-3.5 w-3.5" />
            Mesa {numeroMesa}
          </span>
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
          categorias={categorias}
          activa={categoriaActiva}
          onSelect={irACategoria}
        />

        {/* Selección del Chef — fija arriba para dirigir la atención */}
        {heroItem && (
          <PlatilloHeroCard
            item={heroItem}
            etiqueta={hero.etiqueta}
            onPersonalizar={() => setConfiguradorAbierto(true)}
          />
        )}

        <TarjetaSellos lealtad={lealtad} />

        {/* 2) Carrusel horizontal "Populares" */}
        <SeccionPopulares items={populares} onVerDetalle={setDetalleItem} />

        {/* 4) Feed principal agrupado por categoría (scroll vertical) */}
        <MenuInteractivo
          categorias={categorias}
          menu={menu}
          onVerDetalle={setDetalleItem}
        />
      </main>

      {/* MODAL DE PAGO / SPLIT BILL */}
      <ModalPago
        abierto={modalPagoAbierto}
        total={total}
        onCerrar={() => setModalPagoAbierto(false)}
        onPagoExitoso={onPagoExitoso}
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
    </div>
  );
}
