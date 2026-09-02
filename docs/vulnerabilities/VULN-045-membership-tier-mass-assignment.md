# VULN-045 회원 등급 자가 승급 (대량 할당)

- 대상 스택: node-express, java-spring (동일)
- 심각도: High
- 분류: A01:2025 Broken Access Control

## 위치

- `apps/node-express/src/routes/profile.js` — `PUT /api/profile`가 요청 본문의 키를 `/^[a-z_]+$/`로만 걸러
  `UPDATE users SET <cols>`를 수행한다. `membership_tier`가 이 필터를 통과해 **본인이 자기 등급을 설정**할 수 있다.
- `apps/java-spring/.../controller/ProfileController.java` — `update()`가 `objectMapper.updateValue(user, body)`로
  본문을 사용자 엔티티에 병합한다. `membershipTier`가 그대로 매핑돼 자가 승급이 된다.

관리자 지정용 정상 경로(`PUT /api/admin/users/:id/tier`)는 별도로 검증돼 있으나, 일반 프로필 수정이 등급 필드를
제외하지 않아 권한 상승형 대량 할당이 성립한다(VULN-013 계열).

## 트리거 방법

```
PUT /api/node/profile  {"membership_tier":"vip"}      # node: snake_case 컬럼명
PUT /api/java/profile  {"membershipTier":"vip"}       # java: 엔티티 프로퍼티명
→ 이후 GET /profile 의 membershipTier = "vip"; 주문 시 등급 할인(vip 10%) 자동 적용
```

로그인 필요 → nginx `:8090` 경유.

## 영향

- 사용자가 스스로 최상위 등급으로 올려 등급 할인(최대 10%)을 무단 취득 → 지속적 금전 이득. 등급이 다른
  혜택(무료배송 임계 등)에 연동되면 영향이 확대된다.

## 증거 (재현 확인)

2026-09-02, 로컬 재현(`:8090`):
- node: user1 `PUT /profile {"membership_tier":"vip"}` → `GET /profile` tier `basic`→`vip`. 이후 49,000원 상품
  1개 주문 시 `discountAmount=4900`(10%), `amount=44100` 확인.
- java: user1 `PUT /profile {"membershipTier":"vip"}` → tier `vip`. **양 스택 재현.**

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: 프로필 수정 화이트리스트에서 `membership_tier`/`membershipTier` 제외. 등급은 관리자 전용
엔드포인트로만 변경하고, 가능하면 구매 실적 기반으로 서버가 산정.
