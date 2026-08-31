const { ref, jsonOk } = require('./_util');

module.exports = {
  '/addresses': {
    get: {
      tags: ['주소 검색'],
      summary: '주소 조회',
      description: '`q` 로 도로명·지번·우편번호를 검색한다(더미 주소록, 최대 30건).',
      parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }],
      responses: {
        200: jsonOk({
          type: 'object',
          properties: {
            addresses: { type: 'array', items: ref('Address') },
            total: { type: 'integer' },
          },
        }),
      },
    },
  },
};
