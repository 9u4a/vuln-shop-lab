# VULN-009 리뷰 수정/삭제 IDOR (소유권 미검증)

- 대상 스택: node-express, java-spring
- 심각도: Medium
- 분류: A01:2025 Broken Access Control

## 위치

- **node-express**: `apps/node-express/src/routes/products.js`, `PUT/DELETE /api/products/:id/reviews/:reviewId` — `requireAuth`로 로그인 여부만 확인하고, `review.user_id`가 요청자 본인인지 검사하지 않음.
- **java-spring**: `apps/java-spring/.../ProductController.java`, `updateReview`/`deleteReview` — 세션에 사용자가 있는지만 확인하고 `review.getUserId()`와 비교하지 않음.

## 트리거 방법

```
PUT /api/products/1/reviews/5
{"rating":1,"body":"pwned"}

DELETE /api/products/1/reviews/5
```

로그인한 아무 계정으로 다른 사용자가 작성한 `reviewId`를 지정해 호출 — 200/204 응답과 함께 타인 리뷰가 수정/삭제됨.

## 영향

- 임의 사용자가 타인의 리뷰를 무단 수정·삭제 가능 — 콘텐츠 위·변조 및 삭제(무결성 훼손).

## 증거 (재현 확인)

2026-09-01, 로컬 재현(`:8090`): `user1`(userId 3) 세션으로 `PUT /api/node/products/1/reviews/10`
(리뷰 10은 userId 6 소유) → 200, 응답·후속 조회에서 body가 `HACKED-BY-user1(IDOR)`로 변경됨. 소유권
검증 없이 `reviewId`+`productId`만으로 수정됨을 확인.

## 조치 상태: 미조치 (의도된 취약점)
