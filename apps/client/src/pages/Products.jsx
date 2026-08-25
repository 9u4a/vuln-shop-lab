import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { fetchProducts } from '../api.js';

export default function Products() {
  const { backend } = useBackend();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchProducts(backend.base, q).then((data) => setProducts(data.products));
  }, [backend.base, q]);

  return (
    <div>
      <h1>Products</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const value = e.target.q.value;
          setSearchParams(value ? { q: value } : {});
        }}
      >
        <input name="q" defaultValue={q} placeholder="Search products..." />
        <button type="submit">Search</button>
      </form>
      <ul className="product-grid">
        {products.map((p) => (
          <li key={p.id}>
            <Link to={`/products/${p.id}`}>{p.name}</Link>
            <div>${Number(p.price).toFixed(2)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
