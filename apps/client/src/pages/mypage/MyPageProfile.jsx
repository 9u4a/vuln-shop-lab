import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { fetchProfile, updateProfile, uploadAvatar, fetchActivity } from '../../api.js';

export default function MyPageProfile() {
  const { backend, backendKey } = useBackend();
  const [profile, setProfile] = useState(null);
  const [bio, setBio] = useState('');
  const [contact, setContact] = useState({ name: '', phone: '', postcode: '', address: '' });
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    setProfile(null);
    setError(null);
    fetchProfile(backend.base)
      .then((data) => {
        setProfile(data.profile);
        setBio(data.profile.bio || '');
        setContact({
          name: data.profile.name || '',
          phone: data.profile.phone || '',
          postcode: data.profile.postcode || '',
          address: data.profile.address || '',
        });
      })
      .catch((err) => setError(err.message));
  }, [backend.base]);

  useEffect(() => {
    if (backendKey !== 'node') {
      setActivity([]);
      return;
    }
    fetchActivity(backend.base)
      .then((data) => setActivity(data.activity || []))
      .catch(() => setActivity([]));
  }, [backend.base, backendKey]);

  async function handleBioSubmit(e) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    try {
      const data = await updateProfile(backend.base, { bio });
      setProfile(data.profile);
      setStatus('자기소개가 업데이트되었습니다.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleContactSubmit(e) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    try {
      const data = await updateProfile(backend.base, contact);
      setProfile(data.profile);
      setStatus('배송 정보가 업데이트되었습니다.');
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
      setStatus('아바타가 업데이트되었습니다.');
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!profile) return <p>불러오는 중...</p>;

  const avatarSrc = profile.avatarUrl ? `${backend.uploadsBase}/${profile.avatarUrl}` : null;

  return (
    <div>
      <section className="card">
        <h2>계정</h2>
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
        <label className="file-label">아바타 변경
          <input type="file" accept="image/*" onChange={handleAvatarChange} />
        </label>
      </section>

      <section className="card">
        <h2>배송 정보</h2>
        <form onSubmit={handleContactSubmit}>
          <label>이름
            <input value={contact.name} onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} />
          </label>
          <label>전화번호
            <input value={contact.phone} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} />
          </label>
          <label>우편번호
            <input value={contact.postcode} onChange={(e) => setContact((c) => ({ ...c, postcode: e.target.value }))} />
          </label>
          <label>주소
            <input value={contact.address} onChange={(e) => setContact((c) => ({ ...c, address: e.target.value }))} />
          </label>
          <button type="submit" className="btn btn-primary">배송 정보 저장</button>
        </form>
      </section>

      {backendKey === 'node' && activity.length > 0 && (
        <section className="card">
          <h2>최근 활동</h2>
          <ul>
            {activity.map((a, i) => (
              <li key={i}>
                <span className="muted">{a.at}</span> · {a.action} — {a.detail}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>프로필 정보</h2>
        {status && <p className="status-ok">{status}</p>}
        <form onSubmit={handleBioSubmit}>
          <label>자기소개
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows="4" placeholder="다른 쇼핑객에게 자신을 소개해보세요..." />
          </label>
          <button type="submit" className="btn btn-primary">변경사항 저장</button>
        </form>
      </section>
    </div>
  );
}
