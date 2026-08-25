import { useEffect, useState } from 'react';
import { useBackend } from '../BackendContext.jsx';
import { fetchProfile, updateProfile, uploadAvatar } from '../api.js';

export default function Profile() {
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
      <h1>My Profile</h1>
      {status && <p>{status}</p>}
      {avatarSrc && <img src={avatarSrc} alt="avatar" width="96" height="96" />}
      <p>Username: {profile.username}</p>
      <p>Role: {profile.role}</p>
      <label>Avatar
        <input type="file" accept="image/*" onChange={handleAvatarChange} />
      </label>
      <form onSubmit={handleBioSubmit}>
        <label>Bio
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows="4" />
        </label>
        <button type="submit">Save bio</button>
      </form>
    </div>
  );
}
