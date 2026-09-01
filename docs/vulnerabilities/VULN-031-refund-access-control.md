# VULN-031 반품/환불 접근제어·상태검증 누락 (IDOR + 이중환불)

- 대상 스택: node-express, java-spring
- 심각도: High
- 분류: A01:2025 Broken Access Control (CWE-639 IDOR / CWE-841 Improper Enforcement of Behavioral Workflow)

## 위치

반품 요청이 **주문 소유자·결제 상태를 검증하지 않고**, 관리자 환불 승인이 **이미 환불된 건에 대한
재승인(멱등성)을 막지 않는다.**

- node: `apps/node-express/src/routes/returns.js` —
  `POST /returns`가 `orderId`만으로 요청 생성(소유자/상태 무검증), `PUT /returns/:id/approve`가
  상태 확인 없이 매번 `points += refund_amount` 적립.
- java: `apps/java-spring/.../controller/ReturnController.java` — `request`/`approve` 동일.

## 트리거 방법

```
# IDOR: 남의 주문 반품
POST /api/returns {"orderId":2,"reason":"t"}     (user1이 user2 주문 #2에 대해)
→ 요청 성공(소유자 검증 없음)

# 이중환불: 관리자 승인 반복
PUT /api/returns/1/approve   (관리자, 2회 호출)
→ 매번 refund_amount(49000)가 포인트로 적립됨
```

## 영향

- 타인 주문/미결제·취소 주문까지 환불 처리, 동일 반품 반복 승인으로 환불액 무한 적립 → 금전적 손실.

## 증거 (재현 확인)

2026-08-31, 클린 재시드 후 로컬 재현(양 스택 동일): user1이 user2의 주문 #2에 반품 요청 성공,
관리자 `approve`를 2회 호출해 각 `refundAmount=49000` 응답(잔액 2회 적립) 확인.

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: 반품 요청 시 `order.user_id == 세션 사용자` 및 `status in ('paid','delivered')` 검증,
승인 시 `status == 'requested'`인 건만 처리하고 성공 후 `refunded`로 전이(재승인 차단), 환불은
트랜잭션·멱등키로 1회 보장. 관련: [[VULN-009-idor-review-update-delete]](IDOR), [[VULN-029-coupon-claim-no-dedup]](멱등성 부재).
