export type UserRole = 'admin' | 'user';

export type SessionUser = {
  username: string;
  role: UserRole;
};

const SESSION_STORAGE_KEY = 'hoa_session_user';
const API_BASE_URL = (
  import.meta.env.VITE_BACKEND_URL
    ? String(import.meta.env.VITE_BACKEND_URL)
    : 'http://localhost:8080'
).replace(/\/$/, '');

const parseUser = (raw: any): SessionUser | null => {
  if (!raw || typeof raw !== 'object') return null;
  const username = typeof raw.username === 'string' ? raw.username : '';
  const role = typeof raw.role === 'string' ? raw.role.toLowerCase() : 'user';
  if (!username) return null;
  if (role !== 'admin' && role !== 'user') return null;
  return { username, role: role as UserRole };
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
  const user = parseUser(payload?.user);
  if (!user) throw new Error('Ответ сервера не содержит пользователя');
  persistSessionUser(user);
  return user;
};

export const fetchCurrentUser = async (): Promise<SessionUser | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) {
      if (response.status === 401) {
        persistSessionUser(null);
        return null;
      }
      return getStoredSessionUser();
    }
    const payload = await response.json();
    const user = parseUser(payload?.user);
    if (user) persistSessionUser(user);
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
      if (response.status === 401) persistSessionUser(null);
      return null;
    }
    const payload = await response.json();
    const user = parseUser(payload?.user);
    if (user) persistSessionUser(user);
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
};

export const isAdmin = (user?: SessionUser | null) => user?.role === 'admin';
