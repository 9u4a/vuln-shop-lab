const { AUTH, ref, rref, jsonOk, wrapped } = require('./_util');

const TAG = ['공지사항'];
const idParam = [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }];
const noticeBody = {
  required: true,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: { title: { type: 'string' }, body: { type: 'string' }, imageUrl: { type: 'string' } },
      },
    },
  },
};

module.exports = {
  '/notices': {
    get: {
      tags: TAG,
      summary: '공지 목록',
      parameters: [
        { name: 'q', in: 'query', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10, maximum: 50 } },
      ],
      responses: {
        200: jsonOk({
          type: 'object',
          properties: {
            notices: { type: 'array', items: ref('Notice') },
            total: { type: 'integer' },
            page: { type: 'integer' },
            pageSize: { type: 'integer' },
          },
        }),
      },
    },
    post: {
      tags: TAG,
      summary: '공지 등록 (관리자)',
      security: AUTH,
      requestBody: noticeBody,
      responses: { 201: wrapped('notice', ref('Notice'), '생성됨'), 400: rref('BadRequest'), 401: rref('Unauthorized'), 403: rref('Forbidden') },
    },
  },
  '/notices/{id}': {
    get: {
      tags: TAG,
      summary: '공지 상세',
      parameters: idParam,
      responses: { 200: wrapped('notice', ref('Notice')), 404: rref('NotFound') },
    },
    put: {
      tags: TAG,
      summary: '공지 수정 (관리자)',
      security: AUTH,
      parameters: idParam,
      requestBody: noticeBody,
      responses: { 200: wrapped('notice', ref('Notice')), 401: rref('Unauthorized'), 403: rref('Forbidden'), 404: rref('NotFound') },
    },
    delete: {
      tags: TAG,
      summary: '공지 삭제 (관리자)',
      security: AUTH,
      parameters: idParam,
      responses: { 200: jsonOk(ref('Ok')), 401: rref('Unauthorized'), 403: rref('Forbidden'), 404: rref('NotFound') },
    },
  },
};
