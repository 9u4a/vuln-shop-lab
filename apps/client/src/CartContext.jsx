import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useBackend } from './BackendContext.jsx';
import { useSession } from './SessionContext.jsx';
import {
  fetchCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
} from './api.js';

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

// 서버 장바구니 라인 → 클라이언트 아이템 형태로 정규화.
function normalizeServerLine(l) {
  return {
    cartItemId: l.id,
    productId: l.productId,
    name: l.name,
    price: Number(l.price),
    option: l.optionValue || null,
    optionName: l.optionName || null,
    optionValues: Array.isArray(l.optionValues) ? l.optionValues : [],
    stock: l.stock != null ? Number(l.stock) : null,
    quantity: l.quantity,
  };
}

function CartProvider({ children }) {
  const { backend, backendKey } = useBackend();
  const { user, loading } = useSession();
  const storageKey = `cart_${backendKey}`;

  // 비로그인: localStorage 객체 / 로그인: 서버 라인 배열
  const [localItems, setLocalItems] = useState(() => readCart(storageKey));
  const [serverItems, setServerItems] = useState([]);
  const mergedKeyRef = useRef(null);

  const loggedIn = !!user;

  useEffect(() => {
    if (!loggedIn) setLocalItems(readCart(storageKey));
  }, [storageKey, loggedIn]);

  useEffect(() => {
    if (!loggedIn) localStorage.setItem(storageKey, JSON.stringify(localItems));
  }, [localItems, storageKey, loggedIn]);

  const refreshServer = useCallback(() => {
    fetchCart(backend.base)
      .then((d) => setServerItems((d.items || []).map(normalizeServerLine)))
      .catch(() => setServerItems([]));
  }, [backend.base]);

  // 로그인 시: localStorage 라인을 서버 장바구니로 1회 병합 후 로컬 비우기.
  useEffect(() => {
    if (loading) return;
    if (!loggedIn) {
      mergedKeyRef.current = null;
      return;
    }
    if (mergedKeyRef.current === storageKey) return;
    mergedKeyRef.current = storageKey;
    const pending = Object.values(readCart(storageKey));
    (async () => {
      for (const it of pending) {
        try {
          await addCartItem(backend.base, it.productId, it.quantity, it.option);
        } catch {
          /* 상품이 사라졌을 수 있음 — 무시 */
        }
      }
      // 로그인 후에는 서버 장바구니만 사용한다 — localStorage는 항상 비운다.
      localStorage.removeItem(storageKey);
      setLocalItems({});
      refreshServer();
    })();
  }, [loggedIn, loading, backend.base, storageKey, refreshServer]);

  useEffect(() => {
    if (loggedIn && !loading) refreshServer();
  }, [loggedIn, loading, refreshServer]);

  function findServerLine(productId, option) {
    return serverItems.find((i) => i.productId === productId && (i.option || null) === (option || null));
  }

  // ---- 공개 API (로그인 여부에 따라 서버/로컬 분기) ----

  function addItem(product, quantity = 1, option = null) {
    if (loggedIn) {
      addCartItem(backend.base, product.id, quantity, option).then((d) =>
        setServerItems((d.items || []).map(normalizeServerLine))
      );
      return;
    }
    const key = lineKey(product.id, option);
    setLocalItems((prev) => ({
      ...prev,
      [key]: {
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        option: option || null,
        optionName: product.optionName || null,
        optionValues: Array.isArray(product.optionValues) ? product.optionValues : [],
        stock: product.stock != null ? Number(product.stock) : null,
        quantity: (prev[key]?.quantity || 0) + quantity,
      },
    }));
  }

  function setQuantity(productId, option, quantity) {
    if (loggedIn) {
      const line = findServerLine(productId, option);
      if (!line) return;
      updateCartItem(backend.base, line.cartItemId, quantity).then((d) =>
        setServerItems((d.items || []).map(normalizeServerLine))
      );
      return;
    }
    const key = lineKey(productId, option);
    setLocalItems((prev) => {
      const next = { ...prev };
      if (quantity <= 0) delete next[key];
      else next[key] = { ...next[key], quantity };
      return next;
    });
  }

  function changeOption(productId, oldOption, newOption) {
    if (oldOption === newOption) return;
    if (loggedIn) {
      const line = findServerLine(productId, oldOption);
      if (!line) return;
      (async () => {
        await removeCartItem(backend.base, line.cartItemId);
        const d = await addCartItem(backend.base, productId, line.quantity, newOption);
        setServerItems((d.items || []).map(normalizeServerLine));
      })();
      return;
    }
    const oldKey = lineKey(productId, oldOption);
    const newKey = lineKey(productId, newOption);
    setLocalItems((prev) => {
      const line = prev[oldKey];
      if (!line) return prev;
      const next = { ...prev };
      delete next[oldKey];
      if (next[newKey]) next[newKey] = { ...next[newKey], quantity: next[newKey].quantity + line.quantity };
      else next[newKey] = { ...line, option: newOption };
      return next;
    });
  }

  function removeItem(productId, option) {
    if (loggedIn) {
      const line = findServerLine(productId, option);
      if (!line) return;
      removeCartItem(backend.base, line.cartItemId).then((d) =>
        setServerItems((d.items || []).map(normalizeServerLine))
      );
      return;
    }
    const key = lineKey(productId, option);
    setLocalItems((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function clear() {
    if (loggedIn) {
      clearCart(backend.base).then(() => setServerItems([]));
      return;
    }
    setLocalItems({});
  }

  const list = loggedIn ? serverItems : Object.values(localItems);
  const total = list.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items: list, total, addItem, setQuantity, changeOption, removeItem, clear }}>
      {children}
    </CartContext.Provider>
  );
}

function useCart() {
  return useContext(CartContext);
}

export { CartProvider, useCart };
