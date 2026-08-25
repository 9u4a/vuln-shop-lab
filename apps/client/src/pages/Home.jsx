import { Link } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';

export default function Home() {
  const { backendKey, backends, selectBackend } = useBackend();

  return (
    <div>
      <h1>Welcome to Vuln Shop</h1>
      <p>A deliberately vulnerable e-commerce demo for security training. Pick which backend to talk to:</p>
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
      <p>Currently targeting: <strong>{backends[backendKey].label}</strong></p>
      <Link to="/products">Browse products</Link>
    </div>
  );
}
