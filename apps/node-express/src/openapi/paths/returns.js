const { AUTH, ref, rref, jsonOk, wrapped } = require('./_util');

const TAG = ['반품·환불'];
const idParam = [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }];

module.exports = {
  '/returns': {
    post: {
      tags: TAG,
      summary: '반품/환불 요청',
      description: '주문 소유자·상태를 검증하지 않는다.',
      security: AUTH,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object', properties: { orderId: { type: 'integer' }, reason: { type: 'string' } } },
          },
        },
      },
      responses: {
        201: jsonOk({ type: 'object', properties: { id: { type: 'integer' }, status: { type: 'string' } } }, '접수됨'),
        401: rref('Unauthorized'),
        404: rref('NotFound'),
      },
    },
    get: {
      tags: TAG,
      summary: '전체 반품 목록 (관리자)',
      security: AUTH,
      responses: { 200: wrapped('returns', { type: 'array', items: ref('ReturnRequest') }), 401: rref('Unauthorized'), 403: rref('Forbidden') },
    },
  },
  '/returns/mine': {
    get: {
      tags: TAG,
      summary: '내 반품 목록',
      security: AUTH,
      responses: { 200: wrapped('returns', { type: 'array', items: ref('ReturnRequest') }), 401: rref('Unauthorized') },
    },
  },
  '/returns/{id}/approve': {
    put: {
      tags: TAG,
      summary: '반품 승인·환불 (관리자)',
      description: '이미 환불된 건도 재승인된다.',
      security: AUTH,
      parameters: idParam,
      responses: {
        200: jsonOk({ type: 'object', properties: { ok: { type: 'boolean' }, status: { type: 'string' }, refundAmount: { type: 'integer' } } }),
        401: rref('Unauthorized'),
        403: rref('Forbidden'),
        404: rref('NotFound'),
      },
    },
  },
  '/returns/{id}/reject': {
    put: {
      tags: TAG,
      summary: '반품 거절 (관리자)',
      security: AUTH,
      parameters: idParam,
      responses: {
        200: jsonOk({ type: 'object', properties: { ok: { type: 'boolean' }, status: { type: 'string' } } }),
        401: rref('Unauthorized'),
        403: rref('Forbidden'),
        404: rref('NotFound'),
      },
    },
  },
};
