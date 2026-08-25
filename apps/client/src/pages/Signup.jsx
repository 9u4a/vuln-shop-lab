import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { signup } from '../api.js';
import AddressSearchModal from '../components/AddressSearchModal.jsx';

const emptyForm = {
  username: '',
  password: '',
  name: '',
  phone: '',
  postcode: '',
  address: '',
  addressDetail: '',
};

export default function Signup() {
  const { backend } = useBackend();
  const [form, setForm] = useState(emptyForm);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleAddressSelect(addr) {
    setForm((f) => ({ ...f, postcode: addr.zonecode, address: addr.address }));
    setShowAddressModal(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await signup(backend.base, form);
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
            <input value={form.username} onChange={update('username')} required />
          </label>
          <label>Password
            <input type="password" value={form.password} onChange={update('password')} required />
          </label>
          <label>Name
            <input value={form.name} onChange={update('name')} required />
          </label>
          <label>Phone
            <input value={form.phone} onChange={update('phone')} placeholder="010-1234-5678" required />
          </label>
          <label>Postcode
            <div className="address-row">
              <input value={form.postcode} readOnly placeholder="Search to fill" required />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAddressModal(true)}>
                Search address
              </button>
            </div>
          </label>
          <label>Address
            <input value={form.address} readOnly placeholder="Search to fill" required />
          </label>
          <label>Address detail
            <input value={form.addressDetail} onChange={update('addressDetail')} placeholder="Unit, floor, etc. (optional)" />
          </label>
          <button type="submit" className="btn btn-primary">Create account</button>
        </form>
        <p className="muted">Already have an account? <Link to="/login">Log in</Link></p>
      </section>
      {showAddressModal && (
        <AddressSearchModal onSelect={handleAddressSelect} onClose={() => setShowAddressModal(false)} />
      )}
    </div>
  );
}
