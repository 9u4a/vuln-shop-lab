import { useState } from 'react';
import { DUMMY_ADDRESSES } from '../data/dummyAddresses.js';

export default function AddressSearchModal({ onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const results = query.trim()
    ? DUMMY_ADDRESSES.filter((a) => a.address.includes(query.trim()))
    : DUMMY_ADDRESSES;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>주소 찾기</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">&times;</button>
        </div>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="도로명, 지역으로 검색..."
        />
        <ul className="address-results">
          {results.length === 0 && <li className="muted">검색 결과가 없습니다.</li>}
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
