export function Skeleton({ width, height, radius, className = '' }) {
  return (
    <span
      className={`skeleton ${className}`}
      style={{ display: 'block', width, height, borderRadius: radius }}
    />
  );
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <ul className="product-grid">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="skeleton-card">
          <span className="skeleton skeleton--media" />
          <span className="skeleton skeleton--line short" />
          <span className="skeleton skeleton--line" />
        </li>
      ))}
    </ul>
  );
}
