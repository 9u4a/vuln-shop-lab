import { createContext, useContext, useEffect, useState } from 'react';
import { useBackend } from './BackendContext.jsx';

const CartContext = createContext(null);

function readCart(storageKey) {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch {
    return {};
  }
}

function CartProvider({ children }) {
  const { backendKey } = useBackend();
  const storageKey = `cart_${backendKey}`;
  const [items, setItems] = useState(() => readCart(storageKey));

  useEffect(() => {
    setItems(readCart(storageKey));
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, storageKey]);

  function addItem(product, quantity = 1) {
    setItems((prev) => ({
      ...prev,
      [product.id]: {
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: (prev[product.id]?.quantity || 0) + quantity,
      },
    }));
  }

  function setQuantity(productId, quantity) {
    setItems((prev) => {
      const next = { ...prev };
      if (quantity <= 0) {
        delete next[productId];
      } else {
        next[productId] = { ...next[productId], quantity };
      }
      return next;
    });
  }

  function removeItem(productId) {
    setItems((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }

  function clear() {
    setItems({});
  }

  const list = Object.values(items);
  const total = list.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items: list, total, addItem, setQuantity, removeItem, clear }}>
      {children}
    </CartContext.Provider>
  );
}

function useCart() {
  return useContext(CartContext);
}

export { CartProvider, useCart };
