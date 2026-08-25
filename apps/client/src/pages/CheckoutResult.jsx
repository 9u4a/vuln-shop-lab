import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { confirmOrder } from '../api.js';
import { useCart } from '../CartContext.jsx';

export default function CheckoutResult({ success }) {
  const [searchParams] = useSearchParams();
  const { backend } = useBackend();
  const { clear } = useCart();
  const [status, setStatus] = useState(success ? 'confirming' : 'failed');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!success) return;
    const orderId = searchParams.get('orderId');
    const paymentKey = searchParams.get('paymentKey');
    const amount = searchParams.get('amount');
    if (!orderId || !paymentKey || !amount) {
      setStatus('error');
      setError('Missing payment confirmation parameters.');
      return;
    }
    confirmOrder(backend.base, orderId, paymentKey, Number(amount))
      .then(() => {
        setStatus('done');
        clear();
      })
      .catch((err) => {
        setStatus('error');
        setError(err.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success]);

  if (status === 'confirming') return <p>Confirming payment...</p>;
  if (status === 'failed') {
    return (
      <div>
        <h1>Payment failed</h1>
        <Link to="/cart">Back to cart</Link>
      </div>
    );
  }
  if (status === 'error') return <p className="error">{error}</p>;
  return (
    <div>
      <h1>Payment complete</h1>
      <Link to="/orders">View my orders</Link>
    </div>
  );
}
