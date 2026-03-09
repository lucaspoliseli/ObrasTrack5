import { API_URL } from '../config';

const TOKEN_KEY = 'planeja_obra_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function request(method, path, body = null, options = {}) {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const headers = { ...options.headers };
  if (!headers['Content-Type'] && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const config = {
    method,
    headers,
    ...options
  };
  if (body != null && !(body instanceof FormData)) {
    config.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    config.body = body;
    delete headers['Content-Type'];
  }

  const res = await fetch(url, config);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = { error: text || 'Erro desconhecido' };
  }

  if (!res.ok) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[API] Resposta não OK:', res.status, path, data);
    }
    if (res.status === 401) {
      setToken(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-logout'));
      }
    }
    const err = new Error(data?.error || data?.message || `HTTP ${res.status}`);
    err.code = data?.code;
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path)
};
