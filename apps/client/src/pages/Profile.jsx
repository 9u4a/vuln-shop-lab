import { useEffect, useState } from 'react';
import { useBackend } from '../BackendContext.jsx';
import { fetchProfile, updateProfile, uploadAvatar, changePassword } from '../api.js';

export default function Profile() {
  const { backend } = useBackend();
  const [profile, setProfile] = useState(null);
  const [bio, setBio] = useState('');
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState(null);
  const [passwordStatus, setPasswordStatus] = useState(null);

  useEffect(() => {
    setProfile(null);
    setError(null);
    fetchProfile(backend.base)
      .then((data) => {
        setProfile(data.profile);
        setBio(data.profile.bio || '');
      })
      .catch((err) => setError(err.message));
  }, [backend.base]);

  async function handleBioSubmit(e) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    try {
      const data = await updateProfile(backend.base, bio);
      setProfile(data.profile);
      setStatus('Bio updated.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError(null);
    setStatus(null);
    try {
      const data = await uploadAvatar(backend.base, file);
      setProfile((p) => ({ ...p, avatarUrl: data.avatarUrl }));
      setStatus('Avatar updated.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordStatus(null);
    try {
      await changePassword(backend.base, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setPasswordStatus('Password changed.');
    } catch (err) {
      setPasswordError(err.message);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!profile) return <p>Loading...</p>;

  const avatarSrc = profile.avatarUrl ? `${backend.uploadsBase}/${profile.avatarUrl}` : null;

  return (
    <div className="page">
      <div className="page-header">
        <h1>My Page</h1>
        <p className="muted">Manage your account, profile info, and password.</p>
      </div>

      <section className="card">
        <h2>Account</h2>
        <div className="profile-summary">
          {avatarSrc ? (
            <img className="avatar" src={avatarSrc} alt="avatar" width="72" height="72" />
          ) : (
            <div className="avatar avatar-placeholder">{profile.username[0]?.toUpperCase()}</div>
          )}
          <div>
            <p className="profile-username">{profile.username}</p>
            <span className="badge">{profile.role}</span>
          </div>
        </div>
        <label className="file-label">Change avatar
          <input type="file" accept="image/*" onChange={handleAvatarChange} />
        </label>
      </section>

      <section className="card">
        <h2>Profile info</h2>
        {status && <p className="status-ok">{status}</p>}
        <form onSubmit={handleBioSubmit}>
          <label>Bio
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows="4" placeholder="Tell other shoppers about yourself..." />
          </label>
          <button type="submit" className="btn btn-primary">Save changes</button>
        </form>
      </section>

      <section className="card">
        <h2>Change password</h2>
        {passwordStatus && <p className="status-ok">{passwordStatus}</p>}
        {passwordError && <p className="error">{passwordError}</p>}
        <form onSubmit={handlePasswordSubmit}>
          <label>Current password
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <label>New password
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
          <button type="submit" className="btn btn-primary">Update password</button>
        </form>
      </section>
    </div>
  );
}
