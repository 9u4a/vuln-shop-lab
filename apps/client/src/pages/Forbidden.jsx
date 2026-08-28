import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const REDIRECT_SECONDS = 3;

export default function Forbidden() {
  const [seconds, setSeconds] = useState(REDIRECT_SECONDS);
  const navigate = useNavigate();

  useEffect(() => {
    if (seconds <= 0) {
      navigate('/', { replace: true });
      return;
    }
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds, navigate]);

  return (
    <div className="page">
      <div className="empty-state">
        <span className="empty-state__emoji">🔒</span>
        <h2>접근 권한이 없어요 (403)</h2>
        <p>이 페이지를 볼 수 있는 권한이 없습니다.</p>
        <p className="muted">{seconds}초 후 홈으로 이동합니다...</p>
      </div>
    </div>
  );
}
