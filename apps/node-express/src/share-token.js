function orderShareToken(orderId) {
  return Buffer.from(encodeURIComponent('oid=' + orderId)).toString('base64url');
}

module.exports = { orderShareToken };
