import { useEffect, useState } from 'react';
import { useBackend } from '../BackendContext.jsx';
import { useSession } from '../SessionContext.jsx';
import { fetchRecentlyViewed } from '../api.js';
import ProductCard from './ProductCard.jsx';

export default function RecentlyViewedStrip({ excludeId }) {
  const { backend } = useBackend();
  const { user } = useSession();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (!user) {
      setProducts([]);
      return;
    }
    fetchRecentlyViewed(backend.base)
      .then((d) => setProducts(d.products || []))
      .catch(() => setProducts([]));
  }, [backend.base, user, excludeId]);

  const list = products.filter((p) => p.id !== excludeId).slice(0, 8);
  if (!user || list.length === 0) return null;

  return (
    <section className="card">
      <h2>최근 본 상품</h2>
      <ul className="product-grid">
        {list.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </ul>
    </section>
  );
}
