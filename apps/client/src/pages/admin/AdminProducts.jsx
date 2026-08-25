import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import {
  fetchProducts,
  createProductAdmin,
  deleteProductAdmin,
  uploadProductImageAdmin,
} from '../../api.js';

const emptyProduct = { name: '', description: '', price: '', imageUrl: '', category: '' };

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
      await createProductAdmin(backend.base, { ...newProduct, price: Number(newProduct.price) });
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
      setStatus('Image updated.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="card">
      <h2>Products</h2>
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
                <div className="product-thumb product-thumb-placeholder">No image</div>
              )}
              <div>{p.name}</div>
              <div className="product-price">${Number(p.price).toFixed(2)}</div>
              <label className="file-label">Upload image
                <input type="file" accept="image/*" onChange={(e) => handleImageChange(p.id, e)} />
              </label>
              <button onClick={() => handleDeleteProduct(p.id)}>Delete</button>
            </li>
          );
        })}
      </ul>
      <h2>Add product</h2>
      <form onSubmit={handleCreateProduct}>
        <label>Name
          <input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} required />
        </label>
        <label>Description
          <input value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
        </label>
        <label>Price
          <input type="number" step="0.01" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} required />
        </label>
        <label>Image URL (optional — or upload after creating)
          <input value={newProduct.imageUrl} onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })} />
        </label>
        <label>Category
          <input value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} />
        </label>
        <button type="submit" className="btn btn-primary">Add product</button>
      </form>
    </section>
  );
}
