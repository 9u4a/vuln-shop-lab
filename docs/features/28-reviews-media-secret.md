# Reviews media & secret (후기 사진 업로드 · 비밀글)

Branch: `feature/reviews-media-secret` (base: `feature/product-likes`)

상품 후기에 사진 첨부와 비밀글(작성자·관리자만 열람) 기능을 추가한다.

## 데이터 모델 — `reviews` 컬럼 추가 (양 스택)

`image_url`(첨부 이미지 파일명), `secret`(0/1, 기본 0).

- node: `apps/node-express/src/db.js` — CREATE TABLE + guarded ALTER, 시드 1건을 비밀글로 표시.
- java: `entity/Review.java` 필드 2개, `DataSeeder`에서 동일 시드 1건 비밀글 처리.

## 엔드포인트 (양 스택)

| 메서드 | 경로 | 변경 |
|--------|------|------|
| GET | `/api/products/:id/reviews` | 응답에 `userId, imageUrl, secret` 추가 |
| POST | `/api/products/:id/reviews` | `multipart/form-data` — `rating, body, secret, image(선택)` |
| PUT | `/api/products/:id/reviews/:reviewId` | 동일 멀티파트, 이미지 미첨부 시 기존 유지 |

이미지 저장은 기존 업로드 헬퍼 재사용 — node `src/uploads.js`(multer), java `storage/Uploads.java`.

## 클라이언트 (`ProductDetail.jsx`)

- 리뷰 작성/수정 폼에 파일 input(사진 첨부) + "비밀글" 체크박스.
- `api.js`의 `createReview/updateReview`를 `FormData`(멀티파트) 방식으로 변경
  (`{rating, body, secret, image}` 객체 인자).
- 목록: 첨부 이미지 썸네일(클릭 시 원본), 비밀글은 🔒 배지. 작성자/관리자가 아니면
  본문 대신 "🔒 비밀글입니다" 표시(마스킹은 클라이언트에서).
- `index.css` — `.review-item__photo/__lock`, `.review-secret-check`.

## 의도된 취약점

- **VULN-025** 후기 이미지 업로드가 Content-Type만 신뢰(원본 확장자 유지) → `.html`/`.svg`를
  이미지로 위장 업로드 시 앱 오리진에서 실행되는 **저장형 XSS**(VULN-018의 리뷰판 트윈).
- **VULN-026** 비밀 후기 마스킹이 클라이언트에서만 이뤄지고, 목록 API가 `body/imageUrl`을
  모두 반환 → API 직접 호출로 비밀 후기 열람(Broken Access Control).

## 검증

- node `node -c`, java `docker compose build`, client `npm run build` 무오류.
- 클린 재시드 후 양 스택 **동일 결과**:
  - 사진 첨부 + `secret=true` 후기 생성(응답 `imageUrl`, `secret:true`).
  - VULN-025: `<script>` 내용을 `image/png`로 위장 업로드 → `<uuid>.html`이
    `/uploads/{node,java}/<uuid>.html`에서 `HTTP 200 / text/html`로 서빙.
  - VULN-026: 시드 비밀 후기 본문이 `GET /products/1/reviews` 응답에 그대로 포함.

관련 취약점: `docs/vulnerabilities/VULN-025-unrestricted-review-image-upload.md`,
`docs/vulnerabilities/VULN-026-broken-access-control-secret-review.md`
