# VULN-011 영수증 다운로드 경로 순회 (Path Traversal)

- 대상 스택: node-express, java-spring
- 심각도: High
- 분류: A01:2025 Broken Access Control (Path Traversal)

## 위치

- **node-express**: `apps/node-express/src/routes/orders.js`, `GET /api/orders/receipt/:filename` — `filename` 경로 파라미터를 정규화/검증 없이 `path.join(receiptsDir, filename)`으로 결합 후 `fs.readFile`.
- **java-spring**: `apps/java-spring/.../OrderController.java`, `GET /api/orders/receipt/{filename}` — 동일하게 `RECEIPTS_DIR.resolve(filename)`을 검증 없이 사용.

두 경우 모두 로그인 여부만 확인하고(소유권 검증 없음), `filename`에 `../` 시퀀스가 그대로 허용됨.

## 트리거 방법

```
GET /api/orders/receipt/..%2f..%2f..%2fapp%2f.env
GET /api/orders/receipt/..\..\..\..\etc\passwd
```

WAS 프로세스 권한으로 읽을 수 있는 임의 파일(환경변수 파일, 소스, 설정 등) 다운로드 가능.

## 영향

- 소유권 검증 부재 + `../` 순회로 앱 경계 밖 임의 파일 열람 — `.env`·소스·설정 등 유출(시크릿 노출 포함).

## 증거 (재현 확인)

(진단 단계에서 채움) — Phase 2(Burp 진단)에서 재현 예정.

## 조치 상태: 미조치 (의도된 취약점)
