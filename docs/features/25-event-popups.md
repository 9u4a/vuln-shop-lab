# Event popups (관리자 게시 + 메인 페이지 팝업)

Branch: `feature/event-popups`

관리자가 이벤트를 게시하면 메인 페이지(`/`) 접속 시 팝업으로 노출되는 기능. 실제 한국
쇼핑몰의 "오늘 하루 보지 않기" 팝업 UX를 따른다. 더미 이벤트 3건 시드 포함.

## 데이터 모델 — `events`

`id, title, body, image_url, link_url, active, starts_at, ends_at, created_at`

- `body`: HTML (팝업에서 그대로 렌더 — **VULN-023 저장형 XSS**, 의도적).
- `active`: 게시 on/off 토글.
- `starts_at` / `ends_at`: 선택. ISO-8601 문자열로 저장하고 문자열 비교로 노출 윈도 판정
  (양 스택 동일 — Java도 `String` 컬럼).

## 엔드포인트 (양 스택 동일)

| 메서드 | 경로 | 접근 | 동작 |
|--------|------|------|------|
| GET | `/api/events` | public | `active=1` AND 노출 윈도 내 이벤트, id 내림차순 |
| GET | `/api/events/manage` | requireAdmin | 전체 이벤트 |
| POST | `/api/events` | requireAdmin | 생성 |
| PUT | `/api/events/:id` | requireAdmin | 수정 (부분 업데이트) |
| DELETE | `/api/events/:id` | requireAdmin | 삭제 |

- Node: `apps/node-express/src/routes/events.js`, `server.js` 에 마운트, `db.js` 에 테이블 +
  더미 3건 시드.
- Java: `entity/Event.java`, `repository/EventRepository.java`,
  `controller/EventController.java`, `config/DataSeeder.java` 에 `seedEvents()`.

## 클라이언트

- `src/components/EventPopups.jsx` — `Home` 에 마운트. `GET /events` 로 활성 이벤트를 받아
  최대 3개를 오프셋 스택 팝업으로 표시. 각 팝업:
  - `body` 를 `dangerouslySetInnerHTML` 로 렌더 (VULN-023).
  - `linkUrl` 있으면 "자세히 보기" CTA (내부 경로는 `<Link>`, 외부는 새 탭).
  - "오늘 하루 보지 않기" → `localStorage['vulnshop_event_hide_<id>'] = 오늘 날짜`.
  - "닫기" → 세션 내에서만 숨김.
- `src/pages/admin/AdminEvents.jsx` — `/admin/events` 탭. 목록(활성 토글/수정/삭제) +
  생성·수정 폼(제목, 본문 HTML, 이미지 URL, 링크 URL, 시작/종료 일시, 활성 체크박스).
- `api.js`: `fetchEvents`, `fetchEventsManage`, `createEvent`, `updateEvent`, `deleteEvent`.
- `AdminLayout` 탭 + `App.jsx` 라우트에 `events` 추가.
- `index.css`: `.event-popups` / `.event-popup*` (데스크톱 오프셋 스택, 모바일 하단 시트).

## 더미 이벤트 (시드, 3건, 모두 active)

1. 여름 데스크 셋업 페어 — 최대 30% 할인 (`/products`)
2. 신규 회원 웰컴 쿠폰 (`/signup`)
3. 무료배송 위크 (`/products`)

## 검증

- Node: `node -c` (events.js / server.js / db.js). Java: `docker compose build java-spring`.
- Client: `npm run build` 무오류.
- `docker compose down -v` 클린 리빌드 후 이벤트 API 스모크 **20/20 통과** (양 스택):
  public GET, admin manage(+anon 401), create, 저장형 XSS body 원문 노출, active 토글 시
  public 목록에서 제외, delete.
- 브라우저: `/` 접속 시 팝업 3개 스택 노출, "오늘 하루 보지 않기" 후 새로고침해도 안 뜸,
  `/admin/events` 에서 생성·토글·삭제.

관련 취약점: `docs/vulnerabilities/VULN-023-stored-xss-event-popup.md`
