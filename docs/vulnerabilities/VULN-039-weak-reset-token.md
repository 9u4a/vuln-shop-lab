# VULN-039 비밀번호 재설정 토큰 예측 가능·무만료

- 대상 스택: node-express, java-spring (동일)
- 심각도: High
- 분류: A04:2025 Cryptographic Failures

## 위치

- `apps/node-express/src/routes/auth.js` — `POST /api/auth/forgot`가 재설정 토큰을
  `Buffer.from(String(user.id)).toString('base64')`로 생성해 `reset_token`에 저장하고, `POST /api/auth/reset`은
  `reset_token`으로 사용자를 찾아 만료(`reset_token_expires`)를 **검사하지 않고** 비밀번호를 교체한다.
- `apps/java-spring/.../service/AuthService.java` — `issueResetToken()`이
  `Base64.encode(String.valueOf(user.getId()))`로 동일하게 발급, `resetPassword()`가 만료 미검사로 교체.
  컨트롤러는 `apps/java-spring/.../controller/AuthController.java`의 `/auth/forgot`·`/auth/reset`.

토큰이 사용자 id의 base64일 뿐이라 완전히 예측 가능하고, `reset_token_expires`를 저장만 하고
재설정 시 확인하지 않아 사실상 무만료다. 랩 편의상 `forgot` 응답에 토큰을 그대로 반환하기도 한다.

## 트리거 방법

```
POST /api/{node,java}/auth/forgot   {"account":"user30"}
  → {"resetToken":"MzI="}           # MzI= == base64("32") == user30의 id
POST /api/{node,java}/auth/reset    {"token":"MzI=","newPassword":"hacked123"}
  → 200, 이후 user30 / hacked123 로 로그인 성공 (계정 탈취)
```

공격자는 대상의 id만 알면(또는 순차 추측) 토큰을 직접 구성할 수 있고, 한 번 발급된 토큰은 만료되지 않는다.

## 영향

- 임의 계정 탈취(ATO). 관리자 계정 id를 노리면 관리자 권한 탈취로 확대된다. 열거([[VULN-040-user-enumeration-forgot]])와
  결합하면 유효 계정을 모아 대량 탈취가 가능하다.

## 증거 (재현 확인)

2026-09-02, 로컬 재현(`:8090`, Toss 미설정):
- node: `forgot user30` → `resetToken="MzI="`(= base64 "32", user30 id). `reset` 200 →
  `login user30 / hacked123` → `{"user":{"id":32,"username":"user30","role":"user"}}` HTTP 200.
- java: `forgot user31` → `resetToken="MzM="`(= base64 "33", user31 id). `reset` 200 →
  `login user31 / hacked123` HTTP 200. **양 스택 재현.**

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: 토큰은 CSPRNG 난수(≥128비트)로 발급하고 DB에는 해시로만 저장, 짧은 만료를 재설정 시 강제,
1회용(사용 후 폐기), 응답으로 토큰을 노출하지 않고 등록된 메일로만 발송.
