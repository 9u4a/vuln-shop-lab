import { Link } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';

export default function Home() {
  const { backendKey, backends, selectBackend } = useBackend();

  return (
    <div className="page">
      <div className="page-header">
        <h1>Vuln Shop에 오신 것을 환영합니다</h1>
        <p className="muted">보안 학습을 위한 의도적으로 취약한 이커머스 데모입니다.</p>
      </div>
      <section className="card">
        <h2>백엔드 선택</h2>
        <div className="backend-cards">
          {Object.entries(backends).map(([key, b]) => (
            <button
              key={key}
              className={key === backendKey ? 'active' : ''}
              onClick={() => selectBackend(key)}
            >
              {b.label}
            </button>
          ))}
        </div>
        <p className="muted">현재 대상: <strong>{backends[backendKey].label}</strong></p>
        <Link to="/products" className="btn btn-primary">상품 둘러보기</Link>
      </section>
    </div>
  );
}
