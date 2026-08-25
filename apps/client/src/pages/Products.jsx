import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { useCart } from '../CartContext.jsx';
import { fetchProducts } from '../api.js';
import { formatCurrency } from '../format.js';

export default function Products() {
  const { backend } = useBackend();
  const { addItem } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || '';
  const [products, setProducts] = useState([]);
  const [sortKeys, setSortKeys] = useState(null);

  useEffect(() => {
    fetchProducts(backend.base, { q, category, sort }).then((data) => {
      setProducts(data.products);
      setSortKeys(data.sortKeys || null);
    });
  }, [backend.base, q, category, sort]);

  function updateParams(next) {
    const params = { q, category, sort, ...next };
    const cleaned = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
    setSearchParams(cleaned);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>상품</h1>
      </div>

      <section className="card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateParams({ q: e.target.q.value });
          }}
          style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', maxWidth: 'none' }}
        >
          <label style={{ flex: '1 1 200px' }}>검색
            <input name="q" defaultValue={q} placeholder="상품 검색..." />
          </label>
          <label style={{ flex: '1 1 160px' }}>카테고리
            <input
              value={category}
              onChange={(e) => updateParams({ category: e.target.value })}
              placeholder="예: accessories"
            />
          </label>
          <label style={{ flex: '1 1 140px' }}>정렬
            <select value={sort} onChange={(e) => updateParams({ sort: e.target.value })}>
              <option value="">기본</option>
              <option value="name">이름순</option>
              <option value="price">가격순</option>
            </select>
          </label>
          <button type="submit" className="btn btn-primary">적용</button>
        </form>
      </section>

      <ul className="product-grid">
        {products.map((p, i) => (
          <li key={p.id}>
            {p.imageUrl && (
              <img
                className="product-thumb"
                src={`${backend.uploadsBase}/${p.imageUrl}`}
                alt={p.name}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <Link to={`/products/${p.id}`}>{p.name}</Link>
            <div className="product-price">{formatCurrency(p.price)}</div>
            {sortKeys && <div className="muted">sortKey: {sortKeys[i]}</div>}
            <button onClick={() => addItem(p)}>장바구니 담기</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
