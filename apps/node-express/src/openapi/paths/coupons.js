const { AUTH, ref, rref, jsonOk, wrapped } = require('./_util');

const TAG = ['쿠폰'];
const idParam = [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }];
const couponBody = {
  required: true,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          discountType: { type: 'string', enum: ['amount', 'percent'] },
          discountValue: { type: 'integer' },
          minOrderAmount: { type: 'integer' },
          active: { type: 'boolean' },
          expiresAt: { type: 'string' },
        },
      },
    },
  },
};

module.exports = {
  '/coupons': {
    get: {
      tags: TAG,
      summary: '발급 가능한 쿠폰 목록',
      description: '로그인 시 `claimed` 포함.',
      responses: { 200: wrapped('coupons', { type: 'array', items: ref('Coupon') }) },
    },
    post: {
      tags: TAG,
      summary: '쿠폰 생성 (관리자)',
      security: AUTH,
      requestBody: couponBody,
      responses: { 201: wrapped('coupon', ref('Coupon'), '생성됨'), 400: rref('BadRequest'), 401: rref('Unauthorized'), 403: rref('Forbidden') },
    },
  },
  '/coupons/mine': {
    get: {
      tags: TAG,
      summary: '내 쿠폰함',
      security: AUTH,
      responses: { 200: wrapped('coupons', { type: 'array', items: ref('Coupon') }), 401: rref('Unauthorized') },
    },
  },
  '/coupons/manage': {
    get: {
      tags: TAG,
      summary: '전체 쿠폰 목록 (관리자)',
      security: AUTH,
      responses: { 200: wrapped('coupons', { type: 'array', items: ref('Coupon') }), 401: rref('Unauthorized'), 403: rref('Forbidden') },
    },
  },
  '/coupons/{id}/claim': {
    post: {
      tags: TAG,
      summary: '쿠폰 받기',
      description: '중복 발급을 제한하지 않는다.',
      security: AUTH,
      parameters: idParam,
      responses: {
        201: jsonOk({ type: 'object', properties: { userCouponId: { type: 'integer' }, coupon: ref('Coupon') } }, '발급됨'),
        401: rref('Unauthorized'),
        404: rref('NotFound'),
      },
    },
  },
  '/coupons/{id}': {
    put: {
      tags: TAG,
      summary: '쿠폰 수정 (관리자)',
      security: AUTH,
      parameters: idParam,
      requestBody: couponBody,
      responses: { 200: wrapped('coupon', ref('Coupon')), 401: rref('Unauthorized'), 403: rref('Forbidden'), 404: rref('NotFound') },
    },
    delete: {
      tags: TAG,
      summary: '쿠폰 삭제 (관리자)',
      security: AUTH,
      parameters: idParam,
      responses: { 200: jsonOk(ref('Ok')), 401: rref('Unauthorized'), 403: rref('Forbidden'), 404: rref('NotFound') },
    },
  },
};
