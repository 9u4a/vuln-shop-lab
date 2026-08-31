const { AUTH, ref, rref, jsonOk, wrapped } = require('./_util');

const TAG = ['Q&A 문의'];
const idParam = [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }];

module.exports = {
  '/qna': {
    get: {
      tags: TAG,
      summary: '문의 목록',
      parameters: [
        { name: 'q', in: 'query', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10, maximum: 50 } },
      ],
      responses: {
        200: jsonOk({
          type: 'object',
          properties: {
            questions: { type: 'array', items: ref('Question') },
            total: { type: 'integer' },
            page: { type: 'integer' },
            pageSize: { type: 'integer' },
          },
        }),
      },
    },
    post: {
      tags: TAG,
      summary: '문의 작성',
      security: AUTH,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { title: { type: 'string' }, body: { type: 'string' }, secret: { type: 'boolean' } },
            },
          },
        },
      },
      responses: { 201: wrapped('question', ref('Question'), '생성됨'), 400: rref('BadRequest'), 401: rref('Unauthorized') },
    },
  },
  '/qna/{id}': {
    get: {
      tags: TAG,
      summary: '문의 상세',
      description: '비밀글도 본문을 반환한다.',
      parameters: idParam,
      responses: { 200: wrapped('question', ref('Question')), 404: rref('NotFound') },
    },
    delete: {
      tags: TAG,
      summary: '문의 삭제 (작성자 또는 관리자)',
      security: AUTH,
      parameters: idParam,
      responses: { 200: jsonOk(ref('Ok')), 401: rref('Unauthorized'), 403: rref('Forbidden'), 404: rref('NotFound') },
    },
  },
  '/qna/{id}/answer': {
    put: {
      tags: TAG,
      summary: '문의 답변 (관리자)',
      security: AUTH,
      parameters: idParam,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object', properties: { answer: { type: 'string' } } } } },
      },
      responses: { 200: wrapped('question', ref('Question')), 400: rref('BadRequest'), 401: rref('Unauthorized'), 403: rref('Forbidden'), 404: rref('NotFound') },
    },
  },
};
