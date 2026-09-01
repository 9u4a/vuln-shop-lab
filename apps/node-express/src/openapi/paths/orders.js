const { AUTH, ref, rref, jsonOk, wrapped } = require('./_util');

const TAG = ['주문'];
const idParam = [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }];

module.exports = {
  '/orders': {
    get: {
      tags: TAG,
      summary: '내 주문 목록',
      security: AUTH,
      responses: { 200: wrapped('orders', { type: 'array', items: ref('Order') }), 401: rref('Unauthorized') },
    },
    post: {
      tags: TAG,
      summary: '주문 생성',
      description: '가격은 서버가 계산한다. 체크아웃 시 재고 차감·쿠폰 적용·배송지 스냅샷이 함께 처리된다.',
      security: AUTH,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['items'],
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      productId: { type: 'integer' },
                      quantity: { type: 'integer' },
                      optionValue: { type: 'string' },
                    },
                  },
                },
                pointsUsed: { type: 'integer' },
                webhookUrl: { type: 'string' },
                couponCode: { type: 'string', description: '보유한 쿠폰 코드' },
                shipping: {
                  type: 'object',
                  description: '생략하면 프로필 주소를 사용',
                  properties: {
                    name: { type: 'string' },
                    phone: { type: 'string' },
                    postcode: { type: 'string' },
                    address: { type: 'string' },
                    addressDetail: { type: 'string' },
                  },
                },
              },
            },
            example: { items: [{ productId: 1, quantity: 1 }], couponCode: 'WELCOME5000' },
          },
        },
      },
      responses: {
        201: jsonOk({
          type: 'object',
          properties: {
            orderId: { type: 'integer' },
            tossOrderId: { type: 'string' },
            amount: { type: 'integer' },
            discountAmount: { type: 'integer' },
            pointsUsed: { type: 'integer' },
            pointsEarned: { type: 'integer' },
            shareToken: { type: 'string' },
          },
        }, '생성됨'),
        400: rref('BadRequest'),
        401: rref('Unauthorized'),
      },
    },
  },
  '/orders/shared/{token}': {
    get: {
      tags: TAG,
      summary: '주문 공유 링크 조회 (비회원)',
      description: '공유 토큰만으로 주문·배송을 읽기 전용 열람한다.',
      parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: jsonOk(ref('SharedOrder')), 404: rref('NotFound') },
    },
  },
  '/orders/{id}': {
    get: {
      tags: TAG,
      summary: '주문 상세 (주문 + 항목)',
      security: AUTH,
      parameters: idParam,
      responses: {
        200: jsonOk({ type: 'object', properties: { order: ref('Order'), items: { type: 'array', items: ref('OrderItem') }, shipment: ref('Shipment') } }),
        401: rref('Unauthorized'),
        404: rref('NotFound'),
      },
    },
  },
  '/orders/{id}/confirm': {
    post: {
      tags: TAG,
      summary: '결제 확인 (TossPayments)',
      description: '`TOSS_SECRET_KEY` 미설정 시 501.',
      security: AUTH,
      parameters: idParam,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object', properties: { paymentKey: { type: 'string' }, amount: { type: 'integer' } } },
          },
        },
      },
      responses: {
        200: jsonOk({ type: 'object', properties: { ok: { type: 'boolean' }, order: ref('Order') } }),
        400: rref('BadRequest'),
        401: rref('Unauthorized'),
        404: rref('NotFound'),
        501: jsonOk(ref('Error'), '결제 미설정'),
        502: jsonOk(ref('Error'), '결제 확인 실패'),
      },
    },
  },
  '/orders/{id}/receipt': {
    post: {
      tags: TAG,
      summary: '영수증 파일 생성',
      description: '서버에 `receipt_<id>.txt` 를 만들고 파일명을 반환한다. `note` 선택.',
      security: AUTH,
      parameters: idParam,
      requestBody: {
        content: { 'application/json': { schema: { type: 'object', properties: { note: { type: 'string' } } } } },
      },
      responses: {
        201: jsonOk({ type: 'object', properties: { filename: { type: 'string' } } }, '생성됨'),
        401: rref('Unauthorized'),
        404: rref('NotFound'),
      },
    },
  },
  '/orders/{id}/receipt/print': {
    get: {
      tags: TAG,
      summary: '인쇄용 영수증 (HTML)',
      security: AUTH,
      parameters: [
        ...idParam,
        { name: 'note', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'HTML 문서', content: { 'text/html': { schema: { type: 'string' } } } },
        401: rref('Unauthorized'),
        404: rref('NotFound'),
      },
    },
  },
  '/orders/receipt/{filename}': {
    get: {
      tags: TAG,
      summary: '영수증 파일 다운로드 (text/plain)',
      security: AUTH,
      parameters: [{ name: 'filename', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: '영수증 텍스트', content: { 'text/plain': { schema: { type: 'string' } } } },
        401: rref('Unauthorized'),
        404: rref('NotFound'),
      },
    },
  },
};
