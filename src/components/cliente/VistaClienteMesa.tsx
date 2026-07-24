"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { MapPin } from "lucide-react";
import type {
  CarritoLinea,
  MenuItemMock,
  ProgramaLealtad,
  RestauranteMock,
} from "@/lib/mock-data";
import { TarjetaSellos } from "./TarjetaSellos";
import { SommelierBanner } from "./SommelierBanner";
import { MenuInteractivo } from "./MenuInteractivo";
import { CarritoFlotante } from "./CarritoFlotante";
import { ModalPago } from "./ModalPago";

interface VistaClienteMesaProps {
  restaurante: RestauranteMock;
  numeroMesa: string;
}

export function VistaClienteMesa({
  restaurante,
  numeroMesa,
}: VistaClienteMesaProps) {
  const { tema, menu, categorias, sommelier } = restaurante;

  const [categoriaActiva, setCategoriaActiva] = useState(categorias[0]);
  // Carrito: mapa itemId -> cantidad
  const [carrito, setCarrito] = useState<Record<string, number>>({});
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  // La lealtad es estado local para poder animar el +1 tras pagar (mock).
  const [lealtad, setLealtad] = useState<ProgramaLealtad>(restaurante.lealtad);

  // --- Derivados del carrito ---
  const lineas: CarritoLinea[] = useMemo(
    () =>
      menu
        .filter((m) => (carrito[m.id] ?? 0) > 0)
        .map((item) => ({ item, cantidad: carrito[item.id] })),
    [carrito, menu],
  );

  const total = useMemo(
    () => lineas.reduce((acc, l) => acc + l.item.precio * l.cantidad, 0),
    [lineas],
  );

  const totalItems = useMemo(
    () => lineas.reduce((acc, l) => acc + l.cantidad, 0),
    [lineas],
  );

  // --- Handlers ---
  const agregar = (item: MenuItemMock) =>
    setCarrito((c) => ({ ...c, [item.id]: (c[item.id] ?? 0) + 1 }));

  const quitar = (itemId: string) =>
    setCarrito((c) => {
      const actual = c[itemId] ?? 0;
      if (actual <= 1) {
        const copia = { ...c };
        delete copia[itemId];
        return copia;
      }
      return { ...c, [itemId]: actual - 1 };
    });

  const cantidadEnCarrito = (itemId: string) => carrito[itemId] ?? 0;

  const agregarSugerenciaAI = () => {
    const sugerido = menu.find((m) => m.id === sommelier.item_id);
    if (sugerido) agregar(sugerido);
  };

  const onPagoExitoso = () => {
    // Suma un sello (tope en la meta) y vacía el carrito.
    setLealtad((l) => ({
      ...l,
      sellos_actuales: Math.min(
        l.sellos_actuales + 1,
        l.sellos_para_recompensa,
      ),
    }));
    setCarrito({});
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
        {/* Gradiente de respaldo (si la imagen no carga) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--brand) 75%, black), var(--brand))",
          }}
        />
        {/* Imagen de portada */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${tema.portada_url})` }}
          role="img"
          aria-label={`Portada de ${tema.nombre_restaurante}`}
        />
        {/* Overlay para legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/30" />

        {/* Badge de mesa (glassmorphism) */}
        <div className="absolute right-4 top-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
            <MapPin className="h-3.5 w-3.5" />
            Mesa {numeroMesa}
          </span>
        </div>

        {/* Nombre del restaurante */}
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 px-5 pb-7 pt-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-sm font-extrabold shadow-md backdrop-blur" style={{ color: "var(--brand)" }}>
            {tema.iniciales}
          </div>
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

      {/* CONTENIDO — hoja redondeada que sube sobre la portada */}
      <main className="relative z-10 -mt-4 flex-1 space-y-5 rounded-t-3xl bg-gray-50 px-5 pb-32 pt-5">
        <TarjetaSellos lealtad={lealtad} />

        <SommelierBanner sugerencia={sommelier} onAgregar={agregarSugerenciaAI} />

        <MenuInteractivo
          categorias={categorias}
          menu={menu}
          categoriaActiva={categoriaActiva}
          onCategoriaChange={setCategoriaActiva}
          cantidadEnCarrito={cantidadEnCarrito}
          onAgregar={agregar}
          onQuitar={quitar}
        />
      </main>

      {/* CARRITO FLOTANTE */}
      <CarritoFlotante
        lineas={lineas}
        total={total}
        totalItems={totalItems}
        onAgregar={(l) => agregar(l.item)}
        onQuitar={quitar}
        onPagar={() => setModalPagoAbierto(true)}
      />

      {/* MODAL DE PAGO / SPLIT BILL */}
      <ModalPago
        abierto={modalPagoAbierto}
        total={total}
        onCerrar={() => setModalPagoAbierto(false)}
        onPagoExitoso={onPagoExitoso}
      />
    </div>
  );
}
