const projectRoot = (() => {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const frontendIndex = parts.indexOf('Frontend');
  if (frontendIndex <= 0) return '';
  return '/' + parts.slice(0, frontendIndex).join('/');
})();

export const API_BASE = `${window.location.origin}${projectRoot}/Backend/public/api/v1`;

let csrfTokenCache = null;

async function parseResponse(response) {
  if (response.status === 204 || response.status === 304) {
    return { ok: response.ok, status: response.status, data: null, headers: response.headers };
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error?.message || `Request failed with status ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.payload = payload;
    throw err;
  }

  return { ok: true, status: response.status, data: payload?.data ?? null, headers: response.headers };
}

export async function ensureCsrfToken() {
  if (csrfTokenCache) return csrfTokenCache;
  const response = await fetch(`${API_BASE}/auth/csrf`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  const parsed = await parseResponse(response);
  csrfTokenCache = parsed.data?.csrfToken ?? null;
  return csrfTokenCache;
}

export async function apiFetch(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = await ensureCsrfToken();
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers,
    body,
  });

  return parseResponse(response);
}
