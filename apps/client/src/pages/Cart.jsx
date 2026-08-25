import { useEffect, useRef, useState } from 'react';
import { loadTossPayments, ANONYMOUS } from '@tosspayments/tosspayments-sdk';
import { useCart } from '../CartContext.jsx';
import { useBackend } from '../BackendContext.jsx';
import { createOrder } from '../api.js';
import { formatCurrency } from '../format.js';

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY;

export default function Cart() {
  const { items, total, setQuantity, removeItem } = useCart();
  const { backend } = useBackend();
  const [error, setError] = useState(null);
  const [pendingNote, setPendingNote] = useState(null);
  const [pendingPayment, setPendingPayment] = useState(null);
  const [widgetsReady, setWidgetsReady] = useState(false);
  const widgetsRef = useRef(null);

  useEffect(() => {
    if (!pendingPayment) return;
    let cancelled = false;
    setWidgetsReady(false);

    (async () => {
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      const widgets = tossPayments.widgets({ customerKey: ANONYMOUS });
      if (cancelled) return;
      widgetsRef.current = widgets;
      await widgets.setAmount({ currency: 'KRW', value: pendingPayment.amount });
      if (cancelled) return;
      await Promise.all([
        widgets.renderPaymentMethods({ selector: '#payment-method', variantKey: 'DEFAULT' }),
        widgets.renderAgreement({ selector: '#agreement', variantKey: 'AGREEMENT' }),
      ]);
      if (!cancelled) setWidgetsReady(true);
    })().catch((err) => setError(err.message));

    return () => {
      cancelled = true;
    };
  }, [pendingPayment]);

  async function handleCheckout() {
    setError(null);
    setPendingNote(null);
    try {
      const { orderId, tossOrderId, amount } = await createOrder(backend.base, items);
      if (!TOSS_CLIENT_KEY) {
        setPendingNote(
          `주문 #${orderId}이(가) 결제 대기 상태로 생성되었습니다. Toss 결제를 계속하려면 VITE_TOSS_CLIENT_KEY를 설정하세요.`
        );
        return;
      }
      setPendingPayment({ orderId, tossOrderId, amount });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handlePay() {
    setError(null);
    try {
      await widgetsRef.current.requestPayment({
        orderId: pendingPayment.tossOrderId,
        orderName: `Vuln Shop order #${pendingPayment.orderId}`,
        successUrl: `${window.location.origin}/checkout/success?orderId=${pendingPayment.orderId}`,
        failUrl: `${window.location.origin}/checkout/fail?orderId=${pendingPayment.orderId}`,
      });
    } catch (err) {
      setError(err.message);
    }
  }

  if (pendingPayment) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>장바구니</h1>
        </div>
        {error && <p className="error">{error}</p>}
        <section className="card">
          <p><strong>주문 #{pendingPayment.orderId} — {formatCurrency(pendingPayment.amount)}</strong></p>
          <div id="payment-method" />
          <div id="agreement" />
          <button disabled={!widgetsReady} onClick={handlePay} className="btn btn-primary">결제하기</button>
          <button onClick={() => setPendingPayment(null)} className="btn btn-ghost">취소</button>
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>장바구니</h1>
      </div>
      {error && <p className="error">{error}</p>}
      {pendingNote && <p className="status-ok">{pendingNote}</p>}

      {items.length === 0 ? (
        <p className="muted">장바구니가 비어 있습니다.</p>
      ) : (
        <ul className="product-grid">
          {items.map((i) => (
            <li key={`${i.productId}::${i.option || ''}`}>
              <div>{i.name}</div>
              {i.option && <div className="muted">옵션: {i.option}</div>}
              <div className="product-price">{formatCurrency(i.price)}</div>
              <label>수량
                <input
                  type="number"
                  min="0"
                  value={i.quantity}
                  onChange={(e) => setQuantity(i.productId, i.option, Number(e.target.value))}
                  style={{ width: '4rem' }}
                />
              </label>
              <button onClick={() => removeItem(i.productId, i.option)}>삭제</button>
            </li>
          ))}
        </ul>
      )}

      <section className="card">
        <p><strong>총액: {formatCurrency(total)}</strong></p>
        <button disabled={items.length === 0} onClick={handleCheckout} className="btn btn-primary">결제하기</button>
      </section>
    </div>
  );
}
