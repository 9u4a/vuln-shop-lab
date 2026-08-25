export function formatCurrency(value) {
  const won = Math.round(Number(value) || 0);
  return `${won.toLocaleString('ko-KR')}원`;
}
