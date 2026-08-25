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
    <div>
      <h1>Products</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateParams({ q: e.target.q.value });
        }}
      >
        <input name="q" defaultValue={q} placeholder="Search products..." />
        <button type="submit">Search</button>
      </form>
      <label>Category
        <input
          value={category}
          onChange={(e) => updateParams({ category: e.target.value })}
          placeholder="e.g. accessories"
        />
      </label>
      <label>Sort by
        <select value={sort} onChange={(e) => updateParams({ sort: e.target.value })}>
          <option value="">Default</option>
          <option value="name">Name</option>
          <option value="price">Price</option>
        </select>
      </label>
      <ul className="product-grid">
        {products.map((p, i) => (
          <li key={p.id}>
            <Link to={`/products/${p.id}`}>{p.name}</Link>
            <div>${Number(p.price).toFixed(2)}</div>
            {sortKeys && <div>sortKey: {sortKeys[i]}</div>}
            <button onClick={() => addItem(p)}>Add to cart</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
