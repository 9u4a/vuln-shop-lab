const { AUTH, rref, jsonOk } = require('./_util');

module.exports = {
  '/activity': {
    get: {
      tags: ['활동 피드'],
      summary: '활동 피드 (MongoDB)',
      description: '`username` 쿼리로 대상 사용자를 지정한다. Mongo 미가동 시 503.',
      security: AUTH,
      parameters: [{ name: 'username', in: 'query', schema: { type: 'string' } }],
      responses: {
        200: jsonOk({
          type: 'object',
          properties: {
            activity: {
              type: 'array',
              items: { type: 'object', properties: { username: { type: 'string' }, action: { type: 'string' }, at: { type: 'string' } } },
            },
          },
        }),
        401: rref('Unauthorized'),
        503: jsonOk({ $ref: '#/components/schemas/Error' }, 'Mongo 사용 불가'),
      },
    },
  },
};
