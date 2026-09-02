# VULN-046 인앱 알림 저장형 XSS (관리자 브로드캐스트)

- 대상 스택: node-express, java-spring, client (동일)
- 심각도: High
- 분류: A05:2025 Injection (XSS)

## 위치

- `apps/node-express/src/routes/notifications.js` / `apps/java-spring/.../controller/NotificationController.java` —
  관리자 `POST /api/notifications/broadcast`가 `body`를 검증·이스케이프 없이 모든 사용자의 `notifications`에 저장.
- `apps/client/src/components/NotificationBell.jsx` — 종 드롭다운에서 알림 `body`를
  `dangerouslySetInnerHTML`로 렌더한다(이스케이프 없음). → 저장된 마크업이 각 사용자 브라우저에서 실행된다.

관리자가 심은 스크립트가 알림을 여는 모든 사용자에게 실행되는 저장형(관리자→사용자) XSS다(VULN-023/028 계열).

## 트리거 방법

```
(admin) POST /api/{node,java}/notifications/broadcast
        {"title":"점검 안내","body":"<img src=x onerror=alert(document.domain)>"}
→ 모든 사용자에게 저장. 사용자가 헤더 종 아이콘을 열면 onerror 실행.
```

로그인(관리자) 필요 → nginx `:8090` 경유.

## 영향

- 전체 사용자를 대상으로 한 저장형 XSS. 세션 탈취(쿠키는 HttpOnly지만 화면 조작·요청 위조 가능),
  피싱 오버레이, 자동 요청(CSRF 유사) 등. 한 번의 브로드캐스트로 전 사용자 피해.

## 증거 (재현 확인)

2026-09-02, 로컬 재현(`:8090`, 세션 쿠키 재사용):
- node: admin 브로드캐스트 `body="<img src=x onerror=alert(document.domain)>"` → user1 `GET /notifications`
  응답 body가 원문 그대로 반환. (한글 title은 Windows curl CP949 이슈로 ASCII title로 재확인.)
- java: `body="<svg onload=alert(1)>"` → user1 조회 시 원문 그대로 반환. 렌더는 `dangerouslySetInnerHTML`
  경로로 실행. **양 스택 재현.**

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: 알림 본문을 텍스트로 렌더(React 기본 이스케이프)하거나 DOMPurify류로 sanitize,
`dangerouslySetInnerHTML` 제거. 링크는 내부 상대경로만 허용.
