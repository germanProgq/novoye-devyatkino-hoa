import React, { CSSProperties, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SessionUser, clearSession, fetchCurrentUser, loginWithPassword } from '../utils/auth';

type LocationState = { from?: { pathname: string } };

type LoginProps = {
  onLogin: (user: SessionUser) => void;
};

const demoAccounts = [
  { id: 'admin', username: 'admin', password: 'admin', role: 'Администратор' },
  { id: 'user', username: 'user', password: 'user', role: 'Пользователь' },
];

const staggerStyle = (delay: string): CSSProperties => ({ '--login-delay': delay });

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [animateIn, setAnimateIn] = useState(false);

  const fromPath = useMemo(
    () => ((location.state as LocationState | null)?.from?.pathname) || '/dashboard',
    [location.state]
  );

  useEffect(() => {
    let mounted = true;
    const checkExistingSession = async () => {
      const current = await fetchCurrentUser();
      if (!mounted) return;
      if (current) {
        setFeedback('Сессия уже сохранена — перенаправляем в панель.');
        onLogin(current);
        navigate(fromPath, { replace: true });
      }
      setCheckingSession(false);
    };
    checkExistingSession();
    return () => { mounted = false; };
  }, [fromPath, navigate, onLogin]);

  useEffect(() => {
    if (checkingSession) return;
    const frame = requestAnimationFrame(() => setAnimateIn(true));
    return () => cancelAnimationFrame(frame);
  }, [checkingSession]);

  const goNext = () => navigate(fromPath, { replace: true });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setFeedback('');

    if (!username.trim() || !password.trim()) {
      setError('Введите логин и пароль или выберите тестовый аккаунт ниже.');
      return;
    }

    try {
      const user = await loginWithPassword(username, password);
      onLogin(user);
      setFeedback('Вход выполнен. Сессия сохранена в httpOnly cookie.');
      goNext();
    } catch (err: any) {
      setError(err?.message || 'Не удалось выполнить вход');
    }
  };

  const handleUseDemo = async (accountId: string) => {
    const account = demoAccounts.find((acc) => acc.id === accountId);
    if (!account) return;
    try {
      setError('');
      const user = await loginWithPassword(account.username, account.password);
      setUsername(account.username);
      setPassword(account.password);
      onLogin(user);
      setFeedback('Тестовый логин сохранен — открываем панель.');
      goNext();
    } catch (err: any) {
      setError(err?.message || 'Не удалось выполнить вход');
    }
  };

  const handleClear = () => {
    clearSession();
    setUsername('');
    setPassword('');
    setFeedback('Данные удалены. Доступ к /dashboard снова заблокирован, пока не авторизуетесь.');
  };

  if (checkingSession) {
    return <div className="min-h-screen bg-[var(--color-sand)]" />;
  }

  return (
    <div className={`login-shell min-h-screen bg-[var(--color-sand)] text-[var(--color-ink)] flex flex-col lg:grid lg:grid-cols-[1.08fr,1fr] ${animateIn ? 'login-shell--visible' : ''}`}>
      <div className={`hidden lg:block relative h-full min-h-screen overflow-hidden login-visual ${animateIn ? 'login-visual--visible' : ''}`}>
        <img
          src="/images/login/main-login.png"
          alt="Дом и двор ТСЖ"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/40 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-white drop-shadow-lg space-y-3 login-stagger" style={staggerStyle('140ms')}>
          <p className="text-xs uppercase tracking-[0.28em] text-white/80">
            Новое девяткино &nbsp;•&nbsp; Вход
          </p>
          <h2 className="text-4xl font-extrabold leading-tight">Вход в личный кабинет</h2>
          <p className="text-base text-white/85 max-w-2xl">
            Введите логин и пароль или выберите готовый тестовый профиль, чтобы открыть панель.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-start lg:items-center justify-center px-4 sm:px-6 md:px-8 py-8 sm:py-10">
        <div className={`w-full max-w-lg bg-white/95 backdrop-blur border border-[color:var(--color-info-border)] rounded-2xl shadow-2xl shadow-[rgba(47,58,42,0.18)] p-6 sm:p-8 space-y-5 sm:space-y-7 login-card ${animateIn ? 'login-card--visible' : ''}`}>
          <div className="flex items-center gap-3 login-stagger" style={staggerStyle('90ms')}>
            <img
              src="/images/gerb250.jpg"
              alt="Герб"
              className="w-12 h-12 rounded-xl border border-[color:var(--color-info-border)] object-cover"
            />
            <div>
              <p className="text-[11px] sm:text-xs uppercase tracking-[0.25em] text-[var(--color-ink-soft)]">Новое Девяткино</p>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-ink)]">Вход в личный кабинет</h1>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 login-stagger" style={staggerStyle('150ms')}>
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Логин</span>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="например: admin"
                  autoComplete="username"
                  className="w-full rounded-xl border border-[color:var(--color-info-border)] bg-white px-4 py-3 text-[var(--color-ink)] shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-soft)]">
                  person
                </span>
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold">Пароль</span>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="например: admin"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-[color:var(--color-info-border)] bg-white px-4 py-3 text-[var(--color-ink)] shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-soft)]">
                  key_vertical
                </span>
              </div>
            </label>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold shadow-lg shadow-primary/30 hover:bg-primary/90 transition"
            >
              Войти
            </button>
          </form>

          {error && <p className="text-sm text-accent">{error}</p>}
          {feedback && !error && <p className="text-sm text-[var(--color-ink-soft)]">{feedback}</p>}

          <div className="space-y-3 login-stagger" style={staggerStyle('210ms')}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--color-ink)]">Готовые тестовые аккаунты</span>
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-accent hover:underline"
              >
                Очистить данные
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {demoAccounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => handleUseDemo(account.id)}
                  className="group text-left p-4 rounded-xl border border-[color:var(--color-info-border)] bg-white hover:border-primary hover:-translate-y-0.5 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-ink)] truncate">{account.role}</p>
                      <p className="text-xs text-[var(--color-ink-soft)] truncate">Готовые учетные данные</p>
                    </div>
                    <span className="material-symbols-outlined text-primary group-hover:translate-x-0.5 transition">
                      arrow_forward
                    </span>
                  </div>
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-mono bg-[var(--color-info-surface)] rounded-lg px-3 py-2 text-[var(--color-ink)] break-all">
                      login: {account.username}
                    </p>
                    <p className="text-xs font-mono bg-[var(--color-info-surface)] rounded-lg px-3 py-2 text-[var(--color-ink)] break-all">
                      password: {account.password}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
