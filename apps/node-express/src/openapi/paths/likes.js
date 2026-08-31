const { AUTH, ref, rref, jsonOk, wrapped } = require('./_util');

const TAG = ['좋아요·위시리스트'];
const pidParam = [{ name: 'productId', in: 'path', required: true, schema: { type: 'integer' } }];
const toggleRes = jsonOk({
  type: 'object',
  properties: { liked: { type: 'boolean' }, likeCount: { type: 'integer' } },
});

module.exports = {
  '/likes': {
    get: {
      tags: TAG,
      summary: '위시리스트 조회',
      description: '`userId` 쿼리를 주면 그 사용자의 목록을 반환한다.',
      security: AUTH,
      parameters: [{ name: 'userId', in: 'query', schema: { type: 'integer' } }],
      responses: { 200: wrapped('products', { type: 'array', items: ref('Product') }), 401: rref('Unauthorized') },
    },
  },
  '/likes/{productId}': {
    post: {
      tags: TAG,
      summary: '찜 토글',
      security: AUTH,
      parameters: pidParam,
      responses: { 200: toggleRes, 401: rref('Unauthorized'), 404: rref('NotFound') },
    },
    delete: {
      tags: TAG,
      summary: '찜 해제',
      security: AUTH,
      parameters: pidParam,
      responses: { 200: toggleRes, 401: rref('Unauthorized') },
    },
  },
};
