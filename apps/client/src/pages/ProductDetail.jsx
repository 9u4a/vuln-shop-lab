import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { useCart } from '../CartContext.jsx';
import { useSession } from '../SessionContext.jsx';
import { useToast } from '../ToastContext.jsx';
import { fetchProduct, fetchReviews, createReview, updateReview, deleteReview } from '../api.js';
import { formatCurrency } from '../format.js';
import { CATEGORY_LABELS } from '../data/categories.js';
import LikeButton from '../components/LikeButton.jsx';
import { ADMIN_ROLES } from '../components/navLinks.js';

function Stars({ value }) {
  const n = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return (
    <span className="stars" aria-label={`${n}점`}>
      {'★'.repeat(n)}<span className="off">{'★'.repeat(5 - n)}</span>
    </span>
  );
}

export default function ProductDetail() {
  const { backend } = useBackend();
  const { addItem } = useCart();
  const { user } = useSession();
  const { showToast } = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [imgBroken, setImgBroken] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [secret, setSecret] = useState(false);
  const [image, setImage] = useState(null);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState('');
  const [editRating, setEditRating] = useState(5);
  const [editSecret, setEditSecret] = useState(false);
  const [editImage, setEditImage] = useState(null);

  const [quantity, setQuantity] = useState(1);
  const [selectedOption, setSelectedOption] = useState('');

  function loadReviews() {
    fetchReviews(backend.base, id).then((data) => setReviews(data.reviews));
  }

  useEffect(() => {
    setProduct(null);
    setImgBroken(false);
    setQuantity(1);
    setSelectedOption('');
    fetchProduct(backend.base, id).then((data) => {
      setProduct(data.product);
      if (data.product.optionValues && data.product.optionValues.length > 0) {
        setSelectedOption(data.product.optionValues[0]);
      }
    });
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend.base, id]);

  async function handleReviewSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await createReview(backend.base, id, { rating: Number(rating), body, secret, image });
      setBody('');
      setSecret(false);
      setImage(null);
      e.target.reset?.();
      loadReviews();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(review) {
    setEditingId(review.id);
    setEditBody(review.body);
    setEditRating(review.rating);
    setEditSecret(!!review.secret);
    setEditImage(null);
  }

  async function handleEditSubmit(e, review) {
    e.preventDefault();
    setError(null);
    try {
      await updateReview(backend.base, id, review.id, { rating: Number(editRating), body: editBody, secret: editSecret, image: editImage });
      setEditingId(null);
      loadReviews();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteReview(review) {
    setError(null);
    try {
      await deleteReview(backend.base, id, review.id);
      loadReviews();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleAddToCart() {
    addItem(product, quantity, selectedOption || null);
    showToast(`${quantity}개를 장바구니에 담았어요`);
  }

  function handleBuyNow() {
    addItem(product, quantity, selectedOption || null);
    navigate('/cart');
  }

  if (!product) return <p className="muted">불러오는 중...</p>;

  const hasOptions = product.optionValues && product.optionValues.length > 0;
  const rawImage = product.imageUrl || product.image_url;
  const imgSrc = rawImage ? `${backend.uploadsBase}/${rawImage}` : null;
  const soldOut = Number(product.stock) === 0;

  return (
    <div className="page">
      <p><Link to="/products" className="muted">&larr; 상품 목록으로</Link></p>

      <div className="two-col">
        <div className="pdp-gallery">
          {imgSrc && !imgBroken ? (
            <img src={imgSrc} alt={product.name} onError={() => setImgBroken(true)} />
          ) : (
            <span className="pdp-gallery__ph">이미지 준비 중</span>
          )}
        </div>

        <div className="buy-box">
          {product.brand && <span className="buy-box__brand">{product.brand}</span>}
          <h1>{product.name}</h1>
          <span className="buy-box__price tnum">{formatCurrency(product.price)}</span>
          {product.description && <p className="buy-box__desc">{product.description}</p>}

          <table className="specs-table">
            <tbody>
              {product.sku && <tr><th>상품코드</th><td>{product.sku}</td></tr>}
              {product.category && <tr><th>카테고리</th><td>{CATEGORY_LABELS[product.category] || product.category}</td></tr>}
              {product.gender && <tr><th>성별</th><td>{product.gender}</td></tr>}
              {product.color && <tr><th>컬러</th><td>{product.color}</td></tr>}
              {product.material && <tr><th>소재</th><td>{product.material}</td></tr>}
              <tr>
                <th>재고</th>
                <td>{product.stock > 0 ? `${product.stock}개 남음` : '품절'}</td>
              </tr>
            </tbody>
          </table>

          {hasOptions && (
            <label>{product.optionName || '옵션'}
              <select value={selectedOption} onChange={(e) => setSelectedOption(e.target.value)}>
                {product.optionValues.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </label>
          )}

          <div>
            <div style={{ fontSize: '0.83rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>수량</div>
            <div className="qty-stepper">
              <button type="button" onClick={() => setQuantity((n) => Math.max(1, n - 1))} aria-label="수량 감소">–</button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              />
              <button type="button" onClick={() => setQuantity((n) => n + 1)} aria-label="수량 증가">+</button>
            </div>
          </div>

          <div className="buy-box__actions">
            <button onClick={handleAddToCart} className="btn btn-ghost btn-lg" disabled={soldOut}>
              {soldOut ? '품절' : '장바구니 담기'}
            </button>
            <button onClick={handleBuyNow} className="btn btn-primary btn-lg" disabled={soldOut}>
              바로 구매
            </button>
          </div>
          <LikeButton product={product} className="buy-box__like" />
        </div>
      </div>

      <section className="card" style={{ marginTop: 'var(--space-10)' }}>
        <h2>리뷰 <span className="muted">({reviews.length})</span></h2>
        {reviews.length === 0 && <p className="muted">아직 리뷰가 없습니다.</p>}
        <ul className="review-list">
          {reviews.map((r) => {
            const owns = user && (r.userId === user.id || r.username === user.username);
            const isAdmin = ADMIN_ROLES.includes(user?.role);
            const canView = !r.secret || owns || isAdmin;
            const imgSrc = r.imageUrl ? `${backend.uploadsBase}/${r.imageUrl}` : null;
            return (
            <li key={r.id} className="review-item">
              {editingId === r.id ? (
                <form onSubmit={(e) => handleEditSubmit(e, r)}>
                  <label>평점
                    <select value={editRating} onChange={(e) => setEditRating(e.target.value)}>
                      {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <label>리뷰 내용
                    <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows="2" required />
                  </label>
                  <label>사진 변경 (선택)
                    <input type="file" accept="image/*" onChange={(e) => setEditImage(e.target.files[0] || null)} />
                  </label>
                  <label className="review-secret-check">
                    <input type="checkbox" checked={editSecret} onChange={(e) => setEditSecret(e.target.checked)} />
                    비밀글
                  </label>
                  <div className="review-item__actions">
                    <button type="submit" className="btn btn-primary btn-sm">저장</button>
                    <button type="button" onClick={() => setEditingId(null)}>취소</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="review-item__head">
                    <span className="review-item__user">
                      {r.username}
                      {r.secret && <span className="review-item__lock" title="비밀글"> 🔒</span>}
                    </span>
                    <Stars value={r.rating} />
                  </div>
                  {canView ? (
                    <>
                      <div className="review-item__body" dangerouslySetInnerHTML={{ __html: r.body }} />
                      {imgSrc && (
                        <a href={imgSrc} target="_blank" rel="noreferrer" className="review-item__photo">
                          <img src={imgSrc} alt="리뷰 사진" loading="lazy" />
                        </a>
                      )}
                    </>
                  ) : (
                    <div className="review-item__body muted">🔒 비밀글입니다. 작성자와 관리자만 볼 수 있어요.</div>
                  )}
                  {user && canView && (
                    <div className="review-item__actions">
                      <button type="button" onClick={() => startEdit(r)}>수정</button>
                      <button type="button" onClick={() => handleDeleteReview(r)}>삭제</button>
                    </div>
                  )}
                </>
              )}
            </li>
            );
          })}
        </ul>

        {user ? (
          <form onSubmit={handleReviewSubmit}>
            {error && <p className="error">{error}</p>}
            <label>평점
              <select value={rating} onChange={(e) => setRating(e.target.value)}>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label>리뷰 내용
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows="3" required />
            </label>
            <label>사진 첨부 (선택)
              <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0] || null)} />
            </label>
            <label className="review-secret-check">
              <input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} />
              비밀글로 작성 (작성자와 관리자만 볼 수 있어요)
            </label>
            <button type="submit" className="btn btn-primary">리뷰 등록</button>
          </form>
        ) : (
          <p className="muted">
            <Link to="/login">로그인</Link> 후 리뷰를 작성할 수 있습니다.
          </p>
        )}
      </section>
    </div>
  );
}
