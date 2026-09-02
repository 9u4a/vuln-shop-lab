# 50. 비밀번호 재설정

브랜치: `feature/auth-token-batch` · 관련 취약점: [VULN-039](../vulnerabilities/VULN-039-weak-reset-token.md), [VULN-040](../vulnerabilities/VULN-040-user-enumeration-forgot.md)

## 무엇을 만들었나

- 로그인 화면에 **"비밀번호를 잊으셨나요?"** 링크 추가. 공개 페이지 두 개:
  `/forgot-password`(아이디/이메일 입력 → 재설정 토큰 발급), `/reset-password`(토큰+새 비밀번호).
- 서버: `POST /api/auth/forgot`(아이디 또는 이메일로 사용자 조회 → `reset_token` 발급),
  `POST /api/auth/reset`(토큰으로 사용자 찾아 새 비밀번호 저장). 양 스택 동일.
- `users`/`User`에 `email`, `reset_token`, `reset_token_expires` 컬럼 신규(기존 email 컬럼 자체가 없었음).
  회원가입에 선택 **이메일** 입력 추가. 데모 계정은 시드에서 `username@vulnlab.local`로 채운다.
- 메일 서버가 없는 랩이라 발급 토큰을 응답으로 바로 안내(포워드-투-리셋).

## 설계 판단

- 비밀번호 **변경**(마이페이지, 현재 비번 재확인)만 있고 **찾기/재설정** 플로우가 없어, 실제 서비스라면
  당연히 있어야 할 계정 복구 경로를 추가했다. 새 비번 규칙(최소 8자)은 기존 변경 플로우와 동일하게 맞췄다.
- 토큰 발급/검증은 인증·토큰 계열 취약점을 얹는 자리다(아래). 정상 조치안은 정상 구현 절 참고.

## 이후 변경

- 정상화 시: 토큰을 CSPRNG 난수로 발급하고 해시로 저장, 짧은 만료 강제, 재설정 응답을 존재 여부와
  무관하게 동일화(열거 차단), 토큰은 응답으로 노출하지 않고 등록된 메일로만 발송.
