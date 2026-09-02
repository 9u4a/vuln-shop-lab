import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { fetchPoints, fetchReferral, applyReferral, redeemGiftCard } from '../../api.js';
import { formatCurrency } from '../../format.js';

export default function MyPageRewards() {
  const { backend } = useBackend();
  const [points, setPoints] = useState(null);
  const [referral, setReferral] = useState(null);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  const [giftCode, setGiftCode] = useState('');
  const [giftMsg, setGiftMsg] = useState(null);

  function load() {
    setError(null);
    fetchPoints(backend.base).then(setPoints).catch((e) => setError(e.message));
    fetchReferral(backend.base).then(setReferral).catch(() => setReferral(null));
  }

  useEffect(load, [backend.base]);

  async function handleApply(e) {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await applyReferral(backend.base, code);
      setCode('');
      setMsg(`${formatCurrency(res.reward)}P가 적립되었습니다.`);
      load();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function handleRedeem(e) {
    e.preventDefault();
    setGiftMsg(null);
    try {
      const res = await redeemGiftCard(backend.base, giftCode);
      setGiftCode('');
      setGiftMsg(`상품권 잔액 ${formatCurrency(res.credited)}P가 적립금으로 등록되었습니다.`);
      load();
    } catch (err) {
      setGiftMsg(err.message);
    }
  }

  return (
    <>
      <section className="card">
        <h2>포인트 <span className="muted">{points && `(${formatCurrency(points.balance)}P 보유)`}</span></h2>
        {error && <p className="error">{error}</p>}
        {points && points.transactions.length > 0 ? (
          <div className="admin-table__wrap">
            <table className="admin-table">
              <thead>
                <tr><th>내역</th><th className="tnum">포인트</th><th>일시</th></tr>
              </thead>
              <tbody>
                {points.transactions.map((t) => (
                  <tr key={t.id}>
                    <td>{t.reason || '-'}</td>
                    <td className="tnum">{t.amount > 0 ? `+${formatCurrency(t.amount)}` : formatCurrency(t.amount)}</td>
                    <td>{(t.createdAt || '').slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">적립 내역이 없습니다.</p>
        )}
      </section>

      <section className="card">
        <h2>상품권 등록</h2>
        <p className="muted">보유하신 상품권 코드를 등록하면 잔액이 적립금으로 전환됩니다. (예: GIFT-DEMO-10000)</p>
        <form onSubmit={handleRedeem}>
          <label>상품권 코드
            <input value={giftCode} onChange={(e) => setGiftCode(e.target.value)} placeholder="상품권 코드 입력" />
          </label>
          <button type="submit" className="btn btn-primary">등록</button>
        </form>
        {giftMsg && <p className="status-ok">{giftMsg}</p>}
      </section>

      <section className="card">
        <h2>추천인</h2>
        {referral && (
          <>
            <p>내 추천 코드: <strong>{referral.referralCode}</strong> <span className="muted">· 추천 {referral.referredCount}명</span></p>
            <form onSubmit={handleApply}>
              <label>추천 코드 적용 (적용 시 {formatCurrency(referral.reward)}P 적립)
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="예: REFUSER1" />
              </label>
              <button type="submit" className="btn btn-primary">코드 적용</button>
            </form>
            {msg && <p className="status-ok">{msg}</p>}
          </>
        )}
      </section>
    </>
  );
}
