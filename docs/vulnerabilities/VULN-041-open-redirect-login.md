# VULN-041 로그인 후 오픈 리다이렉트

- 대상 스택: client (React) — node/java 백엔드 무관
- 심각도: Medium
- 분류: A01:2025 Broken Access Control (Unvalidated Redirect)

## 위치

- `apps/client/src/pages/Login.jsx` — 로그인 성공 후 복귀 경로를 `?next=` 쿼리(없으면 `location.state.from`)
  에서 읽어 이동한다. 값이 `http(s)://`로 시작하면 `window.location.href = next`로 **외부로도** 이동하며,
  동일 오리진 검증이 전혀 없다.

```js
const next = searchParams.get('next') || location.state?.from?.pathname || '/';
if (/^https?:\/\//i.test(next)) {
  window.location.href = next;   // 외부 절대 URL도 그대로 이동
} else {
  navigate(next);
}
```

## 트리거 방법

```
피해자에게 배포하는 링크:
  http://localhost:8090/login?next=https://evil.example/phish
→ 로그인(정상 사이트에서 인증)에 성공하는 즉시 https://evil.example/phish 로 이동
```

정상 도메인의 로그인 URL이라 피해자는 신뢰하지만, 인증 직후 공격자 페이지로 넘어간다(피싱·토큰 탈취 유도).

## 영향

- 신뢰 도메인을 미끼로 한 피싱/자격증명 재입력 유도, OAuth류 흐름에서 리다이렉트 체인 악용의 발판.

## 증거 (재현 확인)

`Login.jsx`의 복귀 로직상 `?next=https://…` 절대 URL이 검증 없이 `window.location.href`로 전달됨을 코드로
확인(클라이언트 라우팅 취약점). 트리거 URL: `/login?next=https://evil.example/phish`.
(브라우저 확장 미연결로 이번엔 라이브 캡처 대신 코드 기준 확인 — 재현은 위 링크로 결정적.)

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: `next`를 `/`로 시작하는 상대 경로로만 허용하고 `//`·`\`·절대 URL·외부 스킴을 거부(허용목록),
불명확하면 홈으로 폴백.
