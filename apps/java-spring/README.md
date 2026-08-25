# Vuln Shop — Java / Spring Boot (API)

의도적으로 취약점을 심을 예정인 미니 쇼핑몰의 백엔드 API입니다 (Node.js/Express 버전과 동일한 시나리오, 개발 → 진단 → 조치 → 관제 워크플로우의 1단계 산출물). UI는 `apps/client/`(React)에서 이 API를 호출합니다.

## 실행 (로컬)

```
mvn spring-boot:run
```

기본적으로 http://localhost:8081 에서 실행됩니다. 첫 실행 시 `data/app.mv.db`(H2 파일 DB)에 스키마와 샘플 상품 데이터가 자동 생성됩니다.

## 실행 (Docker)

이 앱만 단독으로 띄우려면:

```
docker build -t vulnshop-java .
docker run -p 8081:8081 -e FLAG_DEMO="FLAG{demo_setup_ok}" vulnshop-java
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

## 플래그

시작 시 `FLAG_` 접두사가 붙은 환경변수를 읽어 `flags` 테이블에 시드합니다(`FlagSeeder`). 콘솔에 `Seeded N flag(s) from environment`가 찍히면 정상 동작한 것입니다.

아직 의도적인 취약점은 심지 않은 상태입니다. 취약점은 `docs/vulnerabilities/`(프로젝트 루트)에 명세가 추가되는 대로 이 코드에 반영됩니다.
