import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { fetchEvent } from '../api.js';
import SafeImage from '../components/SafeImage.jsx';

function isExternal(url) {
  return /^https?:\/\//i.test(url || '');
}

export default function EventDetail() {
  const { backend } = useBackend();
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setEvent(null);
    setError(null);
    fetchEvent(backend.base, id).then((d) => setEvent(d.event)).catch((e) => setError(e.message));
  }, [backend.base, id]);

  const img = event?.imageUrl ? `${backend.uploadsBase}/${event.imageUrl}` : null;
  const cta = event?.linkUrl
    ? (isExternal(event.linkUrl)
        ? <a href={event.linkUrl} target="_blank" rel="noreferrer" className="btn btn-primary">자세히 보기</a>
        : <Link to={event.linkUrl} className="btn btn-primary">자세히 보기</Link>)
    : null;

  return (
    <div className="page">
      <p><Link to="/events" className="muted">&larr; 이벤트 목록</Link></p>
      {error && <p className="error">{error}</p>}
      {!event && !error && <p className="muted">불러오는 중...</p>}
      {event && (
        <article className="card">
          <h1>{event.title}</h1>
          {img && <SafeImage className="notice-image" src={img} alt={event.title} />}
          {event.body && (
            <div
              className="event-detail__body"
              style={{ marginTop: 'var(--space-4)' }}
              dangerouslySetInnerHTML={{ __html: event.body }}
            />
          )}
          {cta && <div style={{ marginTop: 'var(--space-5)' }}>{cta}</div>}
        </article>
      )}
    </div>
  );
}
