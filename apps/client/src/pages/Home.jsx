import { Link } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';

export default function Home() {
  const { backendKey, backends, selectBackend } = useBackend();

  return (
    <div className="page">
      <div className="page-header">
        <h1>Welcome to Vuln Shop</h1>
        <p className="muted">A deliberately vulnerable e-commerce demo for security training.</p>
      </div>
      <section className="card">
        <h2>Pick a backend</h2>
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
        <p className="muted">Currently targeting: <strong>{backends[backendKey].label}</strong></p>
        <Link to="/products" className="btn btn-primary">Browse products</Link>
      </section>
    </div>
  );
}
