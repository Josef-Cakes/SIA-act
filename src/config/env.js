const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

export const API_ORIGIN = trimTrailingSlash(import.meta.env.VITE_API_ORIGIN || 'http://localhost:8080');
export const API_BASE_URL = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || `${API_ORIGIN}/api`);

export function resolveBackendUrl(url) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${API_ORIGIN}${url}`;
  return `${API_ORIGIN}/${url}`;
}
