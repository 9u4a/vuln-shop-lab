// path 모듈 공용 헬퍼.
const AUTH = [{ sessionCookie: [] }];

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const rref = (name) => ({ $ref: `#/components/responses/${name}` });

// application/json 응답 본문.
const jsonOk = (schema, description = 'OK') => ({
  description,
  content: { 'application/json': { schema } },
});

// { key: <schema> } 형태의 래핑 응답(이 API의 관례).
const wrapped = (key, schema, description = 'OK') =>
  jsonOk({ type: 'object', properties: { [key]: schema } }, description);

module.exports = { AUTH, ref, rref, jsonOk, wrapped };
