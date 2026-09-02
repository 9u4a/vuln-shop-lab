import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBackend } from '../../BackendContext.jsx';
import { fetchMyQuestions } from '../../api.js';

export default function MyPageQna() {
  const { backend } = useBackend();
  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setQuestions(null);
    setError(null);
    fetchMyQuestions(backend.base)
      .then((d) => setQuestions(d.questions))
      .catch((e) => setError(e.message));
  }, [backend.base]);

  return (
    <section className="card">
      <h2>내 Q&amp;A {questions && <span className="muted">({questions.length})</span>}</h2>
      <p className="muted">내가 등록한 문의와 답변 상태를 확인할 수 있습니다.</p>
      {error && <p className="error">{error}</p>}
      {questions === null ? (
        <p className="muted">불러오는 중...</p>
      ) : questions.length === 0 ? (
        <p className="muted">등록한 문의가 없습니다. <Link to="/qna">Q&amp;A 바로가기</Link></p>
      ) : (
        <ul className="post-list">
          {questions.map((q) => (
            <li key={q.id} className="post-list__item">
              <Link to={`/qna/${q.id}`} className="post-list__title">
                {q.secret && <span title="비밀글" aria-label="비밀글"> 🔒 </span>}
                {q.title}
              </Link>
              <span className="qna-meta">
                <span className={`chip ${q.answered ? 'chip--done' : 'chip--wait'}`}>
                  {q.answered ? '답변완료' : '답변대기'}
                </span>
                <span className="post-list__date">{(q.createdAt || '').slice(0, 10)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
