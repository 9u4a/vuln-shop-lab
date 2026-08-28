import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadTossPayments, ANONYMOUS } from '@tosspayments/tosspayments-sdk';
import { useCart } from '../CartContext.jsx';
import { useBackend } from '../BackendContext.jsx';
import { createOrder, importCartBackup } from '../api.js';
import { formatCurrency } from '../format.js';
import EmptyState from '../components/EmptyState.jsx';

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY;

export default function Cart() {
  const { items, total, setQuantity, changeOption, removeItem } = useCart();
  const { backend, backendKey } = useBackend();
  const [error, setError] = useState(null);
  const [pendingNote, setPendingNote] = useState(null);
  const [pendingPayment, setPendingPayment] = useState(null);
  const [widgetsReady, setWidgetsReady] = useState(false);
  const widgetsRef = useRef(null);
  const [backupJson, setBackupJson] = useState('');
  const [backupResult, setBackupResult] = useState(null);

  async function handleImportBackup(e) {
    e.preventDefault();
    setError(null);
    try {
      const res = await importCartBackup(backend.base, backupJson);
      setBackupResult(`백업에서 ${res.itemCount}개 항목을 가져왔습니다.`);
    } catch (err) {
      setError(err.message);
    }
  }

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
          <h1>결제</h1>
        </div>
        {error && <p className="error">{error}</p>}
        <section className="card">
          <p><strong>주문 #{pendingPayment.orderId} · {formatCurrency(pendingPayment.amount)}</strong></p>
          <div id="payment-method" />
          <div id="agreement" />
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button disabled={!widgetsReady} onClick={handlePay} className="btn btn-primary">결제하기</button>
            <button onClick={() => setPendingPayment(null)} className="btn btn-ghost">취소</button>
          </div>
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
        <EmptyState
          emoji="🛒"
          title="장바구니가 비어 있어요"
          description="마음에 드는 상품을 담아보세요."
          action={<Link to="/products" className="btn btn-primary">상품 둘러보기</Link>}
        />
      ) : (
        <div className="two-col two-col--cart">
          <ul className="line-list">
            {items.map((i) => (
              <li key={`${i.productId}::${i.option || ''}`} className="line-item">
                <div className="line-item__main">
                  <span className="line-item__name">{i.name}</span>
                  {i.optionValues && i.optionValues.length > 0 ? (
                    <label className="line-item__option">
                      {i.optionName || '옵션'}
                      <select
                        value={i.option || ''}
                        onChange={(e) => changeOption(i.productId, i.option, e.target.value)}
                      >
                        {i.optionValues.map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    i.option && <span className="line-item__meta">옵션: {i.option}</span>
                  )}
                  <span className="line-item__meta tnum">{formatCurrency(i.price)}</span>
                </div>
                <div className="qty-stepper">
                  <button
                    type="button"
                    onClick={() => setQuantity(i.productId, i.option, i.quantity - 1)}
                    aria-label="수량 감소"
                  >–</button>
                  <input
                    type="number"
                    min="0"
                    value={i.quantity}
                    onChange={(e) => setQuantity(i.productId, i.option, Number(e.target.value))}
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(i.productId, i.option, i.quantity + 1)}
                    aria-label="수량 증가"
                  >+</button>
                </div>
                <span className="line-item__price tnum">{formatCurrency(i.price * i.quantity)}</span>
                <div className="line-item__actions">
                  <button onClick={() => removeItem(i.productId, i.option)}>삭제</button>
                </div>
              </li>
            ))}
          </ul>

          <div className="summary-box">
            <div className="summary-box__row"><span>상품금액</span><span className="tnum">{formatCurrency(total)}</span></div>
            <div className="summary-box__row"><span>배송비</span><span>무료</span></div>
            <div className="summary-box__row summary-box__row--total"><span>결제 예상금액</span><span className="tnum">{formatCurrency(total)}</span></div>
            <button disabled={items.length === 0} onClick={handleCheckout} className="btn btn-primary btn-block btn-lg">
              결제하기
            </button>
          </div>
        </div>
      )}

      {backendKey === 'java' && (
        <section className="card" style={{ marginTop: 'var(--space-10)' }}>
          <h2>장바구니 백업 가져오기</h2>
          <form onSubmit={handleImportBackup}>
            <label>백업 JSON
              <textarea value={backupJson} onChange={(e) => setBackupJson(e.target.value)} rows="3" />
            </label>
            <button type="submit" className="btn btn-primary">가져오기</button>
          </form>
          {backupResult && <p className="status-ok">{backupResult}</p>}
        </section>
      )}
    </div>
  );
}
