# 07. 로그인 후 세션 동기화 버그 수정 + 접속 토스트

브랜치: `fix/session-sync-and-toast`

## 무엇을 만들었나
- 버그: 상단바 로그인 상태(`user`)가 `Layout` 로컬 state에 있고 `backend.base`에만 의존하는 effect로 1회만 fetch돼, 로그인 후 `/`로 이동해도 네비가 갱신되지 않았다("마이프로필쪽 안보이는데?", "로그인해도 login 창 그대로").
- 수정: `SessionContext` 신설 — `user`를 중앙 보관(`backend.base` 키), `setUser`/`logout` 노출. `Login`이 응답으로 `setUser`를 즉시 호출해 네비가 곧바로 갱신.
- 접속 토스트: 로그인 성공 시 "{username}님 접속하였습니다." `ToastContext` 신설(우상단, 4.5초 자동 소멸).

## 설계 판단
- `SessionContext`/`ToastContext`는 이후 전 기능이 공유하는 기반이 됨(33까지 사용).
