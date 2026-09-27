import type { Session } from './types';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8787/api/v1').replace(/\/$/, '');
const SESSION_KEY = 'chongxinzhi_admin_session_v1';

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 0, code = 'REQUEST_FAILED') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function loadSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.sessionStorage.getItem(SESSION_KEY);
    if (!value) return null;
    const session = JSON.parse(value) as Session;
    if (session.user?.role !== 'admin' || session.expiresAt <= Date.now()) return null;
    return session;
  } catch { return null; }
}

export function saveSession(session: Session | null) {
  if (typeof window === 'undefined') return;
  if (!session) window.sessionStorage.removeItem(SESSION_KEY);
  else window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.error?.message || '请求失败', response.status, body.error?.code);
  return body as T;
}

export async function adminLogin(email: string, password: string) {
  return api<Session>('/auth/admin-password', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export type AdminSetupStatus = {
  databaseConfigured: boolean;
  hasAdmin: boolean;
  setupAllowed: boolean;
  setupTokenConfigured: boolean;
};

export async function getAdminSetupStatus() {
  return api<AdminSetupStatus>('/auth/admin-setup-status');
}

export async function createFirstAdmin(value: {
  displayName: string;
  email: string;
  password: string;
  setupToken: string;
}) {
  return api<{ created: true; email: string }>('/auth/admin-setup', {
    method: 'POST',
    body: JSON.stringify(value)
  });
}

export { API_BASE };
