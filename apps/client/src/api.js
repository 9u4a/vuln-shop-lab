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

export function fetchProducts(base, { q, category, sort, gender, color, material, minPrice, maxPrice, inStock } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (category) params.set('category', category);
  if (sort) params.set('sort', sort);
  if (gender) params.set('gender', gender);
  if (color) params.set('color', color);
  if (material) params.set('material', material);
  if (minPrice) params.set('minPrice', minPrice);
  if (maxPrice) params.set('maxPrice', maxPrice);
  if (inStock) params.set('inStock', inStock);
  const query = params.toString();
  return apiRequest(base, `/products${query ? `?${query}` : ''}`);
}

export function fetchProduct(base, id) {
  return apiRequest(base, `/products/${id}`);
}

export function toggleLike(base, productId) {
  return apiRequest(base, `/likes/${productId}`, { method: 'POST' });
}

export function fetchWishlist(base, userId) {
  const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  return apiRequest(base, `/likes${qs}`);
}

export function fetchProfile(base) {
  return apiRequest(base, '/profile');
}

export function fetchActivity(base, username) {
  const qs = username ? `?username=${encodeURIComponent(username)}` : '';
  return apiRequest(base, `/activity${qs}`);
}

export function updateProfile(base, patch) {
  return apiRequest(base, '/profile', {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

export function createOrder(base, items, pointsUsed, { couponCode, shipping } = {}) {
  return apiRequest(base, '/orders', {
    method: 'POST',
    body: JSON.stringify({
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, optionValue: i.option || undefined })),
      pointsUsed: pointsUsed || 0,
      couponCode: couponCode || undefined,
      shipping: shipping || undefined,
    }),
  });
}

// 서버 장바구니
export function fetchCart(base) {
  return apiRequest(base, '/cart');
}
export function addCartItem(base, productId, quantity, optionValue) {
  return apiRequest(base, '/cart/items', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity, optionValue: optionValue || undefined }),
  });
}
export function updateCartItem(base, id, quantity) {
  return apiRequest(base, `/cart/items/${id}`, { method: 'PUT', body: JSON.stringify({ quantity }) });
}
export function removeCartItem(base, id) {
  return apiRequest(base, `/cart/items/${id}`, { method: 'DELETE' });
}
export function clearCart(base) {
  return apiRequest(base, '/cart', { method: 'DELETE' });
}

// 쿠폰 체크아웃 미리보기
export function previewCoupon(base, code, itemsTotal) {
  return apiRequest(base, '/coupons/apply-preview', {
    method: 'POST',
    body: JSON.stringify({ code, itemsTotal }),
  });
}

// 배송 조회 / 주문 공유
export function trackShipment(base, no) {
  return apiRequest(base, `/shipments/track?no=${encodeURIComponent(no)}`);
}
export function fetchSharedOrder(base, token) {
  return apiRequest(base, `/orders/shared/${encodeURIComponent(token)}`);
}
export function setOrderShipment(base, orderId, carrier) {
  return apiRequest(base, `/admin/orders/${orderId}/shipment`, {
    method: 'PUT',
    body: JSON.stringify({ carrier }),
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

function reviewFormData({ rating, body, secret, image }) {
  const fd = new FormData();
  fd.append('rating', rating);
  fd.append('body', body);
  fd.append('secret', secret ? 'true' : 'false');
  if (image) fd.append('image', image);
  return fd;
}

async function reviewRequest(url, method, payload) {
  const res = await fetch(url, { method, credentials: 'include', body: reviewFormData(payload) });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `요청에 실패했습니다 (${res.status})`);
  }
  return data;
}

export function createReview(base, productId, payload) {
  return reviewRequest(`${base}/products/${productId}/reviews`, 'POST', payload);
}

export function updateReview(base, productId, reviewId, payload) {
  return reviewRequest(`${base}/products/${productId}/reviews/${reviewId}`, 'PUT', payload);
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

export function updateAdminUser(base, userId, patch) {
  return apiRequest(base, `/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

export function updateOrderStatus(base, orderId, status) {
  return apiRequest(base, `/admin/orders/${orderId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export function toggleUserActive(base, userId, active) {
  return apiRequest(base, `/admin/users/${userId}/active`, {
    method: 'PUT',
    body: JSON.stringify({ active }),
  });
}

export function fetchLoginLogs(base, { username, success } = {}) {
  const params = new URLSearchParams();
  if (username) params.set('username', username);
  if (success === '0' || success === '1') params.set('success', success);
  const query = params.toString();
  return apiRequest(base, `/admin/login-logs${query ? `?${query}` : ''}`);
}

export function fetchAdminOrders(base) {
  return apiRequest(base, '/admin/orders');
}

export function fetchAdminUser(base, id) {
  return apiRequest(base, `/admin/users/${id}`);
}

export function fetchAdminOrder(base, id) {
  return apiRequest(base, `/admin/orders/${id}`);
}

export function createProductAdmin(base, product) {
  return apiRequest(base, '/admin/products', {
    method: 'POST',
    body: JSON.stringify(product),
  });
}

export function updateProductAdmin(base, id, product) {
  return apiRequest(base, `/admin/products/${id}`, {
    method: 'PUT',
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

export function updateFaqAdmin(base, id, question, answer) {
  return apiRequest(base, `/faqs/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ question, answer }),
  });
}

export function deleteFaqAdmin(base, id) {
  return apiRequest(base, `/faqs/${id}`, { method: 'DELETE' });
}

export function searchAddresses(base, q) {
  return apiRequest(base, `/addresses?q=${encodeURIComponent(q)}`);
}

export function fetchQuestions(base, { q, page, pageSize } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (page) params.set('page', page);
  if (pageSize) params.set('pageSize', pageSize);
  const query = params.toString();
  return apiRequest(base, `/qna${query ? `?${query}` : ''}`);
}

export function fetchQuestion(base, id) {
  return apiRequest(base, `/qna/${id}`);
}

export function createQuestion(base, { title, body, secret }) {
  return apiRequest(base, '/qna', {
    method: 'POST',
    body: JSON.stringify({ title, body, secret: !!secret }),
  });
}

export function answerQuestion(base, id, answer) {
  return apiRequest(base, `/qna/${id}/answer`, {
    method: 'PUT',
    body: JSON.stringify({ answer }),
  });
}

export function deleteQuestion(base, id) {
  return apiRequest(base, `/qna/${id}`, { method: 'DELETE' });
}

export function fetchNotices(base, { q, page, pageSize } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (page) params.set('page', page);
  if (pageSize) params.set('pageSize', pageSize);
  const query = params.toString();
  return apiRequest(base, `/notices${query ? `?${query}` : ''}`);
}

export function fetchNotice(base, id) {
  return apiRequest(base, `/notices/${id}`);
}

export function createNoticeAdmin(base, title, body, imageUrl) {
  return apiRequest(base, '/notices', {
    method: 'POST',
    body: JSON.stringify({ title, body, imageUrl: imageUrl || null }),
  });
}

export function updateNoticeAdmin(base, id, title, body, imageUrl) {
  return apiRequest(base, `/notices/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ title, body, imageUrl: imageUrl ?? null }),
  });
}

// 공용 관리자 이미지 업로드 — 반환된 filename을 imageUrl로 사용.
export async function uploadImageAdmin(base, file) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`${base}/admin/upload`, { method: 'POST', credentials: 'include', body: formData });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `요청에 실패했습니다 (${res.status})`);
  }
  return data;
}

export function fetchCoupons(base) {
  return apiRequest(base, '/coupons');
}

export function fetchMyCoupons(base) {
  return apiRequest(base, '/coupons/mine');
}

export function claimCoupon(base, id) {
  return apiRequest(base, `/coupons/${id}/claim`, { method: 'POST' });
}

export function fetchCouponsManage(base) {
  return apiRequest(base, '/coupons/manage');
}

export function createCoupon(base, coupon) {
  return apiRequest(base, '/coupons', { method: 'POST', body: JSON.stringify(coupon) });
}

export function updateCoupon(base, id, coupon) {
  return apiRequest(base, `/coupons/${id}`, { method: 'PUT', body: JSON.stringify(coupon) });
}

export function deleteCoupon(base, id) {
  return apiRequest(base, `/coupons/${id}`, { method: 'DELETE' });
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

export function fetchEvents(base) {
  return apiRequest(base, '/events');
}

export function fetchEvent(base, id) {
  return apiRequest(base, `/events/${id}`);
}

export function fetchEventsManage(base) {
  return apiRequest(base, '/events/manage');
}

export function createEvent(base, event) {
  return apiRequest(base, '/events', { method: 'POST', body: JSON.stringify(event) });
}

export function updateEvent(base, id, event) {
  return apiRequest(base, `/events/${id}`, { method: 'PUT', body: JSON.stringify(event) });
}

export function deleteEvent(base, id) {
  return apiRequest(base, `/events/${id}`, { method: 'DELETE' });
}

export function fetchPoints(base) {
  return apiRequest(base, '/points');
}

export function fetchReturns(base) {
  return apiRequest(base, '/returns/mine');
}

export function requestReturn(base, orderId, reason) {
  return apiRequest(base, '/returns', {
    method: 'POST',
    body: JSON.stringify({ orderId, reason }),
  });
}

export function fetchAdminReturns(base) {
  return apiRequest(base, '/returns');
}

export function approveReturn(base, id) {
  return apiRequest(base, `/returns/${id}/approve`, { method: 'PUT' });
}

export function rejectReturn(base, id) {
  return apiRequest(base, `/returns/${id}/reject`, { method: 'PUT' });
}

export function fetchReferral(base) {
  return apiRequest(base, '/referral');
}

export function applyReferral(base, code) {
  return apiRequest(base, '/referral/apply', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function subscribeRestock(base, productId) {
  return apiRequest(base, '/restock', {
    method: 'POST',
    body: JSON.stringify({ productId }),
  });
}

export function fetchMyRestock(base) {
  return apiRequest(base, '/restock/mine');
}

export function fetchAdminRestock(base) {
  return apiRequest(base, '/restock');
}

export function notifyRestock(base, productId) {
  return apiRequest(base, `/restock/notify/${productId}`, { method: 'POST' });
}

export function fetchAdminReferrals(base) {
  return apiRequest(base, '/admin/referrals');
}

export function testIntegrationWebhook(base, url) {
  return apiRequest(base, '/admin/integrations/webhook/test', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

export function fetchStoreSettings(base) {
  return apiRequest(base, '/admin/settings');
}

export function saveStoreSettings(base, patch) {
  return apiRequest(base, '/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
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

// 장바구니 공유 — 현재 장바구니를 공유 코드로 내보내고, 코드로 가져온다.
export function shareCart(base) {
  return apiRequest(base, '/cart/share');
}
export function importSharedCart(base, code) {
  return apiRequest(base, '/cart/import', {
    method: 'POST',
    body: JSON.stringify({ code }),
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
