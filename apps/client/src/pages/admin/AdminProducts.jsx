import { useEffect, useRef, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import {
  fetchProducts,
  createProductAdmin,
  updateProductAdmin,
  deleteProductAdmin,
  uploadProductImageAdmin,
} from '../../api.js';
import { formatCurrency } from '../../format.js';
import SafeImage from '../../components/SafeImage.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';

const emptyProduct = {
  name: '',
  description: '',
  price: '',
  imageUrl: '',
  category: '',
  brand: '',
  sku: '',
  gender: '',
  color: '',
  material: '',
  stock: '',
  optionName: '',
  optionValues: '',
};

// 목록 응답(camelCase, optionValues는 배열)을 폼 상태로 변환.
function toForm(product) {
  return {
    name: product.name ?? '',
    description: product.description ?? '',
    price: product.price ?? '',
    imageUrl: product.imageUrl ?? product.image_url ?? '',
    category: product.category ?? '',
    brand: product.brand ?? '',
    sku: product.sku ?? '',
    gender: product.gender ?? '',
    color: product.color ?? '',
    material: product.material ?? '',
    stock: product.stock ?? '',
    optionName: product.optionName ?? '',
    optionValues: Array.isArray(product.optionValues)
      ? product.optionValues.join(', ')
      : product.optionValues ?? '',
  };
}

// 생성/수정 공용으로 쓰는 상품 입력 필드.
function ProductFields({ value, onField }) {
  return (
    <>
      <label>이름
        <input value={value.name} onChange={onField('name')} required />
      </label>
      <label>설명
        <textarea value={value.description} onChange={onField('description')} rows="2" />
      </label>
      <label>가격 (원)
        <input type="number" step="1" min="0" value={value.price} onChange={onField('price')} required />
      </label>
      <label>카테고리
        <input value={value.category} onChange={onField('category')} placeholder="top / bottom / bag / hat / acc" />
      </label>
      <label>브랜드
        <input value={value.brand} onChange={onField('brand')} />
      </label>
      <label>상품코드 (SKU)
        <input value={value.sku} onChange={onField('sku')} />
      </label>
      <label>성별
        <input value={value.gender} onChange={onField('gender')} placeholder="남성 / 여성 / 공용" />
      </label>
      <label>컬러
        <input value={value.color} onChange={onField('color')} placeholder="블랙 / 화이트 …" />
      </label>
      <label>소재
        <input value={value.material} onChange={onField('material')} placeholder="코튼 / 데님 …" />
      </label>
      <label>재고
        <input type="number" min="0" value={value.stock} onChange={onField('stock')} />
      </label>
      <label>옵션명 (예: 색상)
        <input value={value.optionName} onChange={onField('optionName')} />
      </label>
      <label>옵션값 (쉼표로 구분)
        <input value={value.optionValues} onChange={onField('optionValues')} placeholder="빨강, 파랑, 검정" />
      </label>
    </>
  );
}

// 폼 상태를 API 페이로드로 변환.
function toPayload(form) {
  return {
    ...form,
    price: Math.round(Number(form.price)),
    stock: form.stock === '' ? undefined : Number(form.stock),
    optionValues: form.optionValues
      ? form.optionValues.split(',').map((v) => v.trim()).filter(Boolean)
      : undefined,
  };
}

function ProductRow({ product, uploadsBase, onOpen, onDelete }) {
  const imageUrl = product.imageUrl || product.image_url;
  return (
    <tr>
      <td>
        {imageUrl ? (
          <SafeImage
            className="product-thumb"
            style={{ width: 48, height: 48 }}
            src={`${uploadsBase}/${imageUrl}`}
            alt={product.name}
            placeholderClassName="product-thumb product-thumb-placeholder"
            placeholderText="없음"
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
        <div className="admin-item-row__actions">
          <button type="button" onClick={() => onOpen(product)}>상세/수정</button>
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
  const [pendingId, setPendingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState(null); // 상세/수정 대상 상품
  const [editForm, setEditForm] = useState(emptyProduct);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const uploadRef = useRef(null);

  function load() {
    setError(null);
    fetchProducts(backend.base).then((d) => setProducts(d.products)).catch((e) => setError(e.message));
  }

  useEffect(load, [backend.base]);

  const paged = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleCreateProduct(e) {
    e.preventDefault();
    setStatus(null);
    try {
      await createProductAdmin(backend.base, toPayload(newProduct));
      setNewProduct(emptyProduct);
      setShowForm(false);
      setStatus('상품이 추가되었습니다.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function openDetail(product) {
    setError(null);
    setStatus(null);
    setDetail(product);
    setEditForm(toForm(product));
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    try {
      await updateProductAdmin(backend.base, detail.id, toPayload(editForm));
      setStatus('상품이 수정되었습니다.');
      setDetail(null);
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

  async function handleUpload(file) {
    if (!detail) return;
    setError(null);
    try {
      const res = await uploadProductImageAdmin(backend.base, detail.id, file);
      setEditForm((f) => ({ ...f, imageUrl: res.imageUrl }));
      setStatus('이미지가 업데이트되었습니다.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const setNew = (field) => (e) => setNewProduct((p) => ({ ...p, [field]: e.target.value }));
  const setEdit = (field) => (e) => setEditForm((p) => ({ ...p, [field]: e.target.value }));
  const detailImage = editForm.imageUrl || (detail && (detail.imageUrl || detail.image_url));

  return (
    <>
      <section className="card">
        <div className="admin-toolbar">
          <h2>상품 <span className="muted">({products.length})</span></h2>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
            + 상품 추가
          </button>
        </div>
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
              {paged.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  uploadsBase={backend.uploadsBase}
                  onOpen={openDetail}
                  onDelete={setPendingId}
                />
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={products.length} onChange={setPage} />
      </section>

      <Modal open={showForm} title="상품 추가" onClose={() => setShowForm(false)} wide>
        <form onSubmit={handleCreateProduct} style={{ maxWidth: 'none' }}>
          <ProductFields value={newProduct} onField={setNew} />
          <label>이미지 URL (선택 — 저장 후 상세에서 파일 업로드 가능)
            <input value={newProduct.imageUrl} onChange={setNew('imageUrl')} />
          </label>
          <button type="submit" className="btn btn-primary">상품 추가</button>
        </form>
      </Modal>

      <Modal open={detail != null} title={detail ? `상품 #${detail.id} 상세` : ''} onClose={() => setDetail(null)} wide>
        {detail && (
          <form onSubmit={handleSaveEdit} style={{ maxWidth: 'none' }}>
            <div className="admin-detail__image">
              {detailImage ? (
                <SafeImage
                  className="product-thumb"
                  style={{ width: 96, height: 96 }}
                  src={`${backend.uploadsBase}/${detailImage}`}
                  alt={editForm.name}
                  placeholderClassName="product-thumb product-thumb-placeholder"
                  placeholderText="없음"
                />
              ) : (
                <div className="product-thumb product-thumb-placeholder" style={{ width: 96, height: 96 }}>없음</div>
              )}
              <input
                ref={uploadRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) handleUpload(file);
                  e.target.value = '';
                }}
              />
              <button type="button" onClick={() => uploadRef.current?.click()}>이미지 업로드</button>
            </div>
            <ProductFields value={editForm} onField={setEdit} />
            <div className="admin-item-row__actions">
              <button type="submit" className="btn btn-primary">저장</button>
              <button type="button" onClick={() => setDetail(null)}>닫기</button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={pendingId != null}
        title="상품을 삭제하시겠어요?"
        message="삭제한 상품은 되돌릴 수 없습니다."
        onConfirm={() => { handleDeleteProduct(pendingId); setPendingId(null); }}
        onCancel={() => setPendingId(null)}
      />
    </>
  );
}
