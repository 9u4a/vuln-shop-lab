const { ref, rref, wrapped, jsonOk } = require('./_util');

module.exports = {
  '/auth/signup': {
    post: {
      tags: ['인증'],
      summary: '회원가입',
      description: '`username, password, name, phone, postcode, address` 필수. `addressDetail, referralCode` 선택. 최초 가입자는 `system_admin`.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['username', 'password', 'name', 'phone', 'postcode', 'address'],
              properties: {
                username: { type: 'string' },
                password: { type: 'string' },
                name: { type: 'string' },
                phone: { type: 'string' },
                postcode: { type: 'string' },
                address: { type: 'string' },
                addressDetail: { type: 'string' },
                referralCode: { type: 'string' },
              },
            },
            example: {
              username: 'alice', password: 'pw', name: '앨리스', phone: '010-0000-0000',
              postcode: '06236', address: '서울특별시 강남구 테헤란로 1',
            },
          },
        },
      },
      responses: {
        201: jsonOk(ref('Ok'), '생성됨'),
        400: rref('BadRequest'),
        409: jsonOk(ref('Error'), '아이디 중복'),
      },
    },
  },
  '/auth/login': {
    post: {
      tags: ['인증'],
      summary: '로그인',
      description: '성공 시 `Set-Cookie: connect.sid=...` 세션 쿠키 발급.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['username', 'password'],
              properties: { username: { type: 'string' }, password: { type: 'string' } },
            },
            example: { username: 'user1', password: 'user1' },
          },
        },
      },
      responses: {
        200: wrapped('user', ref('SessionUser'), '로그인 성공'),
        401: jsonOk(ref('Error'), '인증 실패'),
        403: jsonOk(ref('Error'), '비활성 계정'),
      },
    },
  },
  '/auth/logout': {
    post: {
      tags: ['인증'],
      summary: '로그아웃',
      description: '세션 파기.',
      responses: { 200: jsonOk(ref('Ok')) },
    },
  },
};
