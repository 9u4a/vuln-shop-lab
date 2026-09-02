# VULN-044 배송지 주소록 IDOR (소유권 미검증)

- 대상 스택: node-express, java-spring (동일)
- 심각도: Medium
- 분류: A01:2025 Broken Access Control

## 위치

- `apps/node-express/src/routes/shipping-addresses.js` — `PUT /:id`, `DELETE /:id`가 주소 `id`만으로 수정/삭제
  하고, 그 주소의 `user_id`가 세션 사용자와 일치하는지 확인하지 않는다.
- `apps/java-spring/.../controller/AddressController.java` — `update()`, `delete()`가 `findById(id)`로 찾아
  소유자 확인 없이 저장/삭제한다.

목록 조회(`GET /`)는 세션 사용자로 스코프되지만, 개별 수정/삭제는 id만 알면(순차 정수) 타인 주소도 대상이 된다.

## 트리거 방법

```
(user1) POST /api/{node,java}/shipping-addresses {"name":"u1","address":"addr1"}  → id=1
(user2) PUT  /api/{node,java}/shipping-addresses/1 {"name":"탈취","address":"..."}  → 200 (타인 주소 변조)
(user2) DELETE /api/{node,java}/shipping-addresses/1                                → 200 (타인 주소 삭제)
```

로그인 필요 → nginx `:8090` 경유(세션 쿠키 Secure).

## 영향

- 타 사용자의 배송지 열람은 아니지만 **변조·삭제**가 가능. 주소를 공격자 주소로 바꿔 배송 가로채기,
  대량 삭제로 서비스 방해 등.

## 증거 (재현 확인)

2026-09-02, 로컬 재현(`:8090`, 세션 쿠키 재사용):
- node: user1이 만든 주소(id=1)를 user2가 `PUT`으로 변조 → user1의 `GET`에 변조된 name/address 확인(200).
- java: user1 주소를 user2가 `DELETE` → 200, user1 목록 count 0. **양 스택 재현.**

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: PUT/DELETE에서 대상 주소의 `user_id == 세션 사용자` 검증(불일치 시 404/403).
