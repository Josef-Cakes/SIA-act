const LOCAL_BACKEND_ORIGIN = 'http://localhost:8080';
const RENDER_BACKEND_ORIGIN = 'https://sia-act.onrender.com';

export const BACKEND_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ||
  (import.meta.env.PROD ? RENDER_BACKEND_ORIGIN : LOCAL_BACKEND_ORIGIN);

export function buildBackendUrl(path = '') {
  if (!path) return BACKEND_ORIGIN;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/')) return `${BACKEND_ORIGIN}${path}`;
  return `${BACKEND_ORIGIN}/${path}`;
}