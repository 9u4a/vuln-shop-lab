import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { fetchNotice } from '../api.js';
import SafeImage from '../components/SafeImage.jsx';

export default function NoticeDetail() {
  const { backend } = useBackend();
  const { id } = useParams();
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setNotice(null);
    setError(null);
    fetchNotice(backend.base, id).then((d) => setNotice(d.notice)).catch((e) => setError(e.message));
  }, [backend.base, id]);

  return (
    <div className="page">
      <p><Link to="/notices" className="muted">&larr; 공지사항 목록</Link></p>
      {error && <p className="error">{error}</p>}
      {!notice && !error && <p className="muted">불러오는 중...</p>}
      {notice && (
        <article className="card">
          <h1>{notice.title}</h1>
          <p className="muted">{(notice.createdAt || '').slice(0, 10)}</p>
          {notice.imageUrl && (
            <SafeImage className="notice-image" src={`${backend.uploadsBase}/${notice.imageUrl}`} alt={notice.title} />
          )}
          <p style={{ whiteSpace: 'pre-wrap', marginTop: 'var(--space-4)' }}>{notice.body}</p>
        </article>
      )}
    </div>
  );
}
