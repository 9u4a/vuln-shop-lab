import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { useCart } from '../CartContext.jsx';
import { useSession } from '../SessionContext.jsx';
import { fetchProduct, fetchReviews, createReview } from '../api.js';
import { formatCurrency } from '../format.js';

export default function ProductDetail() {
  const { backend } = useBackend();
  const { addItem } = useCart();
  const { user } = useSession();
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [error, setError] = useState(null);

  const [quantity, setQuantity] = useState(1);
  const [selectedOption, setSelectedOption] = useState('');
  const [addedNote, setAddedNote] = useState(null);

  function loadReviews() {
    fetchReviews(backend.base, id).then((data) => setReviews(data.reviews));
  }

  useEffect(() => {
    setProduct(null);
    setQuantity(1);
    setSelectedOption('');
    setAddedNote(null);
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
      await createReview(backend.base, id, Number(rating), body);
      setBody('');
      loadReviews();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleAddToCart() {
    addItem(product, quantity, selectedOption || null);
    setAddedNote(`${quantity}개를 장바구니에 담았습니다.`);
  }

  if (!product) return <p>불러오는 중...</p>;

  const hasOptions = product.optionValues && product.optionValues.length > 0;

  return (
    <div className="page">
      <Link to="/products" className="muted">&larr; 상품 목록으로</Link>
      <div className="page-header">
        <h1>{product.name}</h1>
      </div>

      <section className="card">
        {product.imageUrl && (
          <img
            className="product-detail-image"
            src={`${backend.uploadsBase}/${product.imageUrl}`}
            alt={product.name}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
        <p>{product.description}</p>
        <p className="product-price">{formatCurrency(product.price)}</p>

        <table className="specs-table">
          <tbody>
            {product.brand && <tr><th>브랜드</th><td>{product.brand}</td></tr>}
            {product.sku && <tr><th>상품코드</th><td>{product.sku}</td></tr>}
            {product.category && <tr><th>카테고리</th><td>{product.category}</td></tr>}
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

        <label>수량
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            style={{ width: '5rem' }}
          />
        </label>

        {addedNote && <p className="status-ok">{addedNote}</p>}
        <button onClick={handleAddToCart} className="btn btn-primary">장바구니 담기</button>
      </section>

      <section className="card">
        <h2>리뷰</h2>
        {reviews.length === 0 && <p className="muted">아직 리뷰가 없습니다.</p>}
        <ul>
          {reviews.map((r) => (
            <li key={r.id}>
              <strong>{r.username}</strong> ({r.rating}/5): {r.body}
            </li>
          ))}
        </ul>

        {user ? (
          <form onSubmit={handleReviewSubmit}>
            {error && <p className="error">{error}</p>}
            <label>평점
              <select value={rating} onChange={(e) => setRating(e.target.value)}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <label>리뷰 내용
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows="3" required />
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
