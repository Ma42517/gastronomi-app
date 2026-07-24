import { create } from "zustand";

/** Artículo dentro del carrito global. */
export interface CartItem {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  emoji?: string;
}

interface CartState {
  items: CartItem[];
  /** Agrega 1 unidad (o incrementa si ya existe). */
  addToCart: (item: Omit<CartItem, "cantidad">) => void;
  /** Quita 1 unidad (elimina la línea si llega a 0). */
  removeFromCart: (id: string) => void;
  /** Vacía el carrito. */
  clearCart: () => void;
  /** Total en dinero. */
  getCartTotal: () => number;
  /** Número total de artículos. */
  getCartCount: () => number;
}

/**
 * CartStore global (Zustand). Fuente única de verdad del carrito, compartida
 * por el menú, el detalle de platillo, el carrito flotante y el chat de Ñom AI.
 */
export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addToCart: (item) =>
    set((state) => {
      const existente = state.items.find((i) => i.id === item.id);
      if (existente) {
        return {
          items: state.items.map((i) =>
            i.id === item.id ? { ...i, cantidad: i.cantidad + 1 } : i,
          ),
        };
      }
      return { items: [...state.items, { ...item, cantidad: 1 }] };
    }),

  removeFromCart: (id) =>
    set((state) => {
      const existente = state.items.find((i) => i.id === id);
      if (!existente) return state;
      if (existente.cantidad <= 1) {
        return { items: state.items.filter((i) => i.id !== id) };
      }
      return {
        items: state.items.map((i) =>
          i.id === id ? { ...i, cantidad: i.cantidad - 1 } : i,
        ),
      };
    }),

  clearCart: () => set({ items: [] }),

  getCartTotal: () =>
    get().items.reduce((acc, i) => acc + i.precio * i.cantidad, 0),

  getCartCount: () => get().items.reduce((acc, i) => acc + i.cantidad, 0),
}));
