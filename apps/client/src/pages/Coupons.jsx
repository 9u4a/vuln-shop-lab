import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { useSession } from '../SessionContext.jsx';
import { useToast } from '../ToastContext.jsx';
import { fetchCoupons, fetchMyCoupons, claimCoupon } from '../api.js';
import { formatCurrency } from '../format.js';
import EmptyState from '../components/EmptyState.jsx';

function discountLabel(c) {
  return c.discountType === 'percent' ? `${c.discountValue}% 할인` : `${formatCurrency(c.discountValue)} 할인`;
}

function CouponCard({ coupon, action }) {
  return (
    <li className="coupon-card">
      <div className="coupon-card__left">
        <span className="coupon-card__discount">{discountLabel(coupon)}</span>
        <span className="coupon-card__code">{coupon.code}</span>
      </div>
      <div className="coupon-card__body">
        <h3 className="coupon-card__title">{coupon.title}</h3>
        {coupon.description && <p className="coupon-card__desc">{coupon.description}</p>}
        <p className="coupon-card__meta">
          {coupon.minOrderAmount > 0 ? `${formatCurrency(coupon.minOrderAmount)} 이상 구매 시` : '최소 주문금액 없음'}
          {coupon.expiresAt ? ` · ~${coupon.expiresAt.slice(0, 10)}` : ' · 상시'}
        </p>
      </div>
      {action && <div className="coupon-card__action">{action}</div>}
    </li>
  );
}

export default function Coupons() {
  const { backend } = useBackend();
  const { user } = useSession();
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState(null);
  const [mine, setMine] = useState([]);
  const [busy, setBusy] = useState(null);

  function load() {
    fetchCoupons(backend.base).then((d) => setCoupons(d.coupons)).catch(() => setCoupons([]));
    if (user) {
      fetchMyCoupons(backend.base).then((d) => setMine(d.coupons)).catch(() => setMine([]));
    } else {
      setMine([]);
    }
  }

  useEffect(load, [backend.base, user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleClaim(coupon) {
    if (!user) {
      showToast('로그인 후 쿠폰을 받을 수 있어요');
      return;
    }
    setBusy(coupon.id);
    try {
      await claimCoupon(backend.base, coupon.id);
      showToast(`'${coupon.title}' 쿠폰을 받았어요`);
      load();
    } catch (err) {
      showToast(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>쿠폰</h1>
        <p className="muted">받을 수 있는 쿠폰을 확인하고 내 쿠폰함에 담아보세요.</p>
      </div>

      <section className="section">
        <div className="section__head"><h2>내 쿠폰함 {user && <span className="muted">({mine.length})</span>}</h2></div>
        {!user ? (
          <p className="muted"><Link to="/login">로그인</Link> 후 받은 쿠폰을 확인할 수 있어요.</p>
        ) : mine.length === 0 ? (
          <p className="muted">아직 받은 쿠폰이 없어요.</p>
        ) : (
          <ul className="coupon-list">
            {mine.map((c) => (
              <CouponCard
                key={c.userCouponId}
                coupon={c}
                action={<span className={c.used ? 'badge' : 'badge badge-ok'}>{c.used ? '사용완료' : '사용가능'}</span>}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="section">
        <div className="section__head"><h2>받을 수 있는 쿠폰</h2></div>
        {coupons === null ? (
          <p className="muted">불러오는 중...</p>
        ) : coupons.length === 0 ? (
          <EmptyState emoji="🎫" title="발급 가능한 쿠폰이 없어요" description="새로운 혜택을 준비 중입니다." />
        ) : (
          <ul className="coupon-list">
            {coupons.map((c) => (
              <CouponCard
                key={c.id}
                coupon={c}
                action={
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={busy === c.id || c.claimed}
                    onClick={() => handleClaim(c)}
                  >
                    {c.claimed ? '받음' : '받기'}
                  </button>
                }
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
