# Q&A 게시판 · FAQ 관리자 게시판화 · 상품 버튼 한 줄 배치

Branch: `feature/qna-faq-board` (base: `main`)

사용자 요청 3건:
1. 상품의 **좋아요 / 장바구니 담기 / 바로 구매**를 그 순서로 같은 줄에 배치.
2. **자주 묻는 질문(FAQ)**을 관리자가 관리하는 게시판 형식으로(일반 사용자는 열람만).
3. **Q&A 기능/페이지**를 별도로 구성(사용자 문의 → 관리자 답변).

## 1. 상품 액션 버튼 한 줄 배치

- `components/ProductCard.jsx`: 이미지 위 오버레이 하트를 제거하고, 카드 하단에 `.product-card__actions`
  한 줄로 **좋아요(LikeButton) · 장바구니 담기 · 바로 구매**를 배치. 카드에 `바로 구매`(장바구니 담고
  `/cart` 이동) 추가.
- `pages/ProductDetail.jsx`: `.buy-box__actions`를 **좋아요 · 장바구니 담기 · 바로 구매** 한 줄로 통합
  (기존엔 하트가 액션 아래 별도 줄).
- `index.css`: `.product-card__actions`, `.buy-box__actions`에 flex 정렬 + 좋아요 버튼을 테두리 있는
  고정폭 아이콘 버튼으로 조정.

## 2. FAQ 관리자 게시판화

FAQ는 원래 아무 로그인 사용자나 질문+답변을 함께 등록할 수 있어(게시판이 아닌) 어정쩡한 형태였다.
관리자만 작성/수정/삭제하고 사용자는 열람만 하는 **안내 게시판**으로 정리.

- node `routes/faqs.js`: `POST /api/faqs`를 `requireAuth` → `requireAdmin`으로 변경.
- java `controller/FaqController.java`: `create`를 `requireAdmin`으로 변경(미사용 `requireAuth` 제거).
- client `pages/Faq.jsx`: 사용자 "질문하기" 폼 제거, **Q/A 아코디언** 열람 UI(`.faq-list`/`.faq-item`)로
  재작성. 답이 없으면 Q&A로 문의하도록 안내 링크. 관리자 작성은 기존 `pages/admin/AdminFaq.jsx` 유지.

## 3. Q&A 게시판 (신규)

사용자가 제목/내용/비밀글 여부로 문의를 등록하고, 관리자가 답변을 다는 1:1 문의 게시판.

**데이터 — `questions`** (양 스택): `id, user_id, username, title, body, secret, answer, answered_by,
answered_at, created_at`.
- node: `db.js` `CREATE TABLE` + 시드 3건(답변완료 1 · 미답변 1 · 비밀글 1).
- java: `entity/Question.java`(신규 NOT NULL `secret`엔 `@ColumnDefault("false")`), `QuestionRepository`,
  `DataSeeder.seedQuestions()`.

**엔드포인트** (양 스택, node `routes/qna.js` / java `QnaController`):

| 메서드 | 경로 | 권한 | 설명 |
|--------|------|------|------|
| GET | `/api/qna` | 공개 | 목록(**제목만** + 답변여부/비밀여부/작성자/날짜), 제목 검색·페이지네이션 |
| GET | `/api/qna/:id` | 공개 | 상세(본문/답변) — 비밀글도 본문 반환(**VULN-030**) |
| POST | `/api/qna` | 인증 | 문의 작성(title/body/secret) |
| PUT | `/api/qna/:id/answer` | 관리자 | 답변 등록/수정 |
| DELETE | `/api/qna/:id` | 작성자·관리자 | 삭제 |

- server.js에 `/api/qna` 마운트.

**클라이언트**:
- `pages/Qna.jsx`(목록) — 제목만 노출(`.post-list`), **답변완료/답변대기** 상태칩, 비밀글 🔒,
  로그인 사용자용 "문의하기" 인라인 폼(제목/내용/비밀글).
- `pages/QnaDetail.jsx`(상세) — 본문/답변, 비밀글은 작성자·관리자만 열람(그 외 마스킹), 관리자에겐
  답변 등록/수정 폼, 작성자·관리자에겐 삭제.
- `api.js`: `fetchQuestions/fetchQuestion/createQuestion/answerQuestion/deleteQuestion`.
- `App.jsx`: `/qna`, `/qna/:id` 라우트. `navLinks.js` `NAV_LINKS`에 `Q&A` 추가(헤더·드로어 공통).
- `index.css`: 상태칩(`.chip--done/.chip--wait`), `.qna-toolbar/.qna-meta/.qna-detail__head/.qna-answer`.

## 의도된 취약점

- **VULN-030** 비밀 문의 접근제어 미흡 — `GET /api/qna/:id`가 비밀글 `body`를 소유권/세션 확인 없이
  반환, 마스킹은 클라이언트 전용(A01 Broken Access Control). 비밀 후기(VULN-026)와 동일 계열의 새 표면.
  `docs/vulnerabilities/VULN-030-qna-secret-question-access-control.md`.

## 검증

- node `node -c`(qna/faqs/server/db) OK, client `npm run build` OK, `docker compose build java-spring` OK.
- `docker compose down -v && up --build` 클린 재시드 후 스모크(양 스택):
  - 목록: 제목만 + secret/answered 플래그 정상, 본문 미노출.
  - FAQ POST: 비인증 401 / 일반 사용자 403 / 관리자 201.
  - Q&A: 작성 201(인증) · 일반 사용자 답변 403 · 관리자 답변 200(q2 `answeredBy:admin` 반영).
  - **VULN-030**: 비인증 `GET /qna/3`(비밀글) 응답에 `body` 원문 포함 확인(node·java 동일).
  - (Java의 한글 본문 POST가 curl에서 400은 Windows CP949 인코딩 아티팩트 — ASCII 본문/브라우저 UTF-8은 정상.)
