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
  const { tema, menu, categorias } = restaurante;

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
        const { [itemId]: _, ...resto } = c;
        return resto;
      }
      return { ...c, [itemId]: actual - 1 };
    });

  const cantidadEnCarrito = (itemId: string) => carrito[itemId] ?? 0;

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
      className="mx-auto flex min-h-screen max-w-md flex-col bg-gray-50"
    >
      {/* HEADER con marca dinámica */}
      <header
        className="sticky top-0 z-20 px-5 py-3 text-white shadow-sm"
        style={{ background: "var(--brand)" }}
      >
        <div className="flex items-center gap-3">
          {tema.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tema.logo_url}
              alt={tema.nombre_restaurante}
              className="h-10 w-10 rounded-full bg-white object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold" style={{ color: "var(--brand)" }}>
              {tema.iniciales}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold leading-tight">
              {tema.nombre_restaurante}
            </h1>
            {tema.eslogan && (
              <p className="truncate text-xs text-white/80">{tema.eslogan}</p>
            )}
          </div>
          <span className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">
            <MapPin className="h-3.5 w-3.5" />
            Mesa {numeroMesa}
          </span>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="flex-1 space-y-5 px-5 py-5 pb-32">
        <TarjetaSellos lealtad={lealtad} />

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
