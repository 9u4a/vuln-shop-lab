# VULN-026 비밀 후기 접근제어 미흡 (본문이 API 응답에 그대로 노출)

- 대상 스택: node-express, java-spring (client 공통)
- 심각도: Medium
- 분류: A01:2021 Broken Access Control (CWE-639 / CWE-200)

## 위치

후기의 "비밀글(`secret`)" 여부와 무관하게, 후기 목록 API가 `body`/`imageUrl`을 모든 요청자에게
그대로 반환한다. 비밀글 마스킹이 **클라이언트에서만** 이루어져, API를 직접 호출하면 누구나
(비회원 포함) 비밀 후기 내용을 볼 수 있다.

- node: `apps/node-express/src/routes/products.js`, `GET /api/products/:id/reviews` — `secret`
  플래그를 응답에 포함하지만 `body`/`imageUrl`을 필터링하지 않음.
- java: `apps/java-spring/.../controller/ProductController.java`, `listReviews` — 동일.
- client: `apps/client/src/pages/ProductDetail.jsx` — 작성자/관리자가 아니면 `body`를
  "🔒 비밀글입니다"로 가리지만, 원본은 이미 네트워크 응답에 실려 있다.

## 트리거 방법

```
GET /api/products/1/reviews        (비인증 요청도 무방)
→ secret=true 인 후기의 body/imageUrl 이 응답 JSON에 그대로 포함됨
```

브라우저 DevTools의 Network 탭이나 curl로 목록 엔드포인트를 직접 호출하면, 화면에서 가려진
비밀 후기 내용을 그대로 열람 가능.

## 영향

- 다른 사용자가 비공개로 남긴 후기(주문/사이즈/불만 등 민감 내용) 노출 — 정보 유출.

## 증거 (재현 확인)

2026-08-28, 클린 재시드 후 로컬 재현(양 스택 동일): 상품1의 시드 비밀 후기가
`GET /api/products/1/reviews` 응답에 `secret:true`와 함께 `body` 원문이 포함되어 반환됨.

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: 서버에서 세션 사용자를 확인해 비밀 후기는 작성자(`user_id` 일치)와 관리자에게만
`body`/`imageUrl`을 내려주고, 그 외에는 필드를 제거하거나 마스킹 값으로 대체한다.
관련: 리뷰 IDOR(VULN-009), 저장형 XSS(VULN-008)와 같은 리뷰 표면.
