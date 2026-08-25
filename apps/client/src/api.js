async function apiRequest(base, path, options = {}) {
  const res = await fetch(`${base}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export function fetchSession(base) {
  return apiRequest(base, '/session');
}

export function login(base, username, password) {
  return apiRequest(base, '/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function signup(base, username, password) {
  return apiRequest(base, '/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function logout(base) {
  return apiRequest(base, '/auth/logout', { method: 'POST' });
}

export function fetchProducts(base, { q, category, sort } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (category) params.set('category', category);
  if (sort) params.set('sort', sort);
  const query = params.toString();
  return apiRequest(base, `/products${query ? `?${query}` : ''}`);
}

export function fetchProduct(base, id) {
  return apiRequest(base, `/products/${id}`);
}

export function fetchProfile(base) {
  return apiRequest(base, '/profile');
}

export function updateProfile(base, bio) {
  return apiRequest(base, '/profile', {
    method: 'PUT',
    body: JSON.stringify({ bio }),
  });
}

export function createOrder(base, items, webhookUrl) {
  return apiRequest(base, '/orders', {
    method: 'POST',
    body: JSON.stringify({
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      webhookUrl: webhookUrl || undefined,
    }),
  });
}

export function fetchOrders(base) {
  return apiRequest(base, '/orders');
}

export function fetchOrder(base, id) {
  return apiRequest(base, `/orders/${id}`);
}

export function confirmOrder(base, id, paymentKey, amount) {
  return apiRequest(base, `/orders/${id}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ paymentKey, amount }),
  });
}

export function fetchReviews(base, productId) {
  return apiRequest(base, `/products/${productId}/reviews`);
}

export function createReview(base, productId, rating, body) {
  return apiRequest(base, `/products/${productId}/reviews`, {
    method: 'POST',
    body: JSON.stringify({ rating, body }),
  });
}

export function fetchAdminUsers(base) {
  return apiRequest(base, '/admin/users');
}

export function updateUserRole(base, userId, role) {
  return apiRequest(base, `/admin/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

export function fetchAdminOrders(base) {
  return apiRequest(base, '/admin/orders');
}

export function createProductAdmin(base, product) {
  return apiRequest(base, '/admin/products', {
    method: 'POST',
    body: JSON.stringify(product),
  });
}

export function deleteProductAdmin(base, id) {
  return apiRequest(base, `/admin/products/${id}`, { method: 'DELETE' });
}

export async function uploadAvatar(base, file) {
  const formData = new FormData();
  formData.append('avatar', file);
  const res = await fetch(`${base}/profile/avatar`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}
