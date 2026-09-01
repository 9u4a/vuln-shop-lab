import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { fetchMyCoupons } from '../api.js';
import { formatCurrency } from '../format.js';

function discountLabel(c) {
  return c.discountType === 'percent' ? `${c.discountValue}% 할인` : `${formatCurrency(c.discountValue)} 할인`;
}

// 보유 쿠폰(미사용)을 목록으로 띄워 결제 시 적용할 쿠폰을 고르게 하는 모달.
export default function CouponPickerModal({ open, base, itemsTotal, selectedCode, onSelect, onClose }) {
  const [coupons, setCoupons] = useState(null);

  useEffect(() => {
    if (!open) return;
    setCoupons(null);
    fetchMyCoupons(base)
      .then((d) => setCoupons((d.coupons || []).filter((c) => !c.used)))
      .catch(() => setCoupons([]));
  }, [open, base]);

  function pick(code) {
    onSelect(code);
    onClose();
  }

  return (
    <Modal open={open} title="쿠폰 선택" onClose={onClose}>
      {coupons === null ? (
        <p className="muted">불러오는 중...</p>
      ) : coupons.length === 0 ? (
        <p className="muted">사용 가능한 쿠폰이 없어요.</p>
      ) : (
        <ul className="coupon-pick-list">
          {coupons.map((c) => {
            const belowMin = c.minOrderAmount > 0 && itemsTotal < c.minOrderAmount;
            const active = c.code === selectedCode;
            return (
              <li key={c.userCouponId}>
                <button
                  type="button"
                  className={`coupon-pick${active ? ' coupon-pick--active' : ''}`}
                  disabled={belowMin}
                  onClick={() => pick(c.code)}
                >
                  <span className="coupon-pick__discount">{discountLabel(c)}</span>
                  <span className="coupon-pick__title">{c.title}</span>
                  <span className="coupon-pick__meta">
                    {c.minOrderAmount > 0 ? `${formatCurrency(c.minOrderAmount)} 이상 구매 시` : '최소 주문금액 없음'}
                    {c.expiresAt ? ` · ~${c.expiresAt.slice(0, 10)}` : ' · 상시'}
                    {belowMin ? ' · 주문금액 미달' : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {selectedCode && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 'var(--space-3)' }}
          onClick={() => pick('')}
        >
          쿠폰 적용 안 함
        </button>
      )}
    </Modal>
  );
}
