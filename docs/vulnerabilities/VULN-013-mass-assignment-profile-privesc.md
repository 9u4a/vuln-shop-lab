# VULN-013 프로필 업데이트 대량 할당 → 권한 상승

- 대상 스택: node-express, java-spring (동일)
- 심각도: Critical
- 분류: A01:2021 Broken Access Control (CWE-915 Mass Assignment)

## 위치

- `apps/node-express/src/routes/profile.js`, `PUT /api/profile` — 요청 바디의 키를 그대로 SQL `UPDATE users SET <col>=?` 의 컬럼명으로 사용. 값은 파라미터 바인딩되지만(2차 SQLi 아님), 어떤 컬럼을 갱신할지를 클라이언트가 결정. `bio`만 갱신하던 화이트리스트를 제거하고 `Object.keys(req.body)` 를 순회.
- `apps/java-spring/.../controller/ProfileController.java`, `PUT /api/profile` — `objectMapper.updateValue(user, body)` 로 요청 맵을 `User` 엔티티에 통째로 병합 후 `save()`. `role`/`username` 등 모든 setter 노출.

두 스택 모두 저장 직후 세션 사용자 객체를 갱신하므로(`req.session.user` / `session.setAttribute("user", ...)`) 권한 상승이 다음 요청부터 즉시 적용된다.

배송 정보(name/phone/postcode/address) 편집 기능을 마이페이지에 추가하면서 의도적으로 필드 화이트리스트를 두지 않았다.

## 트리거 방법

```
PUT /api/node/profile
Content-Type: application/json
{"role": "system_admin"}
```

(node는 `Content-Type: application/x-www-form-urlencoded` 로 `role=system_admin` 도 허용 → VULN-014 CSRF와 체이닝 가능)

```
PUT /api/java/profile
{"role": "system_admin"}
```

이후:

```
GET  /api/{node,java}/admin/users          → 전체 사용자 name/phone/postcode/address 덤프
PUT  /api/{node,java}/admin/users/1/role   → 기존 system_admin(9u4a) 강등
```

## 영향

- 일반 계정(`user1` 등)이 회원 정보 수정 요청 한 번으로 `system_admin` 획득.
- 이후 모든 관리자 기능 접근, 타 사용자 role 변경, 원 관리자 강등.
- node는 `password_hash` 컬럼도 세팅 가능(알고 있는 bcrypt 해시로 덮어써 계정 탈취 형태 변형).

## 증거 (재현 확인)

(진단 단계에서 채움) `user1` 세션으로 `PUT /api/node/profile {"role":"system_admin"}` → `GET /api/node/admin/users` 200 + 전체 PII, `GET /api/node/session` 의 role 이 `system_admin`.

## 조치 상태: 미조치 (의도된 취약점)

정상 구현 시 서버가 수정 허용 필드(`bio`, `name`, `phone`, `postcode`, `address`, `address_detail`)를 명시적으로 화이트리스트하고 `role`/`username`/`id`/`password_hash` 는 이 경로에서 절대 받지 않아야 한다.
