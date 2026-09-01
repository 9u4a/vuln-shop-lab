# VULN-025 후기 이미지 업로드 Content-Type 신뢰 → 앱 오리진 저장형 XSS

- 대상 스택: node-express, java-spring
- 심각도: High
- 분류: A02:2025 Security Misconfiguration (Unrestricted File Upload → Stored XSS, CWE-434)

## 위치

후기(리뷰) 사진 업로드가 파일의 `Content-Type`만 신뢰하고 확장자/실제 내용은 검증하지 않는다.
VULN-018(아바타·상품 이미지 업로드)과 동일한 업로드 헬퍼를 새 후기 이미지 엔드포인트에서
재사용하면서 인젝션 표면이 넓어진 형태.

- node: `apps/node-express/src/routes/products.js`, `POST/PUT /api/products/:id/reviews`
  (`upload.single('image')`) — `src/uploads.js`의 multer `fileFilter`가
  `file.mimetype.startsWith('image/')`만 확인하고, 저장 파일명은 원본 확장자를 그대로 사용.
- java: `apps/java-spring/.../controller/ProductController.java`, 동일 엔드포인트 —
  `storage/Uploads.java`의 `isAllowed()`가 `contentType.startsWith("image/")`만 확인하고
  원본 확장자를 유지.

업로드 파일은 `/uploads/<파일명>`에서 앱과 동일 오리진으로 정적 서빙되므로, `.html`/`.svg`를
올리면 브라우저가 그대로 실행한다.

## 트리거 방법

```
POST /api/products/3/reviews   (multipart/form-data, 로그인 필요)
  rating=5
  body=사진 후기
  image=@xss.html ; Content-Type: image/png     ← 헤더만 image, 내용은 <script>

→ 응답 imageUrl = "<uuid>.html"
→ GET /uploads/<uuid>.html  →  HTTP 200, Content-Type: text/html  →  스크립트 실행
```

## 영향

- 앱 오리진에서 임의 HTML/JS 실행(저장형 XSS). 링크를 클릭한 피해자(관리자 포함)의 세션 탈취,
  피해자 권한으로의 임의 API 호출 등.

## 증거 (재현 확인)

2026-08-28, 클린 재시드 후 로컬 재현(양 스택 동일): `<script>alert(document.domain)</script>`
내용을 `image/png`로 위장해 후기 이미지로 업로드 → 응답 `imageUrl`이 `<uuid>.html`,
`GET /uploads/{node,java}/<uuid>.html` 응답이 `HTTP 200 / text/html`로 서빙됨을 확인.

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: 매직바이트 기반 콘텐츠 검증 + 서버가 안전한 확장자 강제(예: 이미지 디코딩 후
재인코딩), 업로드 디렉터리를 별도 오리진/`Content-Disposition: attachment`로 서빙, 실행 가능한
확장자 차단. VULN-018과 함께 조치.
