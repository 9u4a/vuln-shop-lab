# Cart option edit (장바구니 옵션 변경)

Branch: `feature/cart-option-edit` (base: `feature/reviews-media-secret`)

장바구니 라인 아이템의 옵션(사이즈·색상 등)을 목록에서 바로 변경할 수 있게 한다. 클라이언트
전용 변경(장바구니는 localStorage 기반).

## 클라이언트

- `CartContext.jsx`
  - `addItem`이 라인에 `optionName`, `optionValues`(상품의 선택지)를 함께 저장 —
    장바구니에서 셀렉트를 렌더하기 위함.
  - `changeOption(productId, oldOption, newOption)` 추가 — 라인 키(`${productId}::${option}`)를
    재생성. 대상 옵션 라인이 이미 있으면 수량을 합친다. 컨텍스트 value로 노출.
- `Cart.jsx` — 옵션 선택지가 있는 라인은 인라인 `<select>`로 옵션 변경, 없으면 기존처럼
  "옵션: {값}" 정적 표시. 기존 localStorage 라인(선택지 미보유)은 정적 표시로 폴백.
- `index.css` — `.line-item__option`.

## 의도된 취약점 (VULN-027)

주문 생성 API가 `optionValue`를 상품 제공 옵션과 대조하지 않고 그대로 저장 → 제공되지 않는
임의 옵션으로 주문 가능(A04 Insecure Design). 코드 변경 없이 기존 서버 동작을 문서화
(장바구니 옵션 변경 기능이 옵션을 전면에 드러내며 부각된 결함).
문서: `docs/vulnerabilities/VULN-027-order-option-not-validated.md`.

## 검증

- client `npm run build` 무오류.
- 옵션 변경 후 동일 옵션 라인 존재 시 수량 병합(로직), 선택지 없는 라인은 정적 표시(폴백).
- VULN-027: `POST /api/orders`에 상품이 제공하지 않는 `optionValue`로 주문 → 양 스택 모두
  그대로 저장됨(주문 상세에서 확인).
