# 56. 최근 본 상품

브랜치: `feature/ux-completeness` · 관련 취약점: 없음(정상 기능)

## 무엇을 만들었나

- 로그인 사용자가 상품 상세를 조회하면 기록하고, 상품 상세 하단에 **최근 본 상품** 스트립을 노출.
- 서버: 상품 상세(`GET /api/products/:id`) 조회 시 `recently_viewed`에 upsert(최신순, 최대 20개 LRU).
  목록은 `GET /api/recently-viewed`. 양 스택 동일. 신규 `recently_viewed` 테이블/엔티티.

## 설계 판단

- 기존엔 상품 조회를 기록하는 경로가 전혀 없었다(activity의 `product.view`는 미사용). `product_likes`의
  per-user 리스트 패턴을 그대로 미러하되, 토글이 아니라 조회 시 맨 앞으로 올리는 LRU(상한 20)로 구현.
- 취약점은 두지 않았다(세션 사용자 기준으로만 조회, `userId` 파라미터 미수용).

## 이후 변경

- 게스트(비로그인) 최근 본 상품은 미구현(로그인 사용자 한정). 필요 시 localStorage 기반으로 확장 가능.
