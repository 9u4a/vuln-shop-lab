import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { fetchEvents } from '../api.js';

const MAX_POPUPS = 3;
const hideKey = (id) => `vulnshop_event_hide_${id}`;
const today = () => new Date().toISOString().slice(0, 10);

function isHiddenToday(id) {
  try {
    return localStorage.getItem(hideKey(id)) === today();
  } catch {
    return false;
  }
}

export default function EventPopups() {
  const { backend } = useBackend();
  const [events, setEvents] = useState([]);
  const [closed, setClosed] = useState(() => new Set());

  useEffect(() => {
    let active = true;
    fetchEvents(backend.base)
      .then((data) => { if (active) setEvents(data.events || []); })
      .catch(() => { if (active) setEvents([]); });
    return () => { active = false; };
  }, [backend.base]);

  function close(id) {
    setClosed((prev) => new Set(prev).add(id));
  }

  function hideForToday(id) {
    try {
      localStorage.setItem(hideKey(id), today());
    } catch {
      /* private mode — fall back to session close */
    }
    close(id);
  }

  const visible = events
    .filter((e) => !closed.has(e.id) && !isHiddenToday(e.id))
    .slice(0, MAX_POPUPS);

  if (visible.length === 0) return null;

  return (
    <div className="event-popups" role="dialog" aria-label="이벤트 안내">
      {visible.map((event) => (
        <div key={event.id} className="event-popup">
          {event.imageUrl && (
            <img className="event-popup__image" src={event.imageUrl} alt="" />
          )}
          <div className="event-popup__body">
            <h3 className="event-popup__title">{event.title}</h3>
            {event.body && (
              <div
                className="event-popup__content"
                dangerouslySetInnerHTML={{ __html: event.body }}
              />
            )}
            {event.linkUrl && (
              event.linkUrl.startsWith('/') ? (
                <Link to={event.linkUrl} className="btn btn-primary btn-sm" onClick={() => close(event.id)}>
                  자세히 보기
                </Link>
              ) : (
                <a href={event.linkUrl} className="btn btn-primary btn-sm" target="_blank" rel="noreferrer">
                  자세히 보기
                </a>
              )
            )}
          </div>
          <div className="event-popup__foot">
            <button type="button" className="event-popup__dismiss" onClick={() => hideForToday(event.id)}>
              오늘 하루 보지 않기
            </button>
            <button type="button" className="event-popup__close" onClick={() => close(event.id)}>
              닫기
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
