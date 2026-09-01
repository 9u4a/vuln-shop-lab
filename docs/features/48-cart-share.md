# 48. 장바구니 공유

브랜치: `feature/cart-share` · 관련 취약점: [VULN-012](../vulnerabilities/VULN-012-insecure-deserialization-cart-import.md)

## 무엇을 만들었나

- 장바구니를 **공유 코드**(base64 blob)로 내보내고, 받은 코드를 붙여넣어 그대로 담는 기능.
  - `GET /api/cart/share` (로그인) — 현재 장바구니를 `{ code }`로 내보낸다.
  - `POST /api/cart/import` (로그인) — `{ code }`를 디코드해 항목을 내 장바구니에 담고 `{ itemCount }` 반환.
- 장바구니 페이지에 "장바구니 공유" 섹션(공유 코드 만들기 / 코드 붙여넣어 가져오기). 로그인 사용자에게 노출.
- 양 스택 모두 기능 제공: **Node는 안전한 `JSON.parse`**, **Java는 취약한 Jackson 역직렬화**(VULN-012).

## 설계 판단

- 기존 "장바구니 백업 JSON을 textarea에 붙여넣기"(Java 전용, 평범한 입력은 500)가 억지스러워, 실제 커머스에
  있을 법한 **장바구니 공유**로 재구성했다. 내보내기/가져오기가 같은 typed 포맷을 쓰므로 **정상 왕복이 실제로
  동작**(친구 장바구니 담기)하고, 바로 그 경로가 역직렬화 표면이 된다.
- 공유 코드를 base64로 감싸 raw JSON이 노출되지 않게 했다 — 불투명한 "공유 토큰"처럼 보여 자연스럽다.
- 취약 역직렬화는 `vuln/CartImportController`에 격리(내보내기·가져오기 한 쌍). 서버 장바구니 CRUD는
  `CartController`(기능 44)에 그대로 둔다 — 두 컨트롤러가 `/api/cart`를 공유하지만 서브경로가 달라 충돌 없음.
- Node는 동일 UX를 안전하게 구현해 대칭성만 맞춘다(취약점은 java 스택 전용, Jackson 고유).

## 이후 변경

- VULN-012를 의도적으로 유지: Java `import`가 `activateDefaultTyping(LaissezFaireSubTypeValidator, ...)`로
  코드 안 임의 클래스를 인스턴스화. 트리거는 악성 typed JSON을 base64로 인코딩해 `code`로 전달.
