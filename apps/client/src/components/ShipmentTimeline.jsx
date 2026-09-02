import StatusChip from './StatusChip.jsx';

function formatWhen(value) {
  if (!value) return '';
  return String(value).replace('T', ' ').slice(0, 16);
}

export default function ShipmentTimeline({ shipment }) {
  if (!shipment) {
    return <p className="muted">아직 배송이 시작되지 않았습니다.</p>;
  }

  const events = Array.isArray(shipment.events) ? shipment.events : [];

  return (
    <div className="track">
      <div className="track__head">
        <StatusChip status={shipment.status} />
        <span className="track__carrier">
          {shipment.carrier} · 송장번호 <strong>{shipment.trackingNo}</strong>
        </span>
      </div>
      {events.length === 0 ? (
        <p className="muted">등록된 배송 추적 내역이 없습니다.</p>
      ) : (
        <ol className="track__list">
          {events.map((e, idx) => (
            <li key={idx} className={`track__item${idx === events.length - 1 ? ' track__item--current' : ''}`}>
              <span className="track__dot" aria-hidden="true" />
              <div className="track__body">
                <div className="track__row">
                  <StatusChip status={e.status} />
                  <span className="track__when">{formatWhen(e.occurredAt)}</span>
                </div>
                <div className="track__desc">{e.description}</div>
                {e.location && <div className="track__loc muted">{e.location}</div>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
