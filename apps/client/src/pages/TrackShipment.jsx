import { useState } from 'react';
import { useBackend } from '../BackendContext.jsx';
import { trackShipment } from '../api.js';
import StatusChip from '../components/StatusChip.jsx';

export default function TrackShipment() {
  const { backend } = useBackend();
  const [no, setNo] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!no.trim()) return;
    try {
      setResult(await trackShipment(backend.base, no.trim()));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>배송 조회</h1>
        <p className="muted">송장번호를 입력하면 배송 상태를 확인할 수 있습니다. (비회원 조회 가능)</p>
      </div>

      <form className="search-row" onSubmit={handleSubmit}>
        <input value={no} onChange={(e) => setNo(e.target.value)} placeholder="송장번호" />
        <button type="submit" className="btn btn-primary btn-sm">조회</button>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <section className="card">
          <p><StatusChip status={result.status} /> {result.carrier} · 송장번호 {result.trackingNo}</p>
          <table className="specs-table">
            <tbody>
              <tr><th>받는 분</th><td>{result.shipName}</td></tr>
              <tr><th>연락처</th><td>{result.shipPhone}</td></tr>
              <tr><th>주소</th><td>({result.shipPostcode}) {result.shipAddress} {result.shipAddressDetail || ''}</td></tr>
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
