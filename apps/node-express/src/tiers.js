// 회원 등급과 등급별 할인율.
const TIERS = ['basic', 'silver', 'gold', 'vip'];

const TIER_RATES = {
  basic: 0,
  silver: 0.03,
  gold: 0.05,
  vip: 0.1,
};

function tierRate(tier) {
  return TIER_RATES[tier] || 0;
}

module.exports = { TIERS, TIER_RATES, tierRate };
