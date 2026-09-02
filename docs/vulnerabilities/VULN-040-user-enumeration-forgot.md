# VULN-040 비밀번호 찾기 사용자 열거

- 대상 스택: node-express, java-spring (동일)
- 심각도: Medium
- 분류: A07:2025 Identification and Authentication Failures

## 위치

- `apps/node-express/src/routes/auth.js` — `POST /api/auth/forgot`가 계정이 있으면 `200 {ok:true, ...}`,
  없으면 `404 {error:"가입된 계정을 찾을 수 없습니다."}`로 **응답을 다르게** 준다.
- `apps/java-spring/.../controller/AuthController.java` — `/auth/forgot`가 `findByAccount`(아이디 또는 이메일)
  결과에 따라 `200` vs `404`로 동일하게 분기한다.

가입 여부가 상태코드·본문으로 그대로 드러나 계정 존재를 확인할 수 있다. `account`는 아이디와 이메일 모두
매칭하므로 이메일 주소의 가입 여부까지 확인된다.

## 트리거 방법

```
POST /api/{node,java}/auth/forgot  {"account":"user30"}          → 200 (존재)
POST /api/{node,java}/auth/forgot  {"account":"nosuchuser_xyz"}  → 404 (미존재)
POST /api/{node,java}/auth/forgot  {"account":"user31@vulnlab.local"} → 200 (이메일로도 존재 확인)
```

응답 차이를 대량 요청으로 반복하면 유효 아이디/이메일 목록을 수집할 수 있다.

## 영향

- 유효 계정 열거 → 크리덴셜 스터핑·표적 피싱의 사전 단계. [[VULN-039-weak-reset-token]](예측 토큰)과 결합하면
  열거로 모은 계정을 순차 탈취로 확대할 수 있다.

## 증거 (재현 확인)

2026-09-02, 로컬 재현(`:8090`): node·java 모두 존재 계정 `200`, 미존재 `404`.
java는 `user31@vulnlab.local`(이메일)로도 `200` — 이메일 가입 여부 확인. **양 스택 재현.**

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: 존재 여부와 무관하게 항상 동일한 200 응답("메일을 보냈다면 곧 도착합니다")을 반환하고,
발송은 비동기로 처리해 타이밍 차이도 최소화, forgot 엔드포인트에 레이트리밋 적용.
