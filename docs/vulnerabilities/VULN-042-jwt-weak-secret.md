# VULN-042 API 토큰(JWT) 알려진 시크릿으로 위조

- 대상 스택: node-express, java-spring (동일)
- 심각도: High
- 분류: A07:2025 Identification and Authentication Failures

## 위치

- `apps/node-express/src/routes/auth.js` — `JWT_SECRET`이 미설정 시 리포지토리에 담긴 **알려진 기본값**
  (`dev-jwt-secret-please-change-0001`)으로 폴백한다. `GET /api/auth/whoami`가 그 시크릿으로 검증한
  Bearer 토큰의 `role` 클레임을 그대로 신뢰한다.
- `apps/java-spring/.../security/JwtSupport.java` — `app.jwt.secret` 동일 기본값. `AuthController.whoami`가
  검증 통과한 토큰의 클레임을 반환한다. (`SecretKeySpec`으로 HMAC 키를 구성.)

서명 키가 공개 저장소의 기본값이고 docker-compose가 `JWT_SECRET`을 주입하지 않으므로, 랩에서는 이 알려진
키로 누구나 임의 클레임(예: `role:admin`) 토큰을 위조해 서명할 수 있다(CWE-798 하드코딩된 키). 두 스택이
같은 키를 쓰므로 한 토큰이 양쪽에 통한다.

## 트리거 방법

```
# 알려진 기본 시크릿으로 role=admin 토큰 위조 (jsonwebtoken 예)
node -e "console.log(require('jsonwebtoken').sign({sub:'999',username:'attacker',role:'admin'},'dev-jwt-secret-please-change-0001'))"

GET /api/{node,java}/auth/whoami
  Authorization: Bearer <위조 토큰>
→ {"id":"999","username":"attacker","role":"admin"}   # 위조한 관리자 신원이 그대로 수용
```

## 영향

- 로그인 없이 임의 사용자·관리자 신원을 주장하는 토큰 위조. 토큰 기반으로 권한을 판단하는 모든 경로에서
  권한 상승/사칭이 가능하다. 세션 쿠키 자격증명과 별개의 우회 경로가 된다.

## 증거 (재현 확인)

2026-09-02, 로컬 재현(`:8090`): 알려진 기본 시크릿으로 `{sub,username:'attacker',role:'admin'}` 서명 →
`GET /auth/whoami` (Bearer) 응답 `{"role":"admin","username":"attacker",...}` HTTP 200.
node·java 모두 동일 위조 토큰 수용(sub는 JWT 규격상 문자열). **양 스택 재현.**

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: 시크릿을 배포별 고엔트로피 난수로 강제(기본값·리포 커밋 금지), 서명 검증 필수이며 `alg:none` 거부,
만료·발급자(iss)·수신자(aud) 검증, 권한은 토큰 클레임이 아니라 서버 측 세션/DB 권위로 재확인.
