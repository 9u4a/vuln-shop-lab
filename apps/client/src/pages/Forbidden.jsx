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
      <div className="page-header">
        <h1>403 - Access denied</h1>
      </div>
      <section className="card">
        <p>이 페이지에 접근할 권한이 없습니다.</p>
        <p className="muted">{seconds}초 후 홈으로 이동합니다...</p>
      </section>
    </div>
  );
}
