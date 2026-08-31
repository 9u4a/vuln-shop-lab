const { AUTH, ref, rref, jsonOk, wrapped } = require('./_util');

const TAG = ['이벤트'];
const idParam = [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }];
const eventBody = {
  required: true,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          body: { type: 'string' },
          imageUrl: { type: 'string' },
          linkUrl: { type: 'string' },
          active: { type: 'boolean' },
          startsAt: { type: 'string' },
          endsAt: { type: 'string' },
        },
      },
    },
  },
};

module.exports = {
  '/events': {
    get: {
      tags: TAG,
      summary: '진행 중 이벤트 목록',
      description: '`active=1` 이고 노출기간 내인 이벤트만.',
      responses: { 200: wrapped('events', { type: 'array', items: ref('Event') }) },
    },
    post: {
      tags: TAG,
      summary: '이벤트 등록 (관리자)',
      security: AUTH,
      requestBody: eventBody,
      responses: { 201: wrapped('event', ref('Event'), '생성됨'), 400: rref('BadRequest'), 401: rref('Unauthorized'), 403: rref('Forbidden') },
    },
  },
  '/events/manage': {
    get: {
      tags: TAG,
      summary: '전체 이벤트 목록 (관리자)',
      description: '상태·기간 무관 전체.',
      security: AUTH,
      responses: { 200: wrapped('events', { type: 'array', items: ref('Event') }), 401: rref('Unauthorized'), 403: rref('Forbidden') },
    },
  },
  '/events/{id}': {
    get: {
      tags: TAG,
      summary: '이벤트 상세',
      parameters: idParam,
      responses: { 200: wrapped('event', ref('Event')), 404: rref('NotFound') },
    },
    put: {
      tags: TAG,
      summary: '이벤트 수정 (관리자)',
      security: AUTH,
      parameters: idParam,
      requestBody: eventBody,
      responses: { 200: wrapped('event', ref('Event')), 401: rref('Unauthorized'), 403: rref('Forbidden'), 404: rref('NotFound') },
    },
    delete: {
      tags: TAG,
      summary: '이벤트 삭제 (관리자)',
      security: AUTH,
      parameters: idParam,
      responses: { 200: jsonOk(ref('Ok')), 401: rref('Unauthorized'), 403: rref('Forbidden'), 404: rref('NotFound') },
    },
  },
};
