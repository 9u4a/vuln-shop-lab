export default function EmptyState({ emoji = '🗂️', title, description, action }) {
  return (
    <div className="empty-state">
      <span className="empty-state__emoji">{emoji}</span>
      {title && <h2>{title}</h2>}
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
