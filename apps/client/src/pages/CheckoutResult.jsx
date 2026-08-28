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
    return <div className="page"><div className="empty-state"><span className="empty-state__emoji">⏳</span><p>결제 확인 중...</p></div></div>;
  }
  if (status === 'failed') {
    return (
      <div className="page">
        <div className="empty-state">
          <span className="empty-state__emoji">❌</span>
          <h2>결제에 실패했습니다</h2>
          <p>다시 시도해주세요.</p>
          <Link to="/cart" className="btn btn-ghost">장바구니로</Link>
        </div>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="page">
        <div className="empty-state">
          <span className="empty-state__emoji">⚠️</span>
          <h2>결제 확인 오류</h2>
          <p className="error">{error}</p>
          <Link to="/cart" className="btn btn-ghost">장바구니로</Link>
        </div>
      </div>
    );
  }
  return (
    <div className="page">
      <div className="empty-state">
        <span className="empty-state__emoji">✅</span>
        <h2>결제가 완료되었습니다</h2>
        <p>주문해주셔서 감사합니다.</p>
        <Link to="/orders" className="btn btn-primary">주문 내역 보기</Link>
      </div>
    </div>
  );
}
