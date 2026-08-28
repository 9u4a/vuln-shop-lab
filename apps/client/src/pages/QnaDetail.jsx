import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { useSession } from '../SessionContext.jsx';
import { useToast } from '../ToastContext.jsx';
import { fetchQuestion, answerQuestion, deleteQuestion } from '../api.js';
import { ADMIN_ROLES } from '../components/navLinks.js';

export default function QnaDetail() {
  const { backend } = useBackend();
  const { user } = useSession();
  const { showToast } = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(null);
  const [error, setError] = useState(null);
  const [answer, setAnswer] = useState('');

  function load() {
    setError(null);
    fetchQuestion(backend.base, id)
      .then((data) => {
        setQuestion(data.question);
        setAnswer(data.question.answer || '');
      })
      .catch((err) => setError(err.message));
  }

  useEffect(load, [backend.base, id]);

  const isAdmin = ADMIN_ROLES.includes(user?.role);
  const owns = question && user && (question.userId === user.id || question.authorUsername === user.username);
  const canView = question && (!question.secret || owns || isAdmin);

  async function handleAnswer(e) {
    e.preventDefault();
    setError(null);
    try {
      await answerQuestion(backend.base, id, answer);
      showToast('답변을 등록했어요');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    setError(null);
    try {
      await deleteQuestion(backend.base, id);
      showToast('문의를 삭제했어요');
      navigate('/qna');
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!question) return <p className="muted">불러오는 중...</p>;

  return (
    <div className="page">
      <p><Link to="/qna" className="muted">&larr; Q&amp;A 목록으로</Link></p>

      <section className="card">
        <div className="qna-detail__head">
          <h1>
            {question.secret && <span title="비밀글" aria-label="비밀글">🔒 </span>}
            {question.title}
          </h1>
          <span className={`chip ${question.answered ? 'chip--done' : 'chip--wait'}`}>
            {question.answer ? '답변완료' : '답변대기'}
          </span>
        </div>
        <p className="muted">
          작성자: {question.authorUsername || '알 수 없음'} · {(question.createdAt || '').slice(0, 10)}
        </p>

        {canView ? (
          <p style={{ whiteSpace: 'pre-wrap' }}>{question.body}</p>
        ) : (
          <p className="muted">🔒 비밀글입니다. 작성자와 관리자만 볼 수 있어요.</p>
        )}

        {(owns || isAdmin) && (
          <div className="review-item__actions">
            <button type="button" onClick={handleDelete}>삭제</button>
          </div>
        )}
      </section>

      {question.answer && canView && (
        <section className="card qna-answer">
          <h2>답변</h2>
          <p className="muted">{question.answeredBy || '관리자'} · {(question.answeredAt || '').slice(0, 10)}</p>
          <p style={{ whiteSpace: 'pre-wrap' }}>{question.answer}</p>
        </section>
      )}

      {isAdmin && (
        <section className="card">
          <h2>{question.answer ? '답변 수정' : '답변 등록'}</h2>
          <form onSubmit={handleAnswer}>
            <label>답변 내용
              <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows="4" required />
            </label>
            <button type="submit" className="btn btn-primary">{question.answer ? '답변 수정' : '답변 등록'}</button>
          </form>
        </section>
      )}
    </div>
  );
}
