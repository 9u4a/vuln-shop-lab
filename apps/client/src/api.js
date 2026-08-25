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

export function fetchProfile(base) {
  return apiRequest(base, '/profile');
}

export function updateProfile(base, bio) {
  return apiRequest(base, '/profile', {
    method: 'PUT',
    body: JSON.stringify({ bio }),
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
