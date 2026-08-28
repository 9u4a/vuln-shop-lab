import { useState } from 'react';
import { useBackend } from '../BackendContext.jsx';
import { searchAddresses } from '../api.js';

export default function AddressSearchModal({ onSelect, onClose }) {
  const { backend } = useBackend();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const data = await searchAddresses(backend.base, q);
      setResults(data.addresses);
      setTotal(data.total);
      setSearched(true);
    } catch (err) {
      setError(err.message);
      setResults([]);
      setTotal(0);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>주소 찾기</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">&times;</button>
        </div>
        <form className="search-row" onSubmit={handleSearch}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="도로명, 지역으로 검색..."
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
            {loading ? '검색 중...' : '검색'}
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        {searched && !error && (
          <p className="muted" style={{ fontSize: '0.82rem' }}>검색 결과 {total}건</p>
        )}

        <ul className="address-results">
          {!searched && <li className="muted">검색어를 입력하고 검색하세요.</li>}
          {searched && !loading && results.length === 0 && !error && (
            <li className="muted">검색 결과가 없습니다.</li>
          )}
          {results.map((a) => (
            <li key={a.zonecode}>
              <button type="button" onClick={() => onSelect(a)}>
                <span className="address-zonecode">{a.zonecode}</span>
                <span>{a.address}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
