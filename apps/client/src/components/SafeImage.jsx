import { useState, useEffect } from 'react';

// 이미지 로드 실패 시 플레이스홀더로 대체하는 공용 <img>.
// src가 없거나 onError가 나면 "이미지 준비 중" 자리표시를 보여준다.
export default function SafeImage({ src, alt = '', className = '', placeholderClassName = 'image-ph', placeholderText = '이미지 준비 중', ...rest }) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  if (!src || broken) {
    return <span className={placeholderClassName} aria-label={alt || undefined}>{placeholderText}</span>;
  }

  return <img src={src} alt={alt} className={className} onError={() => setBroken(true)} {...rest} />;
}
