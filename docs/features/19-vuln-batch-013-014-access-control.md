# 19. 취약점 배치: VULN-013 대량 할당, VULN-014 CSRF

브랜치: `feature/vuln-batch-013-access-control` · 관련 취약점: VULN-013, VULN-014

A01 접근 제어 테마. VULN-013~022 배치의 첫 브랜치.

## VULN-013 — 대량 할당 → 권한 상승
- 실제 기능: 마이페이지에서 배송 정보(name/phone/postcode/address) 수정(기존엔 bio만 수정 가능).
- node `profile.js` `PUT /` — `Object.keys(req.body)`로 `SET <col>=?` 동적 구성(키는 `/^[a-z_]+$/`, `id` 제외). java `ProfileController` — `objectMapper.updateValue(user, body)`로 전체 병합.
- 저장 후 `req.session.user` 갱신 → 역할 변경이 즉시 반영. 익스플로잇 페이로드 `{"role":"system_admin"}`는 양 스택 공통.

## VULN-014 — CSRF (토큰 부재 + SameSite=None)
- node `server.js` `trust proxy` + 세션 쿠키 `sameSite:none, secure:true`. java `application.yml` `forward-headers-strategy` + 동일 쿠키. nginx·vite dev 프록시가 `X-Forwarded-Proto https` 전달.
- 랩엔 TLS가 없어 `X-Forwarded-Proto https`가 "TLS 종단 리버스 프록시" 역할 — localhost는 보안 컨텍스트라 `Secure`/`SameSite=None` 쿠키가 동작.
