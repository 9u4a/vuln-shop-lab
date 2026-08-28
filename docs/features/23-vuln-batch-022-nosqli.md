# 23. 취약점 배치: VULN-022 NoSQL 인젝션(Mongo 활동 피드)

브랜치: `feature/vuln-batch-022-nosqli` · 관련 취약점: VULN-022

VULN-013~022 배치의 마지막. NoSQLi를 SQLite로 흉내 내지 않도록 없던 데이터스토어 클래스를 추가.

## 무엇을 만들었나
- `docker-compose.yml`에 `mongo` 서비스(`mongo:7`, 내부 전용, `mongo_data`). node-express에 `MONGO_URL` + `depends_on`.
- `apps/node-express/src/mongo.js` — `vulnshop.activity` 연결, 최초 기동 시 시드 사용자별 활동 문서 시드. `routes/activity.js` — `GET /api/activity`.
- 클라이언트 마이페이지 "최근 활동" 카드(node 백엔드 한정).

## VULN-022 — NoSQL 인젝션
- `activity.js`가 `req.query.username`을 그대로 `collection.find({username})`에 전달. `express.urlencoded({extended:true})`(qs)로 `?username[$ne]=x`가 `{username:{$ne:'x'}}` 연산자 필터가 됨. `requireAuth`는 있으나 소유권 검사가 없어 "내 활동"이 임의 사용자를 지정 → 전체 사용자 활동 노출. java 스택은 이 클래스 미포함.
