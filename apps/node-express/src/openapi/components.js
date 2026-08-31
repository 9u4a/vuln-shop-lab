// OpenAPI components — 스키마·시큐리티 스킴·공용 응답.
// 스키마는 각 라우트의 toX() 매퍼가 내보내는 JSON 모양을 기준으로 한다(인벤토리 수준).

const schemas = {
  Error: {
    type: 'object',
    properties: { error: { type: 'string' } },
  },
  Ok: {
    type: 'object',
    properties: { ok: { type: 'boolean', example: true } },
  },
  SessionUser: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      username: { type: 'string' },
      role: { type: 'string', enum: ['user', 'admin', 'system_admin'] },
    },
  },
  Product: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      name: { type: 'string' },
      description: { type: 'string', nullable: true },
      price: { type: 'integer', description: 'KRW 정수' },
      imageUrl: { type: 'string', nullable: true },
      category: { type: 'string', nullable: true },
      brand: { type: 'string', nullable: true },
      sku: { type: 'string', nullable: true },
      gender: { type: 'string', nullable: true },
      color: { type: 'string', nullable: true },
      material: { type: 'string', nullable: true },
      stock: { type: 'integer' },
      optionName: { type: 'string', nullable: true },
      optionValues: { type: 'array', items: { type: 'string' } },
      reviewCount: { type: 'integer' },
      likeCount: { type: 'integer' },
      liked: { type: 'boolean' },
      createdAt: { type: 'string' },
    },
  },
  Review: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      userId: { type: 'integer' },
      username: { type: 'string' },
      rating: { type: 'integer', minimum: 1, maximum: 5 },
      body: { type: 'string' },
      imageUrl: { type: 'string', nullable: true },
      secret: { type: 'boolean' },
      createdAt: { type: 'string' },
    },
  },
  Order: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      status: { type: 'string', enum: ['pending', 'paid', 'failed'] },
      totalAmount: { type: 'integer' },
      webhookUrl: { type: 'string', nullable: true },
      tossOrderId: { type: 'string' },
      createdAt: { type: 'string' },
    },
  },
  OrderItem: {
    type: 'object',
    properties: {
      productId: { type: 'integer' },
      productName: { type: 'string' },
      quantity: { type: 'integer' },
      unitPrice: { type: 'integer' },
      optionValue: { type: 'string', nullable: true },
    },
  },
  Profile: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      username: { type: 'string' },
      role: { type: 'string' },
      bio: { type: 'string', nullable: true },
      avatarUrl: { type: 'string', nullable: true },
      name: { type: 'string' },
      phone: { type: 'string' },
      postcode: { type: 'string' },
      address: { type: 'string' },
      addressDetail: { type: 'string', nullable: true },
      createdAt: { type: 'string' },
    },
  },
  Coupon: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      code: { type: 'string' },
      title: { type: 'string' },
      description: { type: 'string', nullable: true },
      discountType: { type: 'string', enum: ['amount', 'percent'] },
      discountValue: { type: 'integer' },
      minOrderAmount: { type: 'integer' },
      active: { type: 'boolean' },
      expiresAt: { type: 'string', nullable: true },
      claimed: { type: 'boolean', description: '로그인 시에만 포함' },
      createdAt: { type: 'string' },
    },
  },
  Notice: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      title: { type: 'string' },
      body: { type: 'string' },
      imageUrl: { type: 'string', nullable: true },
      createdAt: { type: 'string' },
    },
  },
  Event: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      title: { type: 'string' },
      body: { type: 'string', nullable: true },
      imageUrl: { type: 'string', nullable: true },
      linkUrl: { type: 'string', nullable: true },
      active: { type: 'boolean' },
      startsAt: { type: 'string', nullable: true },
      endsAt: { type: 'string', nullable: true },
      createdAt: { type: 'string' },
    },
  },
  Question: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      userId: { type: 'integer' },
      title: { type: 'string' },
      body: { type: 'string' },
      secret: { type: 'boolean' },
      authorUsername: { type: 'string', nullable: true },
      answer: { type: 'string', nullable: true },
      answeredBy: { type: 'string', nullable: true },
      answeredAt: { type: 'string', nullable: true },
      createdAt: { type: 'string' },
    },
  },
  PointTransaction: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      amount: { type: 'integer', description: '적립 +, 사용 -' },
      reason: { type: 'string' },
      orderId: { type: 'integer', nullable: true },
      createdAt: { type: 'string' },
    },
  },
  ReturnRequest: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      orderId: { type: 'integer' },
      userId: { type: 'integer' },
      username: { type: 'string' },
      reason: { type: 'string', nullable: true },
      status: { type: 'string', enum: ['requested', 'refunded', 'rejected'] },
      refundAmount: { type: 'integer' },
      createdAt: { type: 'string' },
    },
  },
  Address: {
    type: 'object',
    properties: {
      zonecode: { type: 'string' },
      address: { type: 'string' },
      roadAddress: { type: 'string' },
      jibunAddress: { type: 'string' },
    },
  },
};

const securitySchemes = {
  sessionCookie: {
    type: 'apiKey',
    in: 'cookie',
    name: 'connect.sid',
    description: '로그인(`POST /auth/login`) 시 발급되는 express-session 쿠키.',
  },
};

// 공용 응답 — 오퍼레이션에서 $ref로 참조.
const responses = {
  Unauthorized: {
    description: '로그인 필요',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
  Forbidden: {
    description: '권한 부족 (관리자 전용)',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
  NotFound: {
    description: '대상 없음',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
  BadRequest: {
    description: '잘못된 요청',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
};

module.exports = { schemas, securitySchemes, responses };
