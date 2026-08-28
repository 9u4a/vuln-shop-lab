# 17. 취약점 배치: VULN-005 ~ VULN-012

브랜치: `feature/vuln-batch-005-013` · 관련 취약점: VULN-005~012

앞선 발견(VULN-001·002·004)이 남긴 OWASP 공백을 메우는 Phase 1(구현·문서화) 배치. 진단(Burp)·조치는 이후 단계.

## 무엇을 만들었나 (취약점 8종)

| ID | 취약점 | 스택 | 표면 |
|----|--------|------|------|
| 005 | 상품 검색/필터 SQLi | java | `GET /api/products`(VULN-001의 java 짝) |
| 006 | 세션 고정 + 로그인 시도 제한 없음 | both | `POST /api/auth/login`(현행 동작 문서화) |
| 007 | 진단 엔드포인트 노출 | both | `/actuator/*`(java), dev 에러 핸들러(node) |
| 008 | 리뷰 본문 저장형 XSS | client+both | `ProductDetail`의 `dangerouslySetInnerHTML` |
| 009 | 리뷰 수정/삭제 IDOR | both | `PUT/DELETE /api/products/:id/reviews/:rid` |
| 010 | 영수증 생성 OS 커맨드 인젝션 | node | `POST /api/orders/:id/receipt` |
| 011 | 영수증 다운로드 경로 순회 | both | `GET /api/orders/receipt/:filename` |
| 012 | 장바구니 임포트 역직렬화 | java | `POST /api/cart/import` |

## 설계 판단
- 005: `ProductService.list()`가 필터 있을 때만 네이티브 SQL 문자열 결합 경로로 분기, 안전한 finder는 그대로 둬 조치 시 diff 최소화.
- 006/007: 코드 변경 없이 현행 동작(세션 재발급 없음, actuator 전체 노출/Node dev 기본값)을 의도된 발견으로 문서화.
- 008: 리뷰 렌더를 `dangerouslySetInnerHTML`로 전환(백엔드 새니타이즈 없음).
- 010: `echo "...${note}" > file`을 `child_process.exec` — `note`는 없으면 `bio`로 폴백해 필드 없이도 도달.
- 012: java 규약대로 `vuln/CartImportController`에 격리, `activateDefaultTyping`으로 서브타입 검증 무력화(CWE-502). databind 버전은 BOM 정합성 때문에 낮추지 않음.
- 클라 `api.js`에 receipt/review/cart-import 함수 추가, receipts 디렉터리 `.gitignore`.
