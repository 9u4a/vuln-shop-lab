const { AUTH, ref, rref, jsonOk, wrapped } = require('./_util');

const TAG = ['프로필'];

module.exports = {
  '/profile': {
    get: {
      tags: TAG,
      summary: '내 프로필 조회',
      security: AUTH,
      responses: { 200: wrapped('profile', ref('Profile')), 401: rref('Unauthorized') },
    },
    put: {
      tags: TAG,
      summary: '내 프로필 수정',
      description: '본문의 `[a-z_]+` 키를 users 레코드 컬럼에 그대로 대입한다(`id` 제외).',
      security: AUTH,
      requestBody: {
        content: { 'application/json': { schema: { type: 'object', additionalProperties: true }, example: { bio: '소개', name: '이름' } } },
      },
      responses: { 200: wrapped('profile', ref('Profile')), 401: rref('Unauthorized') },
    },
  },
  '/profile/password': {
    put: {
      tags: TAG,
      summary: '비밀번호 변경',
      security: AUTH,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['currentPassword', 'newPassword'],
              properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string', minLength: 8 } },
            },
          },
        },
      },
      responses: { 200: jsonOk(ref('Ok')), 400: rref('BadRequest'), 401: rref('Unauthorized') },
    },
  },
  '/profile/verify-password': {
    post: {
      tags: TAG,
      summary: '비밀번호 재확인',
      security: AUTH,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object', required: ['password'], properties: { password: { type: 'string' } } } } },
      },
      responses: { 200: jsonOk(ref('Ok')), 401: rref('Unauthorized') },
    },
  },
  '/profile/avatar': {
    post: {
      tags: TAG,
      summary: '아바타 업로드',
      security: AUTH,
      requestBody: {
        required: true,
        content: { 'multipart/form-data': { schema: { type: 'object', properties: { avatar: { type: 'string', format: 'binary' } } } } },
      },
      responses: {
        200: jsonOk({ type: 'object', properties: { avatarUrl: { type: 'string' } } }),
        400: rref('BadRequest'),
        401: rref('Unauthorized'),
      },
    },
  },
};
