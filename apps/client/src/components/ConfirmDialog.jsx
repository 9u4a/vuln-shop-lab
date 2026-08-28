import { useEffect } from 'react';

// 삭제 등 되돌릴 수 없는 동작 전 확인 모달. 네이티브 confirm 대신 사용(리디자인 정책).
export default function ConfirmDialog({
  open,
  title = '삭제하시겠어요?',
  message = '이 작업은 되돌릴 수 없습니다.',
  confirmLabel = '삭제',
  cancelLabel = '취소',
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onCancel?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal--confirm" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-label={title}>
        <div className="modal-header">
          <h2>{title}</h2>
        </div>
        {message && <p className="muted" style={{ marginBottom: 'var(--space-4)' }}>{message}</p>}
        <div className="confirm-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
