# 40. 반품/환불 (RMA)

브랜치: `feature/commerce-rewards-batch` · 관련 취약점: [VULN-031](../vulnerabilities/VULN-031-refund-access-control.md)

## 무엇을 만들었나

- `returns` 테이블(주문·회원·사유·상태·환불액). 사용자는 주문 상세에서 반품/환불 요청, 관리자는
  "반품/환불" 탭에서 목록 조회 + 승인(환불)/거부.
- 신규 API: `POST /api/returns`, `GET /api/returns/mine`(사용자), `GET /api/returns`,
  `PUT /api/returns/:id/approve`, `PUT /api/returns/:id/reject`(관리자). 승인 시 환불액을 포인트로 환급.
- 신규 관리자 페이지 `AdminReturns.jsx`(Pagination 패턴), 주문 상세(`OrderDetail.jsx`)에 요청 폼.

## 설계 판단

- 환불 수단은 실제 PG 취소 대신 **포인트 환급**으로 단순화(로컬 랩, feature 39 포인트 재사용).
- 상태 전이는 requested → approved/rejected/refunded. 관리자 승인 API를 별도로 두어 흐름 분리.

## 이후 변경

- VULN-031을 의도적으로 남김: 요청 시 주문 소유자·상태 미검증(IDOR), 승인 시 이중환불 미가드.
