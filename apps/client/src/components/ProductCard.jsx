import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { useCart } from '../CartContext.jsx';
import { useToast } from '../ToastContext.jsx';
import { formatCurrency } from '../format.js';
import LikeButton from './LikeButton.jsx';

export default function ProductCard({ product }) {
  const { backend } = useBackend();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [imgBroken, setImgBroken] = useState(false);

  const rawImage = product.imageUrl || product.image_url;
  const src = rawImage ? `${backend.uploadsBase}/${rawImage}` : null;
  const soldOut = Number(product.stock) === 0;

  function handleAdd() {
    addItem(product);
    showToast('장바구니에 담았어요');
  }

  return (
    <li className="product-card">
      <Link to={`/products/${product.id}`} className="product-card__media">
        {src && !imgBroken ? (
          <img src={src} alt={product.name} loading="lazy" onError={() => setImgBroken(true)} />
        ) : (
          <span className="product-card__ph">이미지 준비 중</span>
        )}
        {soldOut && <span className="product-card__soldout">품절</span>}
        <LikeButton product={product} className="product-card__like" />
      </Link>
      {product.brand && <span className="product-card__brand">{product.brand}</span>}
      <Link to={`/products/${product.id}`} className="product-card__name">{product.name}</Link>
      <span className="product-card__price tnum">{formatCurrency(product.price)}</span>
      <button type="button" className="btn btn-ghost btn-sm product-card__add" onClick={handleAdd} disabled={soldOut}>
        {soldOut ? '품절' : '장바구니 담기'}
      </button>
    </li>
  );
}
