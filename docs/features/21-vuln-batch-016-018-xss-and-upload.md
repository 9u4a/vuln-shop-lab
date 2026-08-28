# 21. 취약점 배치: VULN-016 반사형 XSS, VULN-017 DOM XSS, VULN-018 파일 업로드

브랜치: `feature/vuln-batch-016-xss-and-upload` · 관련 취약점: VULN-016, VULN-017, VULN-018

A03(XSS) + 파일 업로드. 반사형·DOM XSS 커버리지 완성(기존엔 저장형 VULN-008만 존재).

## VULN-016 — 인쇄용 영수증 HTML 반사형 XSS
- 신규 "인쇄용 보기". `GET /api/orders/:id/receipt/print`(양 스택)가 `text/html`에 `note` 쿼리를 이스케이프 없이 결합해 반환(`requireAuth`+소유권 유지). `OrderDetail`에 새 탭 링크.

## VULN-017 — 상품 검색 헤딩 DOM 기반 XSS
- `Products.jsx`가 `q`를 `<p dangerouslySetInnerHTML={{__html:`'${q}' 검색 결과`}}/>`로 렌더. URL 소스·서버 왕복 없는 순수 클라 싱크(저장형 VULN-008과 구별).

## VULN-018 — 파일 업로드 Content-Type 신뢰 → 앱 오리진 저장형 XSS
- node `uploads.js` `fileFilter`가 확장자 화이트리스트를 버리고 `mimetype.startsWith('image/')`만, 저장 파일명은 원본 확장자 유지. java `Uploads.isAllowed()`도 동일.
- `Content-Type: image/png`로 위장한 `.html`이 `/uploads/*`에서 `text/html`로 서빙(nginx가 SPA와 동일 오리진) → 앱 오리진 저장형 XSS. VULN-014(CSRF 아바타 업로드)와 연계.
