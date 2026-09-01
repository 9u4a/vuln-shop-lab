const { AUTH, ref, rref, jsonOk, wrapped } = require('./_util');

const TAG = ['장바구니'];
const itemsRes = wrapped('items', { type: 'array', items: ref('CartItem') });
const idParam = [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }];

module.exports = {
  '/cart': {
    get: {
      tags: TAG,
      summary: '내 장바구니',
      security: AUTH,
      responses: { 200: itemsRes, 401: rref('Unauthorized') },
    },
    delete: {
      tags: TAG,
      summary: '장바구니 비우기',
      security: AUTH,
      responses: { 200: itemsRes, 401: rref('Unauthorized') },
    },
  },
  '/cart/items': {
    post: {
      tags: TAG,
      summary: '장바구니 담기',
      description: 'productId + optionValue가 같으면 수량을 합친다.',
      security: AUTH,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['productId'],
              properties: {
                productId: { type: 'integer' },
                quantity: { type: 'integer', default: 1 },
                optionValue: { type: 'string' },
              },
            },
          },
        },
      },
      responses: { 201: itemsRes, 401: rref('Unauthorized'), 404: rref('NotFound') },
    },
  },
  '/cart/share': {
    get: {
      tags: TAG,
      summary: '장바구니 공유 코드 생성',
      description: '현재 장바구니를 base64 공유 코드로 내보낸다.',
      security: AUTH,
      responses: {
        200: jsonOk({ type: 'object', properties: { code: { type: 'string' } } }),
        401: rref('Unauthorized'),
      },
    },
  },
  '/cart/import': {
    post: {
      tags: TAG,
      summary: '공유 코드로 장바구니 가져오기',
      description: '공유 코드를 디코드해 항목을 내 장바구니에 담는다.',
      security: AUTH,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object', required: ['code'], properties: { code: { type: 'string' } } },
          },
        },
      },
      responses: {
        200: jsonOk({ type: 'object', properties: { itemCount: { type: 'integer' }, items: { type: 'array', items: ref('CartItem') } } }),
        400: rref('BadRequest'),
        401: rref('Unauthorized'),
      },
    },
  },
  '/cart/items/{id}': {
    put: {
      tags: TAG,
      summary: '장바구니 수량 변경',
      description: 'quantity ≤ 0이면 항목 삭제.',
      security: AUTH,
      parameters: idParam,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object', properties: { quantity: { type: 'integer' } } } } },
      },
      responses: { 200: itemsRes, 401: rref('Unauthorized'), 404: rref('NotFound') },
    },
    delete: {
      tags: TAG,
      summary: '장바구니 항목 삭제',
      security: AUTH,
      parameters: idParam,
      responses: { 200: itemsRes, 401: rref('Unauthorized') },
    },
  },
};
