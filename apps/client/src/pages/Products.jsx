import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { fetchProducts } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';
import { SkeletonGrid } from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { CATEGORIES, CATEGORY_LABELS, GENDERS, COLORS, MATERIALS, SORTS } from '../data/categories.js';

const CATEGORY_CHIPS = [{ slug: '', label: '전체' }, ...CATEGORIES];

export default function Products() {
  const { backend } = useBackend();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || '';
  const gender = searchParams.get('gender') || '';
  const color = searchParams.get('color') || '';
  const material = searchParams.get('material') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const inStock = searchParams.get('inStock') || '';
  const [products, setProducts] = useState(null);
  const [sortKeys, setSortKeys] = useState(null);

  useEffect(() => {
    setProducts(null);
    fetchProducts(backend.base, { q, category, sort, gender, color, material, minPrice, maxPrice, inStock }).then((data) => {
      setProducts(data.products);
      setSortKeys(data.sortKeys || null);
    });
  }, [backend.base, q, category, sort, gender, color, material, minPrice, maxPrice, inStock]);

  function updateParams(next) {
    const params = { q, category, sort, gender, color, material, minPrice, maxPrice, inStock, ...next };
    const cleaned = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
    setSearchParams(cleaned);
  }

  const hasFilters = gender || color || material || minPrice || maxPrice || inStock;
  const heading = category ? CATEGORY_LABELS[category] || '상품' : '상품';

  return (
    <div className="page">
      <div className="page-header">
        <h1>{heading}</h1>
      </div>

      {q && (
        <p
          className="search-result-label"
          dangerouslySetInnerHTML={{ __html: `'${q}' 검색 결과` }}
        />
      )}

      <div className="toolbar">
        <div className="chip-row">
          {CATEGORY_CHIPS.map((c) => (
            <button
              key={c.slug || 'all'}
              type="button"
              className={category === c.slug ? 'chip active' : 'chip'}
              onClick={() => updateParams({ category: c.slug })}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="toolbar__sort">
          <select value={sort} onChange={(e) => updateParams({ sort: e.target.value })} aria-label="정렬">
            {SORTS.map((s) => (
              <option key={s.value || 'default'} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="filter-bar">
        <select value={gender} onChange={(e) => updateParams({ gender: e.target.value })} aria-label="성별">
          <option value="">성별 전체</option>
          {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={color} onChange={(e) => updateParams({ color: e.target.value })} aria-label="컬러">
          <option value="">컬러 전체</option>
          {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={material} onChange={(e) => updateParams({ material: e.target.value })} aria-label="소재">
          <option value="">소재 전체</option>
          {MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="filter-bar__price">
          <input
            type="number"
            min="0"
            placeholder="최소가격"
            value={minPrice}
            onChange={(e) => updateParams({ minPrice: e.target.value })}
            aria-label="최소 가격"
          />
          <span>~</span>
          <input
            type="number"
            min="0"
            placeholder="최대가격"
            value={maxPrice}
            onChange={(e) => updateParams({ maxPrice: e.target.value })}
            aria-label="최대 가격"
          />
        </div>
        <label className="filter-bar__check">
          <input
            type="checkbox"
            checked={inStock === '1'}
            onChange={(e) => updateParams({ inStock: e.target.checked ? '1' : '' })}
          />
          품절 제외
        </label>
        {hasFilters && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setSearchParams(Object.fromEntries(Object.entries({ q, category, sort }).filter(([, v]) => v)))}
          >
            필터 초기화
          </button>
        )}
      </div>

      <form
        className="search-row"
        onSubmit={(e) => { e.preventDefault(); updateParams({ q: e.target.q.value }); }}
      >
        <input name="q" defaultValue={q} placeholder="상품 검색..." />
        <button type="submit" className="btn btn-primary btn-sm">검색</button>
      </form>

      {sortKeys && <p className="muted">sortKeys: {JSON.stringify(sortKeys)}</p>}

      {products !== null && (
        <p className="muted" style={{ marginBottom: 'var(--space-3)' }}>{products.length}개 상품</p>
      )}

      {products === null ? (
        <SkeletonGrid count={8} />
      ) : products.length === 0 ? (
        <EmptyState
          emoji="🔍"
          title="검색 결과가 없어요"
          description="다른 키워드나 필터로 다시 찾아보세요."
        />
      ) : (
        <ul className="product-grid">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </ul>
      )}
    </div>
  );
}
