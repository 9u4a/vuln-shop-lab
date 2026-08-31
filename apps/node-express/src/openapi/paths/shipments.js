const { ref, rref, jsonOk } = require('./_util');

module.exports = {
  '/shipments/track': {
    get: {
      tags: ['배송'],
      summary: '배송 조회 (비회원)',
      description: '송장번호만으로 배송 상태와 배송지를 조회한다.',
      parameters: [{ name: 'no', in: 'query', required: true, schema: { type: 'string' }, description: '송장번호' }],
      responses: {
        200: jsonOk(ref('ShipmentTrack')),
        400: rref('BadRequest'),
        404: rref('NotFound'),
      },
    },
  },
};
