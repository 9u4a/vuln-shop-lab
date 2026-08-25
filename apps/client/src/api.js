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

export function fetchProducts(base, q) {
  const query = q ? `?q=${encodeURIComponent(q)}` : '';
  return apiRequest(base, `/products${query}`);
}

export function fetchProduct(base, id) {
  return apiRequest(base, `/products/${id}`);
}
