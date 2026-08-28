# VULN-014 CSRF — 토큰 부재 + SameSite=None 쿠키

- 대상 스택: node-express, java-spring (동일)
- 심각도: High
- 분류: A01:2021 Broken Access Control (CSRF, CWE-352)

## 위치

- `apps/node-express/src/server.js` — `express-session` 에 `cookie: { sameSite: 'none', secure: true }` 설정. `app.set('trust proxy', 1)` + 리버스 프록시(nginx / vite dev)가 `X-Forwarded-Proto: https` 를 전달하므로 `localhost` 시크릿 컨텍스트에서 `Secure` 쿠키가 정상 동작. anti-CSRF 토큰 미들웨어는 어디에도 없음.
- `apps/java-spring/src/main/resources/application.yml` — `server.servlet.session.cookie.same-site: none` + `secure: true`, `forward-headers-strategy: framework`. Spring Security 자체가 없어 CSRF 필터도 없음.
- 상태 변경 엔드포인트(`POST/PUT/DELETE`) 어디에도 토큰/오리진 검증/커스텀 헤더 요구가 없다.

`SameSite=None` 으로 완화한 것은 "SPA와 API가 다른 호스트" 를 가정한 흔한 실수를 재현한 것 — 크로스 사이트 요청에도 세션 쿠키가 그대로 실려 나간다.

## 트리거 방법

공격자 페이지에서 자동 제출 폼:

```html
<!-- multipart: 프리플라이트 없음 -->
<form action="http://localhost:8090/api/node/profile/avatar" method="POST"
      enctype="multipart/form-data">
  <input type="file" name="avatar">
</form>

<!-- form-urlencoded PUT override: node는 urlencoded 바디 허용, VULN-013 병합 경로 도달 -->
<form action="http://localhost:8090/api/node/profile" method="POST">
  <input name="role" value="system_admin">
</form>
```

- multipart `POST /api/{node,java}/profile/avatar`, `POST /api/{node,java}/admin/products/{id}/image` → 프리플라이트 없이 전송, VULN-018(파일 업로드)과 체이닝하면 CSRF로 저장형 XSS 전달.
- CORS 는 응답을 *읽는* 것만 막고 쓰기(부수효과)는 막지 못함.

## 영향

- 피해자가 로그인된 상태로 공격자 페이지를 열면 의사와 무관하게 아바타/상품 이미지 교체, (VULN-013 체이닝 시) 권한 상승 등이 발생.
- 토큰이 전혀 없으므로 모든 상태 변경 API가 대상.

## 증거 (재현 확인)

(진단 단계에서 채움) 무관한 오리진의 자동 제출 폼으로 `POST /api/node/admin/products/1/image` 실행 → `GET /api/node/admin/products` 에서 이미지가 교체됨을 확인(CSRF 토큰 0개).

## 조치 상태: 미조치 (의도된 취약점)

- 세션 쿠키를 `SameSite=Lax`(최소) 로 되돌리고, 상태 변경 요청에 동기화 토큰(double-submit 또는 서버 세션 토큰) 또는 오리진/Referer 검증을 추가해야 한다.
- 참고: `localhost` + http 환경에서 `SameSite=None; Secure` 는 Chrome 은 대체로 허용, Firefox 는 더 엄격 — PoC 는 Chrome 기준.
