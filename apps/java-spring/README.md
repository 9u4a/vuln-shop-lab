# Vuln Shop — Java / Spring Boot (API)

의도적으로 취약점을 심어 둔 미니 쇼핑몰의 백엔드 API입니다 (Node.js/Express 버전과 동일한 시나리오, 개발 → 진단 → 조치 → 관제 워크플로우의 1단계 산출물). UI는 `apps/client/`(React)에서 이 API를 호출하며, 전체 개요·실행법·취약점 목록은 [저장소 루트 README](../../README.md)를 참고하세요.

## 실행 (로컬)

```
mvn spring-boot:run
```

기본적으로 http://localhost:8081 에서 실행됩니다. 첫 실행 시 `data/app.mv.db`(H2 파일 DB)에 스키마와 샘플 상품 데이터가 자동 생성됩니다.

## 실행 (Docker)

이 앱만 단독으로 띄우려면:

```
docker build -t vulnshop-java .
docker run -p 8081:8081 vulnshop-java
```

전체(client 포함)를 함께 띄우려면 저장소 루트의 `docker compose up --build`를 사용하세요.

## API

세션 쿠키 기반 인증. `APP_CORS_ALLOWED_ORIGIN`(기본 `http://localhost:5173`)에 대해 `allowCredentials: true`로 CORS 허용.

- `POST /api/auth/signup` — `{ username, password }`
- `POST /api/auth/login` — `{ username, password }`
- `POST /api/auth/logout`
- `GET /api/session` — 현재 로그인 사용자
- `GET /api/products?q=` — 목록/검색
- `GET /api/products/{id}` — 상세

취약점 명세는 `docs/vulnerabilities/`(프로젝트 루트)에 ID별로 정리되어 이 코드에 반영되어 있습니다. 익스플로잇 성공 여부는 별도 플래그가 아니라, 해당 취약점 문서에 기록된 재현 절차로 확인합니다(예: 실제 민감 데이터 추출 여부).
