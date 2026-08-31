const { AUTH, rref, jsonOk } = require('./_util');

const TAG = ['재입고 알림'];
const subscription = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    productId: { type: 'integer' },
    productName: { type: 'string' },
    username: { type: 'string', description: '관리자 목록에서만' },
    notified: { type: 'boolean' },
    createdAt: { type: 'string' },
  },
};

module.exports = {
  '/restock': {
    post: {
      tags: TAG,
      summary: '재입고 알림 신청',
      description: '같은 상품 중복 신청은 무시된다.',
      security: AUTH,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object', properties: { productId: { type: 'integer' } } } } },
      },
      responses: {
        201: jsonOk({ type: 'object', properties: { id: { type: 'integer' }, already: { type: 'boolean' } } }, '신청됨'),
        401: rref('Unauthorized'),
        404: rref('NotFound'),
      },
    },
    get: {
      tags: TAG,
      summary: '전체 구독 목록 (관리자)',
      security: AUTH,
      responses: {
        200: jsonOk({ type: 'object', properties: { subscriptions: { type: 'array', items: subscription } } }),
        401: rref('Unauthorized'),
        403: rref('Forbidden'),
      },
    },
  },
  '/restock/mine': {
    get: {
      tags: TAG,
      summary: '내 재입고 알림 목록',
      security: AUTH,
      responses: {
        200: jsonOk({ type: 'object', properties: { subscriptions: { type: 'array', items: subscription } } }),
        401: rref('Unauthorized'),
      },
    },
  },
  '/restock/notify/{productId}': {
    post: {
      tags: TAG,
      summary: '재입고 알림 발송 (관리자)',
      description: '해당 상품 구독자를 notified 처리하고, 저장된 연동 웹훅으로 전달한다.',
      security: AUTH,
      parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: jsonOk({ type: 'object', properties: { ok: { type: 'boolean' }, notified: { type: 'integer' } } }),
        401: rref('Unauthorized'),
        403: rref('Forbidden'),
      },
    },
  },
};
