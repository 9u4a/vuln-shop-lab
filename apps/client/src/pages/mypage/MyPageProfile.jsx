import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { fetchProfile, updateProfile, uploadAvatar } from '../../api.js';

export default function MyPageProfile() {
  const { backend } = useBackend();
  const [profile, setProfile] = useState(null);
  const [bio, setBio] = useState('');
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

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

  if (error) return <p className="error">{error}</p>;
  if (!profile) return <p>Loading...</p>;

  const avatarSrc = profile.avatarUrl ? `${backend.uploadsBase}/${profile.avatarUrl}` : null;

  return (
    <div>
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
    </div>
  );
}
