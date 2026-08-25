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
      setError('결제 확인에 필요한 정보가 누락되었습니다.');
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
        <p className="muted">결제 확인 중...</p>
      </div>
    );
  }
  if (status === 'failed') {
    return (
      <div className="page">
        <div className="page-header"><h1>결제 실패</h1></div>
        <Link to="/cart" className="btn btn-ghost">장바구니로</Link>
      </div>
    );
  }
  if (status === 'error') return <div className="page"><p className="error">{error}</p></div>;
  return (
    <div className="page">
      <div className="page-header"><h1>결제 완료</h1></div>
      <Link to="/orders" className="btn btn-primary">주문 내역 보기</Link>
    </div>
  );
}
