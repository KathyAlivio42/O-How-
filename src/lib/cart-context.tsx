"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartItem } from "@/lib/types";

interface CartContextValue {
  items: CartItem[];
  fulfillmentType: "pickup" | "delivery" | null;
  setFulfillmentType: (t: "pickup" | "delivery") => void;
  addItem: (item: Omit<CartItem, "cart_item_id">) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  itemCount: number;
  subtotalEstimate: number; // display-only estimate; server recalculates at checkout
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "ohow_cart_v1";
const FULFILLMENT_KEY = "ohow_fulfillment_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [fulfillmentType, setFulfillmentTypeState] = useState<
    "pickup" | "delivery" | null
  >(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(STORAGE_KEY);
      if (savedCart) setItems(JSON.parse(savedCart));
      const savedFulfillment = localStorage.getItem(FULFILLMENT_KEY);
      if (savedFulfillment === "pickup" || savedFulfillment === "delivery") {
        setFulfillmentTypeState(savedFulfillment);
      }
    } catch {
      // Corrupt/blocked storage — start with an empty cart rather than crash.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  function setFulfillmentType(t: "pickup" | "delivery") {
    setFulfillmentTypeState(t);
    localStorage.setItem(FULFILLMENT_KEY, t);
  }

  function addItem(item: Omit<CartItem, "cart_item_id">) {
    const cart_item_id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${item.product_id}-${Date.now()}`;
    setItems((prev) => [...prev, { ...item, cart_item_id }]);
  }

  function updateQuantity(cartItemId: string, quantity: number) {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.cart_item_id !== cartItemId)
        : prev.map((i) =>
            i.cart_item_id === cartItemId ? { ...i, quantity } : i
          )
    );
  }

  function removeItem(cartItemId: string) {
    setItems((prev) => prev.filter((i) => i.cart_item_id !== cartItemId));
  }

  function clearCart() {
    setItems([]);
  }

  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const subtotalEstimate = useMemo(
    () =>
      items.reduce((sum, i) => {
        const optionsTotal = i.selected_options.reduce(
          (s, o) => s + o.price_delta,
          0
        );
        return sum + (i.base_price + optionsTotal) * i.quantity;
      }, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        fulfillmentType,
        setFulfillmentType,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        itemCount,
        subtotalEstimate,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
