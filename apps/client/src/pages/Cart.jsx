import { useState } from 'react';
import { loadTossPayments } from '@tosspayments/payment-sdk';
import { useCart } from '../CartContext.jsx';
import { useBackend } from '../BackendContext.jsx';
import { createOrder } from '../api.js';

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY;

export default function Cart() {
  const { items, total, setQuantity, removeItem } = useCart();
  const { backend } = useBackend();
  const [error, setError] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [pendingNote, setPendingNote] = useState(null);

  async function handleCheckout() {
    setError(null);
    setPendingNote(null);
    try {
      const { orderId, tossOrderId, amount } = await createOrder(backend.base, items, webhookUrl);
      if (!TOSS_CLIENT_KEY) {
        setPendingNote(
          `Order #${orderId} created as pending. Set VITE_TOSS_CLIENT_KEY to continue to Toss checkout.`
        );
        return;
      }
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      await tossPayments.requestPayment('카드', {
        amount,
        orderId: tossOrderId,
        orderName: `Vuln Shop order #${orderId}`,
        successUrl: `${window.location.origin}/checkout/success?orderId=${orderId}`,
        failUrl: `${window.location.origin}/checkout/fail?orderId=${orderId}`,
      });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Cart</h1>
      </div>
      {error && <p className="error">{error}</p>}
      {pendingNote && <p className="status-ok">{pendingNote}</p>}

      {items.length === 0 ? (
        <p className="muted">Cart is empty.</p>
      ) : (
        <ul className="product-grid">
          {items.map((i) => (
            <li key={i.productId}>
              <div>{i.name}</div>
              <div className="product-price">${i.price.toFixed(2)}</div>
              <label>Quantity
                <input
                  type="number"
                  min="0"
                  value={i.quantity}
                  onChange={(e) => setQuantity(i.productId, Number(e.target.value))}
                  style={{ width: '4rem' }}
                />
              </label>
              <button onClick={() => removeItem(i.productId)}>Remove</button>
            </li>
          ))}
        </ul>
      )}

      <section className="card">
        <p><strong>Total: ${total.toFixed(2)}</strong></p>
        <label>Order webhook URL (optional)
          <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://..." />
        </label>
        <button disabled={items.length === 0} onClick={handleCheckout} className="btn btn-primary">Checkout</button>
      </section>
    </div>
  );
}
