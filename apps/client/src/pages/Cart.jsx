import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadTossPayments, ANONYMOUS } from '@tosspayments/tosspayments-sdk';
import { useCart } from '../CartContext.jsx';
import { useBackend } from '../BackendContext.jsx';
import { useSession } from '../SessionContext.jsx';
import { createOrder, importCartBackup, fetchPoints, previewCoupon, fetchProfile } from '../api.js';
import { formatCurrency } from '../format.js';
import EmptyState from '../components/EmptyState.jsx';
import CouponPickerModal from '../components/CouponPickerModal.jsx';

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY;

export default function Cart() {
  const { items, total, setQuantity, changeOption } = useCart();
  const { backend, backendKey } = useBackend();
  const { user } = useSession();
  const [error, setError] = useState(null);
  const [pendingNote, setPendingNote] = useState(null);
  const [pendingPayment, setPendingPayment] = useState(null);
  const [widgetsReady, setWidgetsReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const widgetsRef = useRef(null);
  const [backupJson, setBackupJson] = useState('');
  const [backupResult, setBackupResult] = useState(null);
  const [pointsBalance, setPointsBalance] = useState(null);
  const [pointsToUse, setPointsToUse] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponPreview, setCouponPreview] = useState(null);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [shipping, setShipping] = useState({ name: '', phone: '', postcode: '', address: '', addressDetail: '' });

  useEffect(() => {
    fetchPoints(backend.base).then((d) => setPointsBalance(d.balance)).catch(() => setPointsBalance(null));
  }, [backend.base]);

  useEffect(() => {
    if (!user) return;
    fetchProfile(backend.base)
      .then((d) => {
        const p = d.profile || {};
        setShipping({
          name: p.name || '',
          phone: p.phone || '',
          postcode: p.postcode || '',
          address: p.address || '',
          addressDetail: p.addressDetail || '',
        });
      })
      .catch(() => {});
  }, [backend.base, user]);

  const usePoints = Number(pointsToUse) || 0;
  const discount = couponPreview?.valid ? couponPreview.discountAmount : 0;
  const payable = Math.max(0, total - discount - usePoints);

  // 쿠폰 선택/해제 — 코드만 바꾸고, 실제 할인 미리보기는 아래 effect가 담당.
  function handleSelectCoupon(code) {
    setCouponCode(code);
    if (!code) setCouponPreview(null);
  }

  // 선택된 쿠폰이나 상품금액이 바뀔 때마다 서버에 할인액을 다시 확인.
  useEffect(() => {
    if (!couponCode) return;
    let cancelled = false;
    previewCoupon(backend.base, couponCode, total)
      .then((res) => { if (!cancelled) setCouponPreview(res); })
      .catch((err) => { if (!cancelled) setCouponPreview({ valid: false, discountAmount: 0, reason: err.message }); });
    return () => { cancelled = true; };
  }, [backend.base, couponCode, total]);

  const setShip = (field) => (e) => setShipping((s) => ({ ...s, [field]: e.target.value }));

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
    if (busy) return;
    setBusy(true);
    setError(null);
    setPendingNote(null);
    try {
      const { orderId, tossOrderId, amount } = await createOrder(backend.base, items, usePoints, {
        couponCode: couponPreview?.valid ? couponCode.trim() : undefined,
        shipping: shipping.address ? shipping : undefined,
      });
      if (!TOSS_CLIENT_KEY) {
        setPendingNote(
          `주문 #${orderId}이(가) 결제 대기 상태로 생성되었습니다. Toss 결제를 계속하려면 VITE_TOSS_CLIENT_KEY를 설정하세요.`
        );
        return;
      }
      setPendingPayment({ orderId, tossOrderId, amount });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePay() {
    if (busy) return;
    setBusy(true);
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
      setBusy(false);
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
            <button disabled={!widgetsReady || busy} onClick={handlePay} className="btn btn-primary">{busy ? '처리 중...' : '결제하기'}</button>
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
                {i.stock != null && i.quantity > i.stock && (
                  <span className="line-item__stock-warn">재고 {i.stock}개 남음 — 수량을 확인해 주세요</span>
                )}
                <div className="line-item__actions">
                  <button onClick={() => setQuantity(i.productId, i.option, i.quantity - 1)}>삭제</button>
                </div>
              </li>
            ))}
          </ul>

          <div className="summary-box">
            {user && (
              <div className="summary-box__row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <span>배송지</span>
                <div className="ship-fields">
                  <div className="ship-fields__row">
                    <input value={shipping.name} onChange={setShip('name')} placeholder="받는 분" />
                    <input value={shipping.phone} onChange={setShip('phone')} placeholder="연락처" />
                  </div>
                  <div className="ship-fields__row">
                    <input className="ship-fields__postcode" value={shipping.postcode} onChange={setShip('postcode')} placeholder="우편번호" />
                    <input value={shipping.address} onChange={setShip('address')} placeholder="주소" />
                  </div>
                  <input value={shipping.addressDetail} onChange={setShip('addressDetail')} placeholder="상세주소" />
                </div>
              </div>
            )}
            <div className="summary-box__row"><span>상품금액</span><span className="tnum">{formatCurrency(total)}</span></div>
            <div className="summary-box__row"><span>배송비</span><span>무료</span></div>

            {user && (
              <div className="summary-box__row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <span>쿠폰</span>
                {couponPreview?.valid ? (
                  <div className="coupon-applied">
                    <small className="status-ok">{couponCode} · -{formatCurrency(couponPreview.discountAmount)}</small>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCouponModalOpen(true)}>변경</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-block"
                    onClick={() => setCouponModalOpen(true)}
                  >
                    {couponCode ? '쿠폰 다시 선택' : '보유 쿠폰에서 선택'}
                  </button>
                )}
                {couponPreview && !couponPreview.valid && (
                  <small className="error">{couponPreview.reason}</small>
                )}
              </div>
            )}
            {discount > 0 && (
              <div className="summary-box__row"><span>쿠폰 할인</span><span className="tnum">-{formatCurrency(discount)}</span></div>
            )}

            {pointsBalance != null && (
              <label className="summary-box__row" style={{ alignItems: 'center' }}>
                <span>포인트 사용 <small className="muted">(보유 {formatCurrency(pointsBalance)}P)</small></span>
                <input
                  type="number"
                  min="0"
                  max={pointsBalance}
                  value={pointsBalance > 0 ? pointsToUse : ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') return setPointsToUse('');
                    const clamped = Math.max(0, Math.min(Math.floor(Number(raw) || 0), pointsBalance));
                    setPointsToUse(String(clamped));
                  }}
                  placeholder="0"
                  disabled={pointsBalance <= 0}
                  title={pointsBalance <= 0 ? '사용 가능한 포인트가 없습니다' : undefined}
                  style={{ width: 110, textAlign: 'right' }}
                />
              </label>
            )}
            <div className="summary-box__row summary-box__row--total"><span>결제 예상금액</span><span className="tnum">{formatCurrency(payable)}</span></div>
            <button disabled={items.length === 0 || busy} onClick={handleCheckout} className="btn btn-primary btn-block btn-lg">
              {busy ? '처리 중...' : '결제하기'}
            </button>
          </div>
        </div>
      )}

      <CouponPickerModal
        open={couponModalOpen}
        base={backend.base}
        itemsTotal={total}
        selectedCode={couponCode}
        onSelect={handleSelectCoupon}
        onClose={() => setCouponModalOpen(false)}
      />

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
