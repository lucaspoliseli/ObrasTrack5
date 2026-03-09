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

  let res;
  let text = '';
  try {
    res = await fetch(url, config);
    text = await res.text();
  } catch (fetchErr) {
    console.error('[API] Fetch falhou (rede/CORS/URL):', fetchErr);
    console.error('[API] URL:', url, 'método:', method);
    throw fetchErr;
  }

  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = { error: text || 'Resposta não é JSON' };
  }

  if (!res.ok) {
    const errorMessage = data?.error || data?.errorDetail || data?.message || (text && text.length < 300 ? text : null) || `HTTP ${res.status}`;
    console.error('[API] Resposta não OK:', { method, url, status: res.status, body: text });
    if (res.status === 401) {
      setToken(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-logout'));
      }
    }
    const err = new Error(errorMessage);
    err.code = data?.code;
    err.status = res.status;
    err.responseBody = text;
    err.responseStatus = res.status;
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
