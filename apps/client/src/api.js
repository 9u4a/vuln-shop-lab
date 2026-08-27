async function apiRequest(base, path, options = {}) {
  const res = await fetch(`${base}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `요청에 실패했습니다 (${res.status})`);
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

export function signup(base, payload) {
  return apiRequest(base, '/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
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

export function updateProfile(base, patch) {
  return apiRequest(base, '/profile', {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

export function createOrder(base, items) {
  return apiRequest(base, '/orders', {
    method: 'POST',
    body: JSON.stringify({
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, optionValue: i.option || undefined })),
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

export function generateReceipt(base, orderId, note) {
  return apiRequest(base, `/orders/${orderId}/receipt`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export async function fetchReceipt(base, filename) {
  const res = await fetch(`${base}/orders/receipt/${filename}`, { credentials: 'include' });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `요청에 실패했습니다 (${res.status})`);
  }
  return res.text();
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

export function updateReview(base, productId, reviewId, rating, body) {
  return apiRequest(base, `/products/${productId}/reviews/${reviewId}`, {
    method: 'PUT',
    body: JSON.stringify({ rating, body }),
  });
}

export function deleteReview(base, productId, reviewId) {
  return apiRequest(base, `/products/${productId}/reviews/${reviewId}`, { method: 'DELETE' });
}

export function fetchAdminStats(base) {
  return apiRequest(base, '/admin/stats');
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

export function fetchFaqs(base, { q, page, pageSize } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (page) params.set('page', page);
  if (pageSize) params.set('pageSize', pageSize);
  const query = params.toString();
  return apiRequest(base, `/faqs${query ? `?${query}` : ''}`);
}

export function createFaq(base, question, answer) {
  return apiRequest(base, '/faqs', {
    method: 'POST',
    body: JSON.stringify({ question, answer }),
  });
}

export function deleteFaqAdmin(base, id) {
  return apiRequest(base, `/faqs/${id}`, { method: 'DELETE' });
}

export function fetchNotices(base, { q, page, pageSize } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (page) params.set('page', page);
  if (pageSize) params.set('pageSize', pageSize);
  const query = params.toString();
  return apiRequest(base, `/notices${query ? `?${query}` : ''}`);
}

export function createNoticeAdmin(base, title, body) {
  return apiRequest(base, '/notices', {
    method: 'POST',
    body: JSON.stringify({ title, body }),
  });
}

export function deleteNoticeAdmin(base, id) {
  return apiRequest(base, `/notices/${id}`, { method: 'DELETE' });
}

export async function uploadProductImageAdmin(base, productId, file) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`${base}/admin/products/${productId}/image`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `요청에 실패했습니다 (${res.status})`);
  }
  return data;
}

export function changePassword(base, currentPassword, newPassword) {
  return apiRequest(base, '/profile/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function verifyPassword(base, password) {
  return apiRequest(base, '/profile/verify-password', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export function importCartBackup(base, rawJson) {
  return apiRequest(base, '/cart/import', {
    method: 'POST',
    body: rawJson,
  });
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
    throw new Error(data?.error || `요청에 실패했습니다 (${res.status})`);
  }
  return data;
}
