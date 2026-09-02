# 52. API 토큰(JWT)

브랜치: `feature/auth-token-batch` · 관련 취약점: [VULN-042](../vulnerabilities/VULN-042-jwt-weak-secret.md)

## 무엇을 만들었나

- 외부 연동·모바일용 **Bearer 토큰(JWT)** 발급. 마이페이지 **"API 토큰"** 탭에서 발급/복사.
- 서버: `POST /api/auth/token`(로그인 세션 필요 → `{sub, username, role}` 클레임 JWT 발급),
  `GET /api/auth/whoami`(`Authorization: Bearer <JWT>` 클레임 반환). 양 스택 동일.
- 의존성: node `jsonwebtoken`, java `io.jsonwebtoken:jjwt-*` (그린필드 — 기존 JWT 사용처 전무).
  서명 시크릿은 node `.env.example` `JWT_SECRET`, java `application.yml` `app.jwt.secret`
  (미설정 시 동일 기본값). `spring-boot-starter-security`는 추가하지 않음(전면 수동 세션 설계 유지).

## 설계 판단

- Swagger로 API 명세까지 공개(기능 43)한 마당에 세션 쿠키 외 토큰 인증 수단을 얹는 건 자연스러운 다음 수순.
  세션 인증은 그대로 두고 토큰 경로를 병행 추가했다.
- 검증 시크릿을 리포지토리에 담긴 **알려진 기본값**으로 두어(배포자가 `JWT_SECRET`을 덮지 않으면 그대로 사용)
  토큰 위조가 성립한다(VULN-042). docker-compose는 `JWT_SECRET`을 주입하지 않아 랩에선 기본값이 쓰인다.

## 이후 변경

- 정상화 시: 시크릿을 배포별 고엔트로피 난수로 강제(기본값 사용 금지), 서명 검증 필수(`alg:none` 거부),
  토큰 만료·수신자(aud)·발급자(iss) 검증, 필요 시 키 로테이션.
