const XOR_KEY = 0x2a;

function giftCode(id, amount) {
  const payload = Buffer.from(`gc1|${id}|${amount}`, 'utf8');
  const transformed = Buffer.from(payload.map((b) => b ^ XOR_KEY));
  return 'GC-' + transformed.toString('base64url');
}

module.exports = { giftCode };
