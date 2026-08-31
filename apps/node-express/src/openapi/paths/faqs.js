const { AUTH, ref, rref, jsonOk, wrapped } = require('./_util');

const TAG = ['FAQ'];
const idParam = [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }];
const faqBody = {
  required: true,
  content: {
    'application/json': {
      schema: { type: 'object', properties: { question: { type: 'string' }, answer: { type: 'string' } } },
    },
  },
};

module.exports = {
  '/faqs': {
    get: {
      tags: TAG,
      summary: 'FAQ 목록',
      parameters: [
        { name: 'q', in: 'query', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10, maximum: 50 } },
      ],
      responses: {
        200: jsonOk({
          type: 'object',
          properties: {
            faqs: { type: 'array', items: ref('Question') },
            total: { type: 'integer' },
            page: { type: 'integer' },
            pageSize: { type: 'integer' },
          },
        }),
      },
    },
    post: {
      tags: TAG,
      summary: 'FAQ 등록 (관리자)',
      security: AUTH,
      requestBody: faqBody,
      responses: { 201: wrapped('faq', ref('Question'), '생성됨'), 400: rref('BadRequest'), 401: rref('Unauthorized'), 403: rref('Forbidden') },
    },
  },
  '/faqs/{id}': {
    put: {
      tags: TAG,
      summary: 'FAQ 수정 (관리자)',
      security: AUTH,
      parameters: idParam,
      requestBody: faqBody,
      responses: { 200: wrapped('faq', ref('Question')), 401: rref('Unauthorized'), 403: rref('Forbidden'), 404: rref('NotFound') },
    },
    delete: {
      tags: TAG,
      summary: 'FAQ 삭제 (관리자)',
      security: AUTH,
      parameters: idParam,
      responses: { 200: jsonOk(ref('Ok')), 401: rref('Unauthorized'), 403: rref('Forbidden'), 404: rref('NotFound') },
    },
  },
};
