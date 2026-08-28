import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { fetchProducts } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';
import { SkeletonGrid } from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';

const CATEGORIES = [
  { key: '', label: '전체' },
  { key: 'accessories', label: '액세서리' },
  { key: 'displays', label: '디스플레이' },
  { key: 'office', label: '오피스' },
];

export default function Products() {
  const { backend } = useBackend();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || '';
  const [products, setProducts] = useState(null);
  const [sortKeys, setSortKeys] = useState(null);

  useEffect(() => {
    setProducts(null);
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

      {q && (
        <p
          className="search-result-label"
          dangerouslySetInnerHTML={{ __html: `'${q}' 검색 결과` }}
        />
      )}

      <div className="toolbar">
        <div className="chip-row">
          {CATEGORIES.map((c) => (
            <button
              key={c.key || 'all'}
              type="button"
              className={category === c.key ? 'chip active' : 'chip'}
              onClick={() => updateParams({ category: c.key })}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="toolbar__sort">
          <select value={sort} onChange={(e) => updateParams({ sort: e.target.value })} aria-label="정렬">
            <option value="">추천순</option>
            <option value="name">이름순</option>
            <option value="price">가격순</option>
          </select>
        </div>
      </div>

      <form
        className="search-row"
        onSubmit={(e) => { e.preventDefault(); updateParams({ q: e.target.q.value }); }}
      >
        <input name="q" defaultValue={q} placeholder="상품 검색..." />
        <button type="submit" className="btn btn-primary btn-sm">검색</button>
      </form>

      {sortKeys && <p className="muted">sortKeys: {JSON.stringify(sortKeys)}</p>}

      {products === null ? (
        <SkeletonGrid count={8} />
      ) : products.length === 0 ? (
        <EmptyState
          emoji="🔍"
          title="검색 결과가 없어요"
          description="다른 키워드나 카테고리로 다시 찾아보세요."
        />
      ) : (
        <ul className="product-grid">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </ul>
      )}
    </div>
  );
}
