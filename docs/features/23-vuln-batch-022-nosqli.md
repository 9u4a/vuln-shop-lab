# Vulnerability batch: VULN-022 NoSQL injection (Mongo-backed activity feed)

Branch: `feature/vuln-batch-022-nosqli` (stacked on `feature/vuln-batch-019-java-injection`, not yet merged)

Final branch of the VULN-013–022 batch. Adds the one datastore class the architecture
was missing so NoSQLi can be covered without faking it against SQLite.

## What was added

- `docker-compose.yml` — new `mongo` service (`mongo:7`, internal only, `mongo_data` volume);
  `node-express` gets `MONGO_URL=mongodb://mongo:27017` and `depends_on: [mongo]`.
- `apps/node-express/package.json` — `mongodb` ^7.6.0 (lockfile updated).
- `apps/node-express/src/mongo.js` — connects to `vulnshop.activity`, seeds one login/search/
  order/review activity doc per seed user on first boot.
- `apps/node-express/src/routes/activity.js` — `GET /api/activity`, mounted in `server.js`.
- `apps/client/src/pages/mypage/MyPageProfile.jsx` + `api.js` `fetchActivity()` — a "최근 활동"
  card on My Page, node backend only (`backendKey === 'node'`).

## VULN-022 — NoSQL injection

`activity.js` passes the raw `req.query.username` into `collection.find({ username })`. With
`express.urlencoded({ extended: true })` (qs), `?username[$ne]=x` arrives as
`{ username: { $ne: 'x' } }` and becomes an operator filter. `requireAuth` is enforced but
there is no ownership check — "my activity" lets the client name any user.

`GET /api/node/activity?username[$ne]=zzz` returns every user's activity (login times,
search terms, order ids). Java stack untouched — this class lives only in the Mongo feature.

Doc: `docs/vulnerabilities/VULN-022-nosql-injection-activity.md`.

## Verification

- Node: `node -c` on `mongo.js`, `routes/activity.js`, `server.js`.
- `docker compose up -d mongo node-express nginx`:
  - `GET /api/node/activity` (as `user3`) → only user3's docs.
  - `GET /api/node/activity?username[$ne]=zzz` (as `user3`) → `9u4a`, `admin`, `user1`,
    `user2` docs in the response.
  - My Page "최근 활동" renders on the node backend, absent on java.
