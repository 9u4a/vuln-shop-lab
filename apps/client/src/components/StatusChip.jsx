const LABELS = {
  pending: '결제 대기',
  paid: '결제 완료',
  confirmed: '결제 완료',
  preparing: '배송 준비 중',
  shipped: '배송 중',
  delivered: '배송 완료',
  cancelled: '취소됨',
  failed: '결제 실패',
  refunded: '환불됨',
};

export default function StatusChip({ status }) {
  const key = String(status || '').toLowerCase();
  return (
    <span className={`status-chip status-chip--${key}`}>
      {LABELS[key] || status || '알 수 없음'}
    </span>
  );
}
