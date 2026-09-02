# 58. 포인트 선물하기

브랜치: `feature/order-cart-admin-refinements` · 관련 취약점: [VULN-047](../vulnerabilities/VULN-047-point-gift-source-idor.md)

## 무엇을 만들었나

- **포인트 선물** 기능. 마이페이지 "포인트·리워드" 탭(`MyPageRewards`)에 받는 분(아이디/이메일)과 금액을
  입력해 보유 포인트를 다른 사용자에게 이체한다.
- 서버: `POST /api/points/gift {toUsername, amount, fromUserId?}` — 발신자 차감 + 수신자 적립 + 원장
  2행(`point_transactions`의 `reason`에 상대 표기: `선물 발신 → {수신자}` / `선물 수신 ← {발신자}`).
  수신자에게 인앱 알림 발송. 양 스택 동일(node `routes/points.js`, java `PointController`).
- 스키마 변경 없음 — 기존 포인트 원장/적립·차감 패턴 재사용. 수신자 조회는 `username = ? OR email = ?`.

## 설계 판단

- 상품권 등록·추천 코드로 포인트가 **들어오는** 경로는 있었으나 사용자 간 **이체** 경로가 없었다. 원장
  구조(부호 있는 amount)를 그대로 써 발신 음수/수신 양수 2행으로 표현, counterparty는 `reason` 텍스트로.
- 정상 UI는 발신자를 세션 사용자로 고정해 보낸다(클라는 `fromUserId` 미전송). 그러나 서버가 차감 대상을
  요청 값으로 신뢰하도록 남겨 취약점을 얹었다(VULN-047, 사용자 지정).

## 이후 변경

- 정상화 시: 차감 계정을 세션 사용자로 강제(요청 `fromUserId` 무시), 이체를 원자적 트랜잭션으로 처리,
  자기 이체·음수·잔액 초과 검증. 관련 [[VULN-047-point-gift-source-idor]], [[VULN-030-point-balance-manipulation]].
