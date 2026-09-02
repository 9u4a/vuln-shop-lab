import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import {
  fetchPoints, fetchReferral, applyReferral, redeemGiftCard, giftPoints,
  fetchGiftCardProducts, purchaseGiftCard, fetchMyGiftCards,
} from '../../api.js';
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
  const [giftTo, setGiftTo] = useState('');
  const [giftAmount, setGiftAmount] = useState('');
  const [sendMsg, setSendMsg] = useState(null);
  const [products, setProducts] = useState([]);
  const [myCards, setMyCards] = useState([]);
  const [buyMsg, setBuyMsg] = useState(null);

  function load() {
    setError(null);
    fetchPoints(backend.base).then(setPoints).catch((e) => setError(e.message));
    fetchReferral(backend.base).then(setReferral).catch(() => setReferral(null));
    fetchGiftCardProducts(backend.base).then((d) => setProducts(d.products || [])).catch(() => setProducts([]));
    fetchMyGiftCards(backend.base).then((d) => setMyCards(d.giftCards || [])).catch(() => setMyCards([]));
  }

  async function handleBuy(product) {
    setBuyMsg(null);
    try {
      const res = await purchaseGiftCard(backend.base, product.id);
      setBuyMsg(`${product.name} 상품권을 구매했습니다. 코드: ${res.giftCard.code}`);
      load();
    } catch (err) {
      setBuyMsg(err.message);
    }
  }

  async function handleRedeemCard(cardCode) {
    setGiftMsg(null);
    try {
      const res = await redeemGiftCard(backend.base, cardCode);
      setGiftMsg(`상품권 잔액 ${formatCurrency(res.credited)}P가 적립금으로 등록되었습니다.`);
      load();
    } catch (err) {
      setGiftMsg(err.message);
    }
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

  async function handleGift(e) {
    e.preventDefault();
    setSendMsg(null);
    try {
      const res = await giftPoints(backend.base, giftTo.trim(), Number(giftAmount));
      setGiftTo('');
      setGiftAmount('');
      setSendMsg(`${res.to}님에게 ${formatCurrency(res.sent)}P를 선물했습니다.`);
      load();
    } catch (err) {
      setSendMsg(err.message);
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
        <h2>포인트 선물하기</h2>
        <p className="muted">받는 분의 아이디 또는 이메일로 보유 포인트를 선물할 수 있습니다.</p>
        <form onSubmit={handleGift} className="gift-form">
          <label>받는 분
            <input value={giftTo} onChange={(e) => setGiftTo(e.target.value)} placeholder="아이디 또는 이메일" />
          </label>
          <label>선물할 포인트
            <input type="number" min="1" value={giftAmount} onChange={(e) => setGiftAmount(e.target.value)} placeholder="0" />
          </label>
          <button type="submit" className="btn btn-primary" disabled={!giftTo.trim() || !(Number(giftAmount) > 0)}>선물 보내기</button>
        </form>
        {sendMsg && <p className="status-ok">{sendMsg}</p>}
      </section>

      <section className="card">
        <h2>상품권 구매</h2>
        <p className="muted">액면가를 선택해 상품권을 구매하면 코드가 발급됩니다.</p>
        {products.length === 0 ? (
          <p className="muted">구매 가능한 상품권이 없습니다.</p>
        ) : (
          <div className="giftcard-buy">
            {products.map((p) => (
              <div key={p.id} className="giftcard-buy__item">
                <div>
                  <div className="giftcard-buy__name">{p.name}</div>
                  <div className="muted tnum">{formatCurrency(p.amount)}원</div>
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => handleBuy(p)}>구매</button>
              </div>
            ))}
          </div>
        )}
        {buyMsg && <p className="status-ok">{buyMsg}</p>}
      </section>

      {myCards.length > 0 && (
        <section className="card">
          <h2>내 상품권</h2>
          <div className="admin-table__wrap">
            <table className="admin-table">
              <thead>
                <tr><th>코드</th><th className="tnum">잔액</th><th></th></tr>
              </thead>
              <tbody>
                {myCards.map((c) => (
                  <tr key={c.id}>
                    <td className="giftcard-code">{c.code}</td>
                    <td className="tnum">{formatCurrency(c.balance)}원</td>
                    <td><button type="button" className="btn btn-ghost btn-sm" onClick={() => handleRedeemCard(c.code)}>등록</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

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
