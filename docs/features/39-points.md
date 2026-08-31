# 39. 포인트/적립금

브랜치: `feature/commerce-rewards-batch` · 관련 취약점: [VULN-030](../vulnerabilities/VULN-030-point-balance-manipulation.md)

## 무엇을 만들었나

- `users.points` 컬럼 + `point_transactions` 원장(적립/사용 내역). 주문 생성 시 상품금액의 5%를 적립하고,
  결제 시 `pointsUsed`만큼 결제 예상금액에서 차감.
- 신규 조회 API `GET /api/points`(잔액 + 내역). 마이페이지 "포인트·추천" 탭에 잔액/내역 표, 장바구니
  결제 요약에 포인트 사용 입력.
- 시드: 데모 사용자(user1~3) 3,000P + 원장 1건(양 스택 동일).

## 설계 판단

- 적립은 결제 성공(Toss 확인)이 아니라 **주문 생성 시점**에 부여 — 로컬 랩에서 Toss 키 없이도 포인트
  흐름을 시연/재현할 수 있게 하기 위함.
- 잔액은 `users.points` 단일 컬럼 + 별도 원장으로 이원화(잔액 조회 단순, 내역 추적 가능).

## 이후 변경

- VULN-030(포인트 사용 미검증)을 의도적으로 남김: `pointsUsed` 서버 검증 부재. 추천인(feature 41)·
  반품환불(feature 40)의 리워드가 이 포인트 잔액/원장을 재사용.
