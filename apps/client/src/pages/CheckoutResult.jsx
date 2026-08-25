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

  if (status === 'confirming') {
    return (
      <div className="page">
        <p className="muted">Confirming payment...</p>
      </div>
    );
  }
  if (status === 'failed') {
    return (
      <div className="page">
        <div className="page-header"><h1>Payment failed</h1></div>
        <Link to="/cart" className="btn btn-ghost">Back to cart</Link>
      </div>
    );
  }
  if (status === 'error') return <div className="page"><p className="error">{error}</p></div>;
  return (
    <div className="page">
      <div className="page-header"><h1>Payment complete</h1></div>
      <Link to="/orders" className="btn btn-primary">View my orders</Link>
    </div>
  );
}
