const { AUTH, ref, rref, jsonOk, wrapped } = require('./_util');

const TAG = ['상품'];

const reviewMultipart = {
  required: true,
  content: {
    'multipart/form-data': {
      schema: {
        type: 'object',
        properties: {
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          body: { type: 'string' },
          secret: { type: 'string', description: "'true' 또는 '1'이면 비밀글" },
          image: { type: 'string', format: 'binary' },
        },
      },
    },
  },
};

module.exports = {
  '/products': {
    get: {
      tags: TAG,
      summary: '상품 목록·검색',
      parameters: [
        { name: 'q', in: 'query', schema: { type: 'string' }, description: '상품명 검색어' },
        { name: 'category', in: 'query', schema: { type: 'string' } },
        { name: 'sort', in: 'query', schema: { type: 'string' }, description: 'reviews, likes 는 앱 레벨 정렬' },
        { name: 'gender', in: 'query', schema: { type: 'string' } },
        { name: 'color', in: 'query', schema: { type: 'string' } },
        { name: 'material', in: 'query', schema: { type: 'string' } },
        { name: 'minPrice', in: 'query', schema: { type: 'integer' } },
        { name: 'maxPrice', in: 'query', schema: { type: 'integer' } },
        { name: 'inStock', in: 'query', schema: { type: 'string', enum: ['1', 'true'] } },
      ],
      responses: {
        200: wrapped('products', { type: 'array', items: ref('Product') }),
        400: rref('BadRequest'),
      },
    },
  },
  '/products/{id}': {
    get: {
      tags: TAG,
      summary: '상품 상세',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: { 200: wrapped('product', ref('Product')), 404: rref('NotFound') },
    },
  },
  '/products/{id}/reviews': {
    get: {
      tags: TAG,
      summary: '상품 후기 목록',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: { 200: wrapped('reviews', { type: 'array', items: ref('Review') }) },
    },
    post: {
      tags: TAG,
      summary: '후기 작성',
      security: AUTH,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: reviewMultipart,
      responses: {
        201: wrapped('review', ref('Review'), '생성됨'),
        400: rref('BadRequest'),
        401: rref('Unauthorized'),
        404: rref('NotFound'),
      },
    },
  },
  '/products/{id}/reviews/{reviewId}': {
    put: {
      tags: TAG,
      summary: '후기 수정',
      description: '소유권을 검증하지 않는다.',
      security: AUTH,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        { name: 'reviewId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      requestBody: reviewMultipart,
      responses: { 200: wrapped('review', ref('Review')), 401: rref('Unauthorized'), 404: rref('NotFound') },
    },
    delete: {
      tags: TAG,
      summary: '후기 삭제',
      description: '소유권을 검증하지 않는다.',
      security: AUTH,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        { name: 'reviewId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: { 204: { description: '삭제됨' }, 401: rref('Unauthorized'), 404: rref('NotFound') },
    },
  },
};
