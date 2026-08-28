import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { useSession } from '../SessionContext.jsx';
import { useToast } from '../ToastContext.jsx';
import { toggleLike } from '../api.js';

// 상품 찜(좋아요) 토글 버튼. product.liked / product.likeCount 초기값을 사용한다.
export default function LikeButton({ product, className = '' }) {
  const { backend } = useBackend();
  const { user } = useSession();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(!!product.liked);
  const [count, setCount] = useState(product.likeCount || 0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLiked(!!product.liked);
    setCount(product.likeCount || 0);
  }, [product.id, product.liked, product.likeCount]);

  async function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      showToast('로그인 후 찜할 수 있어요');
      navigate('/login');
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const res = await toggleLike(backend.base, product.id);
      setLiked(res.liked);
      setCount(res.likeCount);
    } catch (err) {
      showToast(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`like-btn${liked ? ' liked' : ''} ${className}`.trim()}
      onClick={handleClick}
      aria-pressed={liked}
      aria-label={liked ? '찜 해제' : '찜하기'}
      title={liked ? '찜 해제' : '찜하기'}
    >
      <span className="like-btn__heart" aria-hidden="true">{liked ? '♥' : '♡'}</span>
      {count > 0 && <span className="like-btn__count">{count}</span>}
    </button>
  );
}
