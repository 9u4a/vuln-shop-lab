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

sink 코드 자체는 `filename`을 검증 없이 `path.join`/`resolve`하므로, `../`가 그대로 전달되면 WAS 권한의
임의 파일을 읽는다.

**재현 제약(중요)**: 현재 2계층 배포(nginx `:8090` → WAS)에서는 documented 페이로드가 **그대로 재현되지
않는다.** nginx가 URI를 정규화(`%2f`→`/`, `../` 병합/제거)한 뒤 프록시하므로, 라우트 핸들러에는 순회가
사라진 경로(`/orders/package.json` 등)만 도달한다(로컬 확인: 정상 `receipt_<id>.txt` 다운로드는 200,
`%2e%2e%2f`/`%252e…`/역슬래시 변형은 모두 404). WAS 직접 포트(`:3000`/`:8081`)로 치면 프레임워크가
`%2f`를 세그먼트 내부로 보존해 순회가 성립하지만, 세션 쿠키가 `Secure`라 plain-http 직접 포트에서는
로그인 세션이 실리지 않아(그리고 이 라우트는 `requireAuth`) 인증이 막힌다 — 즉 배포 형상 때문에 실질
재현이 어렵다.

## 영향

- 소유권 검증 부재 + `../` 순회로 앱 경계 밖 임의 파일 열람이 코드상 가능 — `.env`·소스·설정 등 유출.
  단 위 배포 제약으로 현재 형상에서는 직접 재현이 막혀 있다(정상 구현으로 고칠 때도 이 sink는 그대로 위험).

## 증거 (재현 확인)

2026-09-01, 로컬 확인(`:8090`, `user1` 로그인): 정상 `GET /orders/receipt/receipt_92.txt` → 200(파일 내용
반환). 순회 시도 `..%2f..%2fpackage.json`·`%2e%2e%2f…`·`..%5c..%5c…`·`%252e%252e%252f…`는 모두 404
(nginx 경로 정규화로 sink에 순회 미도달). java도 `..%2f…` 404. **재현 제약: 배포 형상(nginx 정규화 +
직접포트 Secure 쿠키)으로 문서 페이로드는 현재 재현되지 않음.**

## 조치 상태: 미조치 (의도된 취약점)
