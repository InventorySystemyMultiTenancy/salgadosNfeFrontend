import { createContext, useContext, useMemo, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  function addItem(product) {
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [
        ...current,
        { productId: product.id, name: product.name, unitPrice: Number(product.price), quantity: 1 },
      ];
    });
  }

  function decreaseItem(productId) {
    setItems((current) =>
      current
        .map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function removeItem(productId) {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }

  function clearCart() {
    setItems([]);
  }

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [items],
  );

  return (
    <CartContext.Provider
      value={{ items, addItem, decreaseItem, removeItem, clearCart, total }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
