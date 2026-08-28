# 03. 상품 리뷰

브랜치: `feature/reviews`

## 무엇을 만들었나
- `GET /api/products/:id/reviews` — 공개, 최신순(username·rating·body·createdAt).
- `POST /api/products/:id/reviews` — `requireAuth`, `{rating:1~5, body}`(상품 없음·범위 초과·빈 본문 거부).
- 클라이언트: `ProductDetail`에 리뷰 목록 + 로그인 사용자용 작성 폼.

## 설계 판단
- 01에서 선반영한 `reviews` 테이블 재사용(마이그레이션 불필요).

## 이후 변경
- 이 시점엔 React가 `{r.body}`를 자동 이스케이프해 XSS가 성립하지 않았으나, 이후 `dangerouslySetInnerHTML`로 바꿔 **저장형 XSS(VULN-008, 17)를 의도적으로 도입**. 리뷰 수정/삭제 IDOR(VULN-009), 사진·비밀글(28)도 이 표면 위에 추가됨.
