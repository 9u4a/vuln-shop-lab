import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { login } from '../api.js';

export default function Login() {
  const { backend } = useBackend();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await login(backend.base, username, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>Login</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <label>Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit">Log in</button>
      </form>
    </div>
  );
}
