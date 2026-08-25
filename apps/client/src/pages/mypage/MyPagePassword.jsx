import { useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { verifyPassword, changePassword } from '../../api.js';

export default function MyPagePassword() {
  const { backend } = useBackend();
  const [unlocked, setUnlocked] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [verifyError, setVerifyError] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeError, setChangeError] = useState(null);
  const [status, setStatus] = useState(null);

  async function handleVerify(e) {
    e.preventDefault();
    setVerifyError(null);
    setVerifying(true);
    try {
      await verifyPassword(backend.base, currentPassword);
      setUnlocked(true);
    } catch (err) {
      setVerifyError(err.message);
    } finally {
      setVerifying(false);
    }
  }

  async function handleChange(e) {
    e.preventDefault();
    setChangeError(null);
    setStatus(null);
    if (newPassword !== confirmPassword) {
      setChangeError('New passwords do not match.');
      return;
    }
    try {
      await changePassword(backend.base, currentPassword, newPassword);
      setStatus('Password changed successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setChangeError(err.message);
    }
  }

  if (!unlocked) {
    return (
      <section className="card">
        <h2>Verify your identity</h2>
        <p className="muted">For your security, please re-enter your current password to continue.</p>
        {verifyError && <p className="error">{verifyError}</p>}
        <form onSubmit={handleVerify}>
          <label>Current password
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={verifying}>
            {verifying ? 'Verifying...' : 'Continue'}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Change password</h2>
      {status && <p className="status-ok">{status}</p>}
      {changeError && <p className="error">{changeError}</p>}
      <form onSubmit={handleChange}>
        <label>New password
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </label>
        <label>Confirm new password
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="btn btn-primary">Update password</button>
      </form>
    </section>
  );
}
