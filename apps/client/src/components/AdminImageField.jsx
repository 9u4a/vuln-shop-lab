import { useRef, useState } from 'react';
import { useBackend } from '../BackendContext.jsx';
import { uploadImageAdmin } from '../api.js';

// 관리자 폼용 이미지 파일 업로드 필드. 업로드 후 반환된 filename을 value로 onChange 한다.
export default function AdminImageField({ label = '이미지', value, onChange }) {
  const { backend } = useBackend();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleFile(file) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const res = await uploadImageAdmin(backend.base, file);
      onChange(res.filename);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const src = value ? `${backend.uploadsBase}/${value}` : null;

  return (
    <div className="admin-image-field">
      <span className="admin-image-field__label">{label} (선택)</span>
      <div className="admin-image-field__row">
        {src && <img className="admin-image-field__preview" src={src} alt="" />}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ''; }}
        />
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? '업로드 중...' : (value ? '이미지 변경' : '이미지 업로드')}
        </button>
        {value && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange('')}>제거</button>
        )}
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
