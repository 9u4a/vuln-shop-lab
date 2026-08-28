# 01. 프로필 · 역할 기반 인증

브랜치: `feature/profile-roles`

## 무엇을 만들었나
- `users`에 `bio`·`avatar_url` 컬럼 추가(양 스택).
- `GET/PUT /api/profile` — 본인 소개(bio) 조회·수정. `POST /api/profile/avatar` — 이미지 업로드(png/jpg/jpeg/gif/webp, 2MB), `/uploads/<파일>`로 서빙.
- 재사용할 인증 가드 도입: node `requireAuth`/`requireAdmin` 미들웨어(java는 세션 검사 인라인).
- 이후 기능을 염두에 두고 스키마 선반영: `products.category`, `reviews`, `orders`/`order_items`(webhook_url·toss_* 포함). node는 guarded `ALTER TABLE ADD COLUMN`, java는 `ddl-auto: update`.
- 클라이언트: `/profile` 페이지, Vite dev 프록시에 `/uploads/node`·`/uploads/java` 추가.

## 설계 판단
- 아직 기능 구현 단계라 파일 업로드 검증(확장자 화이트리스트+용량)은 **의도적으로 안전하게** 두었다. 업로드 취약점은 이후 단계에서 문서화된 변경으로 도입.
- 아바타는 UUID 파일명으로 저장해 충돌·덮어쓰기 방지. `multer 1.4.5-lts.1`은 알려진 CVE를 포함하지만 "취약 의존성" 소재로 의도적으로 고정.

## 이후 변경
- `/profile` → `/mypage`로 분할(10). 아바타 업로드는 Content-Type 신뢰 취약점(VULN-018, 21)의 표면이 됨.
