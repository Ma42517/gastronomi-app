"use client";

import type { ReactNode } from "react";
import type { MenuItemMock } from "@/lib/mock-data";
import { Editable } from "@/components/edicion/Editable";
import { ProductCard } from "./ProductCard";

/** Ancla (id de sección) para una categoría — usado por las pills para navegar. */
export const anchorCategoria = (categoria: string) =>
  `cat-${categoria.toLowerCase().replace(/\s+/g, "-")}`;

interface MenuInteractivoProps {
  categorias: string[];
  menu: MenuItemMock[];
  /** Abre el detalle premium del platillo. */
  onVerDetalle: (item: MenuItemMock) => void;
  /** Título alternativo para la única sección (modo Favoritos). */
  tituloUnico?: string;
  /** Empty state a mostrar si no hay platillos que listar. */
  vacio?: ReactNode;
  /**
   * Editor en vivo. Si se pasan, cada tarjeta y cada título quedan envueltos en
   * `<Editable>`, que NO pinta nada mientras el modo edición esté apagado.
   *
   * Van como props y no leyendo el estado global aquí para que este componente
   * siga sin saber nada del editor: recibe qué hacer, no cómo se decide.
   */
  onEditarPlatillo?: (item: MenuItemMock) => void;
  onEditarCategoria?: (categoria: string) => void;
}

/**
 * CUADRÍCULA FIJA DE DOS COLUMNAS.
 *
 * Antes era configurable por restaurante. Se fijó a propósito: es la disposición
 * que soporta la multimedia de los platillos y la que hace que el comensal
 * reconozca la aplicación en cualquier restaurante. Con dos variantes vivas, cada
 * mejora del menú había que pensarla y probarla dos veces.
 */
const CLASES_CUADRICULA = "grid grid-cols-2 gap-4";

export function MenuInteractivo({
  categorias,
  menu,
  onVerDetalle,
  tituloUnico,
  vacio,
  onEditarPlatillo,
  onEditarCategoria,
}: MenuInteractivoProps) {
  // Empty state (ej. Favoritos sin platillos guardados).
  if (menu.length === 0 && vacio) return <>{vacio}</>;

  return (
    <div className="space-y-8">
      {categorias.map((categoria) => {
        const items = menu.filter((m) => m.categoria === categoria);
        if (items.length === 0) return null;

        return (
          <section
            key={categoria}
            id={anchorCategoria(categoria)}
            className="scroll-mt-20"
          >
            {/* El título solo es editable cuando es una categoría de verdad:
                "Tus favoritos" y "Resultados" son secciones virtuales y
                renombrarlas no tendría dónde guardarse. */}
            {onEditarCategoria && !tituloUnico ? (
              <Editable
                onEditar={() => onEditarCategoria(categoria)}
                etiqueta={`Renombrar la categoría ${categoria}`}
                className="mb-3 inline-block"
              >
                <h2 className="text-lg font-extrabold text-zinc-950">
                  {categoria}
                </h2>
              </Editable>
            ) : (
              <h2 className="mb-3 text-lg font-extrabold text-zinc-950">
                {tituloUnico ?? categoria}
              </h2>
            )}

            <div className={CLASES_CUADRICULA}>
              {items.map((item) =>
                onEditarPlatillo ? (
                  <Editable
                    key={item.id}
                    onEditar={() => onEditarPlatillo(item)}
                    etiqueta={`Editar ${item.nombre}`}
                    // La tarjeta ya lleva su badge "Personalizar" arriba a la
                    // derecha: el lápiz se saca fuera del recuadro para que no se
                    // tapen entre ellos.
                    lapizFuera
                  >
                    <ProductCard
                      item={item}
                      onAbrir={() => onVerDetalle(item)}
                      className="w-full"
                    />
                  </Editable>
                ) : (
                  <ProductCard
                    key={item.id}
                    item={item}
                    onAbrir={() => onVerDetalle(item)}
                    className="w-full"
                  />
                ),
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
