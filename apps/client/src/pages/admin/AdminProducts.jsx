import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import {
  fetchProducts,
  createProductAdmin,
  deleteProductAdmin,
  uploadProductImageAdmin,
} from '../../api.js';
import { formatCurrency } from '../../format.js';

const emptyProduct = {
  name: '',
  description: '',
  price: '',
  imageUrl: '',
  category: '',
  brand: '',
  sku: '',
  stock: '',
  optionName: '',
  optionValues: '',
};

export default function AdminProducts() {
  const { backend } = useBackend();
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState(emptyProduct);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  function load() {
    setError(null);
    fetchProducts(backend.base).then((d) => setProducts(d.products)).catch((e) => setError(e.message));
  }

  useEffect(load, [backend.base]);

  async function handleCreateProduct(e) {
    e.preventDefault();
    try {
      await createProductAdmin(backend.base, {
        ...newProduct,
        price: Math.round(Number(newProduct.price)),
        stock: newProduct.stock === '' ? undefined : Number(newProduct.stock),
        optionValues: newProduct.optionValues
          ? newProduct.optionValues.split(',').map((v) => v.trim()).filter(Boolean)
          : undefined,
      });
      setNewProduct(emptyProduct);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteProduct(id) {
    try {
      await deleteProductAdmin(backend.base, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleImageChange(productId, e) {
    const file = e.target.files[0];
    if (!file) return;
    setError(null);
    setStatus(null);
    try {
      await uploadProductImageAdmin(backend.base, productId, file);
      setStatus('이미지가 업데이트되었습니다.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="card">
      <h2>상품</h2>
      {error && <p className="error">{error}</p>}
      {status && <p className="status-ok">{status}</p>}
      <ul className="product-grid">
        {products.map((p) => {
          const imageUrl = p.imageUrl || p.image_url;
          return (
            <li key={p.id}>
              {imageUrl ? (
                <img className="product-thumb" src={`${backend.uploadsBase}/${imageUrl}`} alt={p.name} />
              ) : (
                <div className="product-thumb product-thumb-placeholder">이미지 없음</div>
              )}
              <div>{p.name}</div>
              <div className="product-price">{formatCurrency(p.price)}</div>
              <label className="file-label">이미지 업로드
                <input type="file" accept="image/*" onChange={(e) => handleImageChange(p.id, e)} />
              </label>
              <button onClick={() => handleDeleteProduct(p.id)}>삭제</button>
            </li>
          );
        })}
      </ul>
      <h2>상품 추가</h2>
      <form onSubmit={handleCreateProduct}>
        <label>이름
          <input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} required />
        </label>
        <label>설명
          <input value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
        </label>
        <label>가격 (원)
          <input type="number" step="1" min="0" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} required />
        </label>
        <label>이미지 URL (선택 — 생성 후 업로드 가능)
          <input value={newProduct.imageUrl} onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })} />
        </label>
        <label>카테고리
          <input value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} />
        </label>
        <label>브랜드
          <input value={newProduct.brand} onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })} />
        </label>
        <label>상품코드 (SKU)
          <input value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} />
        </label>
        <label>재고
          <input type="number" min="0" value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })} />
        </label>
        <label>옵션명 (예: 색상)
          <input value={newProduct.optionName} onChange={(e) => setNewProduct({ ...newProduct, optionName: e.target.value })} />
        </label>
        <label>옵션값 (쉼표로 구분)
          <input value={newProduct.optionValues} onChange={(e) => setNewProduct({ ...newProduct, optionValues: e.target.value })} placeholder="빨강, 파랑, 검정" />
        </label>
        <button type="submit" className="btn btn-primary">상품 추가</button>
      </form>
    </section>
  );
}
