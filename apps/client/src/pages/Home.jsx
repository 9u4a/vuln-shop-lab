import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { useSession } from '../SessionContext.jsx';
import { fetchProducts } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';
import { SkeletonGrid } from '../components/Skeleton.jsx';

const CATEGORIES = [
  { key: 'accessories', emoji: '⌨️', name: '액세서리', desc: '키보드 · 마우스 · 충전기' },
  { key: 'displays', emoji: '🖥️', name: '디스플레이', desc: '모니터 · 포터블 스크린' },
  { key: 'office', emoji: '💡', name: '오피스', desc: '조명 · 데스크 소품' },
];

export default function Home() {
  const { backend, backends, backendKey } = useBackend();
  const { user } = useSession();
  const [products, setProducts] = useState(null);

  useEffect(() => {
    let active = true;
    setProducts(null);
    fetchProducts(backend.base, {})
      .then((data) => { if (active) setProducts(data.products.slice(0, 8)); })
      .catch(() => { if (active) setProducts([]); });
    return () => { active = false; };
  }, [backend.base]);

  return (
    <div className="page">
      <section className="hero">
        <h1>매일 쓰는 물건일수록, 신중하게</h1>
        <p>
          {user ? `${user.username}님, 다시 오셨네요. ` : ''}
          좋은 것만 골라 담는 데스크 셋업 편집샵. 키보드부터 조명까지 큐레이션했습니다.
        </p>
        <Link to="/products" className="btn btn-primary btn-lg">상품 둘러보기</Link>
        <p className="hero__meta">현재 백엔드 대상 · {backends[backendKey].label}</p>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>카테고리</h2>
          <Link to="/products">전체 보기</Link>
        </div>
        <div className="category-tiles">
          {CATEGORIES.map((c) => (
            <Link key={c.key} to={`/products?category=${c.key}`} className="category-tile">
              <span className="category-tile__emoji">{c.emoji}</span>
              <span className="category-tile__name">{c.name}</span>
              <span className="category-tile__desc">{c.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>추천 상품</h2>
          <Link to="/products">더 보기</Link>
        </div>
        {products === null ? (
          <SkeletonGrid count={8} />
        ) : products.length === 0 ? (
          <p className="muted">표시할 상품이 없습니다.</p>
        ) : (
          <ul className="product-grid">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </ul>
        )}
      </section>
    </div>
  );
}
