# 36. 대량 더미 시드 데이터 (항목당 50~100개)

브랜치: `feature/bulk-seed-data`

기동 시 시드되는 더미데이터를 항목당 50~100개로 확장. 기존 큐레이트 데이터는 보존하고, 결정적
생성기로 부족분을 채워 양 스택(node/java)이 동등한 규모를 갖도록 했다. 의도된 취약점은 미변경.

## 무엇을 만들었나

각 시드 항목을 아래 규모로 확장(기존 곡선형 큐레이트 + 생성):

| 항목 | 규모 | 비고 |
|------|------|------|
| users | 62 | 명명 5 + `user4`~`user60`(비밀번호=아이디) |
| products | 60 | 큐레이트 16 + 카테고리 순환 생성, SKU 고유 |
| faqs | 60 | 주제 순환 |
| questions(Q&A) | 60 | 답변완료/미답변/비밀글 혼합 |
| notices | 60 | 공지/이벤트/점검/안내 순환 |
| events | 60 | 활성 48 / 비활성 12 |
| coupons | 60 | 정액·정률 순환, 코드 `PROMO0001`~ |
| reviews | ~99 | 상품 전반 × 사용자, 비밀 후기 데모 유지 |
| product_likes | ~97 | 상품 × 사용자(중복 방지) |
| orders | 60 | 상태 혼합, `toss_order_id` 고유 |
| login_logs | 80 | 성공/실패 혼합, UA·IP 순환 (java 시드 신설) |
| activity(Mongo) | 80 | 사용자 × 액션 순환 |

- node: `apps/node-express/src/db.js`의 각 시드 블록에 생성 루프 추가, `src/mongo.js` 활동 시드 확장.
  login_logs 시드 블록 신설.
- java: `config/DataSeeder.java`의 각 `seed*()`를 가변 리스트로 바꿔 생성 추가,
  `seedLoginLogs()` 신설(+ `LoginLogRepository` 주입).

## 설계 판단

- **결정적 생성**(인덱스 기반, 난수 없음) — 재시드마다 동일 데이터, 두 스택이 동등한 규모/형태.
- **멱등 유지** — 모든 시드는 `count == 0` 가드. 클린 재시드(`docker compose down -v`) 시 50~100개가
  채워지고, 단순 재기동은 no-op(기존 데이터 보존). "서버 올릴 때마다 반영"은 클린 기동 기준.
- **참조 무결성** — 후기·좋아요·주문·로그는 실제 시드된 user/product id를 조회해 참조.
- **취약점 보존** — 시드 데이터 볼륨만 늘렸을 뿐 취약 코드/스키마는 미변경(비밀 후기 데모도 유지).

## 검증

- node `-c`(db.js/mongo.js) OK, java 빌드 OK, `docker compose down -v && up --build` 클린 재시드.
- DB 실제 행 수(node): users 62 · products 60 · faqs 60 · questions 60 · notices 60 · events 60 ·
  coupons 60 · reviews 99 · product_likes 97 · orders 60 · order_items 90 · login_logs 80 · activity 80.
- API `total`(java): faqs/qna/notices/coupons 각 60, events 총 60(활성 48). 상품1 후기 3건.
- 대량 사용자 로그인 정상(node `user60`, java `user5` → 200). `bash scripts/smoke.sh` SMOKE PASS.
