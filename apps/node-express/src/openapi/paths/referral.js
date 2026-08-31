const { AUTH, rref, jsonOk } = require('./_util');

const TAG = ['추천인'];

module.exports = {
  '/referral': {
    get: {
      tags: TAG,
      summary: '내 추천 코드·현황',
      security: AUTH,
      responses: {
        200: jsonOk({
          type: 'object',
          properties: {
            referralCode: { type: 'string', nullable: true },
            referredBy: { type: 'integer', nullable: true },
            referredCount: { type: 'integer' },
            reward: { type: 'integer' },
          },
        }),
        401: rref('Unauthorized'),
      },
    },
  },
  '/referral/apply': {
    post: {
      tags: TAG,
      summary: '추천 코드 적용',
      description: '멱등성·자기참조 검증 없이 매 호출마다 적립한다.',
      security: AUTH,
      requestBody: {
        content: { 'application/json': { schema: { type: 'object', properties: { code: { type: 'string' } } } } },
      },
      responses: {
        200: jsonOk({ type: 'object', properties: { ok: { type: 'boolean' }, reward: { type: 'integer' } } }),
        401: rref('Unauthorized'),
      },
    },
  },
};
