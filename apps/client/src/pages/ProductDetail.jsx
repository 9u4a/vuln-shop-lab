import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { useCart } from '../CartContext.jsx';
import { fetchProduct } from '../api.js';

export default function ProductDetail() {
  const { backend } = useBackend();
  const { addItem } = useCart();
  const { id } = useParams();
  const [product, setProduct] = useState(null);

  useEffect(() => {
    setProduct(null);
    fetchProduct(backend.base, id).then((data) => setProduct(data.product));
  }, [backend.base, id]);

  if (!product) return <p>Loading...</p>;

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p>Price: ${Number(product.price).toFixed(2)}</p>
      <button onClick={() => addItem(product)}>Add to cart</button>
      <Link to="/products">Back to products</Link>
    </div>
  );
}
