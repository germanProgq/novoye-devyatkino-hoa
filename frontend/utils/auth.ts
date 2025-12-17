export type UserRole = 'admin' | 'user';

export type SessionUser = {
  username: string;
  role: UserRole;
};

export type RegistrationResult = {
  user: SessionUser;
  password: string;
  displayName?: string;
  house?: string;
  apartment?: string;
};

type SessionMeta = {
  accessExpiresIn?: number;
  refreshExpiresIn?: number;
};

const SESSION_STORAGE_KEY = 'hoa_session_user';
const API_BASE_URL = (
  import.meta.env.VITE_BACKEND_URL
    ? String(import.meta.env.VITE_BACKEND_URL)
    : 'http://localhost:8080'
).replace(/\/$/, '');
const DEFAULT_REFRESH_INTERVAL_SECONDS = 10 * 60;
const REFRESH_LEEWAY_SECONDS = 10;

let refreshTimer: number | null = null;

const parseUser = (raw: any): SessionUser | null => {
  if (!raw || typeof raw !== 'object') return null;
  const username = typeof raw.username === 'string' ? raw.username : '';
  const role = typeof raw.role === 'string' ? raw.role.toLowerCase() : 'user';
  if (!username) return null;
  if (role !== 'admin' && role !== 'user') return null;
  return { username, role: role as UserRole };
};

const normalizeExpiresIn = (value: any): number | undefined => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : undefined;
};

const parseSessionPayload = (payload: any): { user: SessionUser | null; meta: SessionMeta } => {
  const user = parseUser(payload?.user);
  const meta: SessionMeta = {
    accessExpiresIn: normalizeExpiresIn(payload?.accessExpiresIn ?? payload?.access_ttl ?? payload?.accessTtl),
    refreshExpiresIn: normalizeExpiresIn(payload?.refreshExpiresIn ?? payload?.refresh_ttl ?? payload?.refreshTtl),
  };
  return { user, meta };
};

const stopRefreshTimer = () => {
  if (typeof window === 'undefined') return;
  if (refreshTimer !== null) {
    window.clearTimeout(refreshTimer);
    refreshTimer = null;
  }
};

const scheduleRefresh = (meta?: SessionMeta) => {
  if (typeof window === 'undefined') return;
  stopRefreshTimer();
  const ttlSeconds = meta?.accessExpiresIn;
  const delaySeconds = typeof ttlSeconds === 'number'
    ? Math.max(5, ttlSeconds - REFRESH_LEEWAY_SECONDS)
    : DEFAULT_REFRESH_INTERVAL_SECONDS;
  refreshTimer = window.setTimeout(() => {
    void triggerRefresh();
  }, delaySeconds * 1000);
};

export const getStoredSessionUser = (): SessionUser | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parseUser(parsed);
  } catch {
    return null;
  }
};

const persistSessionUser = (user: SessionUser | null) => {
  if (typeof window === 'undefined') return;
  if (!user) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
};

export const loginWithPassword = async (username: string, password: string): Promise<SessionUser> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error(response.status === 401 ? 'Неверный логин или пароль' : 'Не удалось выполнить вход');
  }
  const payload = await response.json();
  const { user, meta } = parseSessionPayload(payload);
  if (!user) throw new Error('Ответ сервера не содержит пользователя');
  persistSessionUser(user);
  scheduleRefresh(meta);
  return user;
};

export const registerResident = async (fullName: string, house: string): Promise<RegistrationResult> => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ fullName, house }),
  });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    // ignore parsing errors below; handled by response.ok check
  }

  if (!response.ok) {
    const message = payload?.message || payload?.error || 'Не удалось создать учетную запись';
    throw new Error(String(message));
  }

  const user = parseUser(payload?.user);
  const password = typeof payload?.password === 'string' ? payload.password : '';
  if (!user || !password) {
    throw new Error('Сервер не вернул учетные данные');
  }

  const result: RegistrationResult = { user, password };
  if (typeof payload?.displayName === 'string') result.displayName = payload.displayName;
  if (typeof payload?.house === 'string') result.house = payload.house;
  if (typeof payload?.apartment === 'string') result.apartment = payload.apartment;
  return result;
};

export const fetchCurrentUser = async (): Promise<SessionUser | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) {
      if (response.status === 401) {
        const refreshed = await refreshSession();
        if (refreshed) return refreshed;
        persistSessionUser(null);
        stopRefreshTimer();
        return null;
      }
      return getStoredSessionUser();
    }
    const payload = await response.json();
    const { user, meta } = parseSessionPayload(payload);
    if (user) {
      persistSessionUser(user);
      scheduleRefresh(meta);
    }
    return user;
  } catch {
    return getStoredSessionUser();
  }
};

export const refreshSession = async (): Promise<SessionUser | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      if (response.status === 401) {
        persistSessionUser(null);
        stopRefreshTimer();
      }
      return null;
    }
    const payload = await response.json();
    const { user, meta } = parseSessionPayload(payload);
    if (user) {
      persistSessionUser(user);
      scheduleRefresh(meta);
    }
    return user;
  } catch {
    return null;
  }
};

export const clearSession = async () => {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch {
    // ignore logout errors
  }
  persistSessionUser(null);
  stopRefreshTimer();
};

export const isAdmin = (user?: SessionUser | null) => user?.role === 'admin';

async function triggerRefresh() {
  const user = await refreshSession();
  if (!user) stopRefreshTimer();
}
