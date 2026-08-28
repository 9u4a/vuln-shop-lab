import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBackend } from '../../BackendContext.jsx';
import { fetchWishlist } from '../../api.js';
import ProductCard from '../../components/ProductCard.jsx';
import { SkeletonGrid } from '../../components/Skeleton.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function MyPageLikes() {
  const { backend } = useBackend();
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setProducts(null);
    setError(null);
    fetchWishlist(backend.base)
      .then((d) => setProducts(d.products))
      .catch((e) => setError(e.message));
  }, [backend.base]);

  return (
    <section className="card">
      <h2>찜한 상품 {products && <span className="muted">({products.length})</span>}</h2>
      {error && <p className="error">{error}</p>}
      {products === null ? (
        <SkeletonGrid count={4} />
      ) : products.length === 0 ? (
        <EmptyState
          emoji="🤍"
          title="찜한 상품이 없어요"
          description="마음에 드는 상품에 하트를 눌러 모아보세요."
          action={<Link to="/products" className="btn btn-primary">상품 둘러보기</Link>}
        />
      ) : (
        <ul className="product-grid">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </ul>
      )}
    </section>
  );
}
