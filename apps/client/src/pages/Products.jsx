import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { useCart } from '../CartContext.jsx';
import { fetchProducts } from '../api.js';

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
        <h1>Products</h1>
      </div>

      <section className="card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateParams({ q: e.target.q.value });
          }}
          style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', maxWidth: 'none' }}
        >
          <label style={{ flex: '1 1 200px' }}>Search
            <input name="q" defaultValue={q} placeholder="Search products..." />
          </label>
          <label style={{ flex: '1 1 160px' }}>Category
            <input
              value={category}
              onChange={(e) => updateParams({ category: e.target.value })}
              placeholder="e.g. accessories"
            />
          </label>
          <label style={{ flex: '1 1 140px' }}>Sort by
            <select value={sort} onChange={(e) => updateParams({ sort: e.target.value })}>
              <option value="">Default</option>
              <option value="name">Name</option>
              <option value="price">Price</option>
            </select>
          </label>
          <button type="submit" className="btn btn-primary">Apply</button>
        </form>
      </section>

      <ul className="product-grid">
        {products.map((p, i) => (
          <li key={p.id}>
            <Link to={`/products/${p.id}`}>{p.name}</Link>
            <div className="product-price">${Number(p.price).toFixed(2)}</div>
            {sortKeys && <div className="muted">sortKey: {sortKeys[i]}</div>}
            <button onClick={() => addItem(p)}>Add to cart</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
