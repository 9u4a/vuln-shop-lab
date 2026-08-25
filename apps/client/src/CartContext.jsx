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

function lineKey(productId, option) {
  return `${productId}::${option || ''}`;
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

  function addItem(product, quantity = 1, option = null) {
    const key = lineKey(product.id, option);
    setItems((prev) => ({
      ...prev,
      [key]: {
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        option: option || null,
        quantity: (prev[key]?.quantity || 0) + quantity,
      },
    }));
  }

  function setQuantity(productId, option, quantity) {
    const key = lineKey(productId, option);
    setItems((prev) => {
      const next = { ...prev };
      if (quantity <= 0) {
        delete next[key];
      } else {
        next[key] = { ...next[key], quantity };
      }
      return next;
    });
  }

  function removeItem(productId, option) {
    const key = lineKey(productId, option);
    setItems((prev) => {
      const next = { ...prev };
      delete next[key];
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
