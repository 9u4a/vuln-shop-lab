const { ref, wrapped } = require('./_util');

module.exports = {
  '/session': {
    get: {
      tags: ['세션'],
      summary: '현재 로그인 상태',
      description: '로그인하지 않았으면 `user: null`.',
      responses: {
        200: wrapped('user', { allOf: [ref('SessionUser')], nullable: true }),
      },
    },
  },
};
