import { useEffect, useRef, useState } from 'react';
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

function ProductRow({ product, uploadsBase, onUpload, onDelete }) {
  const inputRef = useRef(null);
  const imageUrl = product.imageUrl || product.image_url;
  return (
    <tr>
      <td>
        {imageUrl ? (
          <img
            className="product-thumb"
            style={{ width: 48, height: 48 }}
            src={`${uploadsBase}/${imageUrl}`}
            alt={product.name}
          />
        ) : (
          <div className="product-thumb product-thumb-placeholder" style={{ width: 48, height: 48, fontSize: '0.6rem' }}>없음</div>
        )}
      </td>
      <td>{product.name}</td>
      <td>{product.category || '-'}</td>
      <td className="tnum">{formatCurrency(product.price)}</td>
      <td className="tnum">{product.stock}</td>
      <td>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) onUpload(product.id, file);
            e.target.value = '';
          }}
        />
        <div className="admin-item-row__actions">
          <button type="button" onClick={() => inputRef.current?.click()}>이미지 업로드</button>
          <button type="button" onClick={() => onDelete(product.id)}>삭제</button>
        </div>
      </td>
    </tr>
  );
}

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
    setStatus(null);
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
      setStatus('상품이 추가되었습니다.');
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

  async function handleUpload(productId, file) {
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

  const set = (field) => (e) => setNewProduct((p) => ({ ...p, [field]: e.target.value }));

  return (
    <>
      <section className="card">
        <h2>상품 <span className="muted">({products.length})</span></h2>
        {error && <p className="error">{error}</p>}
        {status && <p className="status-ok">{status}</p>}
        <div className="admin-table__wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>이미지</th>
                <th>이름</th>
                <th>카테고리</th>
                <th className="tnum">가격</th>
                <th className="tnum">재고</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  uploadsBase={backend.uploadsBase}
                  onUpload={handleUpload}
                  onDelete={handleDeleteProduct}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>상품 추가</h2>
        <form onSubmit={handleCreateProduct} style={{ maxWidth: 'none' }}>
          <label>이름
            <input value={newProduct.name} onChange={set('name')} required />
          </label>
          <label>설명
            <textarea value={newProduct.description} onChange={set('description')} rows="2" />
          </label>
          <label>가격 (원)
            <input type="number" step="1" min="0" value={newProduct.price} onChange={set('price')} required />
          </label>
          <label>카테고리
            <input value={newProduct.category} onChange={set('category')} placeholder="accessories / displays / office" />
          </label>
          <label>브랜드
            <input value={newProduct.brand} onChange={set('brand')} />
          </label>
          <label>상품코드 (SKU)
            <input value={newProduct.sku} onChange={set('sku')} />
          </label>
          <label>재고
            <input type="number" min="0" value={newProduct.stock} onChange={set('stock')} />
          </label>
          <label>옵션명 (예: 색상)
            <input value={newProduct.optionName} onChange={set('optionName')} />
          </label>
          <label>옵션값 (쉼표로 구분)
            <input value={newProduct.optionValues} onChange={set('optionValues')} placeholder="빨강, 파랑, 검정" />
          </label>
          <label>이미지 URL (선택 — 추가 후 목록에서 파일 업로드 가능)
            <input value={newProduct.imageUrl} onChange={set('imageUrl')} />
          </label>
          <button type="submit" className="btn btn-primary">상품 추가</button>
        </form>
      </section>
    </>
  );
}
