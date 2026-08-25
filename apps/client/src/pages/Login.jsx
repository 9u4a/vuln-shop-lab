import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { useSession } from '../SessionContext.jsx';
import { useToast } from '../ToastContext.jsx';
import { login } from '../api.js';

export default function Login() {
  const { backend } = useBackend();
  const { setUser } = useSession();
  const { showToast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const data = await login(backend.base, username, password);
      setUser(data.user);
      showToast(`${data.user.username}님 접속하였습니다.`);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Log in</h1>
      </div>
      <section className="card">
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <label>Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </label>
          <label>Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button type="submit" className="btn btn-primary">Log in</button>
        </form>
        <p className="muted">No account yet? <Link to="/signup">Sign up</Link></p>
      </section>
    </div>
  );
}
