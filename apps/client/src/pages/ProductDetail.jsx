import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { useCart } from '../CartContext.jsx';
import { fetchProduct, fetchReviews, createReview, fetchSession } from '../api.js';

export default function ProductDetail() {
  const { backend } = useBackend();
  const { addItem } = useCart();
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [user, setUser] = useState(null);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [error, setError] = useState(null);

  function loadReviews() {
    fetchReviews(backend.base, id).then((data) => setReviews(data.reviews));
  }

  useEffect(() => {
    setProduct(null);
    fetchProduct(backend.base, id).then((data) => setProduct(data.product));
    loadReviews();
    fetchSession(backend.base)
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
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

  if (!product) return <p>Loading...</p>;

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p>Price: ${Number(product.price).toFixed(2)}</p>
      <button onClick={() => addItem(product)}>Add to cart</button>
      <Link to="/products">Back to products</Link>

      <h2>Reviews</h2>
      {reviews.length === 0 && <p>No reviews yet.</p>}
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
          <label>Rating
            <select value={rating} onChange={(e) => setRating(e.target.value)}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>Review
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows="3" required />
          </label>
          <button type="submit">Submit review</button>
        </form>
      ) : (
        <p>
          <Link to="/login">Log in</Link> to write a review.
        </p>
      )}
    </div>
  );
}
