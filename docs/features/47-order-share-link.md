# 47. 주문 공유 링크

브랜치: `feature/order-lifecycle-batch` · 관련 취약점: [VULN-038](../vulnerabilities/VULN-038-predictable-order-share-token.md)

## 무엇을 만들었나

- 주문마다 공유 토큰(`orders.share_token`)을 발급한다. 주문 생성 시 자동 생성되며 시드 주문에도 백필된다.
- 신규 API `GET /api/orders/shared/:token` — 로그인 없이 토큰만으로 주문·항목·배송 상태를
  **읽기 전용** 열람. (가족에게 배송 현황 공유 등 실제 커머스의 흔한 기능)
- 신규 클라이언트 페이지 `SharedOrder.jsx`(`/orders/shared/:token`, 공개 라우트, 내비 미링크).
  `OrderDetail`에 "주문 공유 링크" 복사용 입력칸 추가.

## 설계 판단

- 공유 링크는 로그인 없이 열려야 하므로 접근제어가 아니라 **토큰의 추측 불가능성**이 유일한 방어선이다.
- 여기서 토큰을 `base64(orderId)`로 만들었다 — 가역(디코드하면 주문 번호)이고 위조 가능(임의 번호 인코딩).
  이게 VULN-038이며, 저장소 최초의 **A02 Cryptographic Failures** 커버리지다.
- 공유 페이지는 내비게이션에 링크하지 않는다(실제 공유 링크처럼 URL로만 도달). 단, 무인증이라
  이 은닉은 방어가 아니다.

## 이후 변경

- VULN-038을 의도적으로 남김: 예측·위조 가능한 공유 토큰 → 전 주문(및 배송 PII) 열거.
