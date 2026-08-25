# Vuln Shop — Client (React + Vite)

두 백엔드(Node/Express, Java/Spring)를 대상으로 공용으로 쓰는 프런트엔드입니다. 상단 셀렉터(또는 홈 화면)에서 대상 백엔드를 전환할 수 있습니다.

## 실행 (로컬)

```
npm install
npm run dev
```

기본적으로 http://localhost:5173 에서 실행되며, `/api/node/*`, `/api/java/*`를 각각 `http://localhost:3000`, `http://localhost:8081`로 프록시합니다(`vite.config.js`). 같은 오리진(5173)을 거치기 때문에 두 백엔드의 세션 쿠키가 CORS/SameSite 문제 없이 그대로 동작합니다.

Docker에서는 `NODE_BACKEND_URL`, `JAVA_BACKEND_URL` 환경변수로 프록시 대상을 바꿉니다(`docker-compose.yml`에서 서비스명으로 지정).

## 실행 (Docker)

전체를 함께 띄우려면 저장소 루트의 `docker compose up --build`를 사용하세요.
