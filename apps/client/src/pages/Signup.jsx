import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { signup } from '../api.js';

export default function Signup() {
  const { backend } = useBackend();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await signup(backend.base, username, password);
      navigate('/login');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Sign up</h1>
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
          <button type="submit" className="btn btn-primary">Create account</button>
        </form>
        <p className="muted">Already have an account? <Link to="/login">Log in</Link></p>
      </section>
    </div>
  );
}
