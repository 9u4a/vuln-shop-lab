const { AUTH, ref, rref, jsonOk } = require('./_util');

module.exports = {
  '/points': {
    get: {
      tags: ['포인트'],
      summary: '적립금 잔액·원장',
      security: AUTH,
      responses: {
        200: jsonOk({
          type: 'object',
          properties: {
            balance: { type: 'integer' },
            transactions: { type: 'array', items: ref('PointTransaction') },
          },
        }),
        401: rref('Unauthorized'),
      },
    },
  },
};
