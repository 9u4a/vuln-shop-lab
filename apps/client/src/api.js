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

export function fetchFaqs(base) {
  return apiRequest(base, '/faqs');
}

export function createFaqAdmin(base, question, answer) {
  return apiRequest(base, '/faqs', {
    method: 'POST',
    body: JSON.stringify({ question, answer }),
  });
}

export function deleteFaqAdmin(base, id) {
  return apiRequest(base, `/faqs/${id}`, { method: 'DELETE' });
}

export function fetchNotices(base) {
  return apiRequest(base, '/notices');
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
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export function changePassword(base, currentPassword, newPassword) {
  return apiRequest(base, '/profile/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
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
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}
