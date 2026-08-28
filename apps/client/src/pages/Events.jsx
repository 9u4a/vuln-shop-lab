import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { fetchEvents } from '../api.js';
import { SkeletonGrid } from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import SafeImage from '../components/SafeImage.jsx';

export default function Events() {
  const { backend } = useBackend();
  const [events, setEvents] = useState(null);

  useEffect(() => {
    setEvents(null);
    fetchEvents(backend.base).then((d) => setEvents(d.events)).catch(() => setEvents([]));
  }, [backend.base]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>이벤트</h1>
        <p className="muted">진행 중인 이벤트를 확인하세요.</p>
      </div>

      {events === null ? (
        <SkeletonGrid count={4} />
      ) : events.length === 0 ? (
        <EmptyState emoji="🎉" title="진행 중인 이벤트가 없어요" description="새로운 이벤트가 곧 찾아옵니다." />
      ) : (
        <ul className="event-cards">
          {events.map((e) => {
            const img = e.imageUrl ? `${backend.uploadsBase}/${e.imageUrl}` : null;
            return (
              <li key={e.id} className="event-card card">
                <Link to={`/events/${e.id}`} className="event-card__link">
                  {img ? (
                    <SafeImage className="event-card__img" src={img} alt={e.title} loading="lazy" placeholderClassName="event-card__ph" placeholderText="🎁" />
                  ) : (
                    <span className="event-card__ph">🎁</span>
                  )}
                  <h2 className="event-card__title">{e.title}</h2>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
