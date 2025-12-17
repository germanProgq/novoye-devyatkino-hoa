import React, { CSSProperties, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RegistrationResult, SessionUser, clearSession, fetchCurrentUser, loginWithPassword, registerResident } from '../utils/auth';

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
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [registrationError, setRegistrationError] = useState('');
  const [registrationFeedback, setRegistrationFeedback] = useState('');
  const [registering, setRegistering] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<RegistrationResult | null>(null);
  const [autoSigningIn, setAutoSigningIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [animateIn, setAnimateIn] = useState(false);
  const isRegisterMode = mode === 'register';

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

  const resetRegistration = () => {
    setRegistrationError('');
    setRegistrationFeedback('');
    setRegistrationResult(null);
    setRegistering(false);
    setAutoSigningIn(false);
  };

  const handleSwitchMode = (nextMode: 'login' | 'register') => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setError('');
    setFeedback('');
    resetRegistration();
  };

  const registrationCredentialsText = useMemo(() => {
    if (!registrationResult) return '';
    return `Логин: ${registrationResult.user.username}\nПароль: ${registrationResult.password}`;
  }, [registrationResult]);

  const handleRegisterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRegistrationError('');
    setRegistrationFeedback('');
    setRegistrationResult(null);

    if (!fullName.trim() || !houseNumber.trim()) {
      setRegistrationError('Введите полное ФИО и номер дома.');
      return;
    }

    try {
      setRegistering(true);
      const result = await registerResident(fullName, houseNumber);
      setRegistrationResult(result);
      setRegistrationFeedback('Учетные данные готовы — сохраните их, прежде чем продолжить.');
    } catch (err: any) {
      setRegistrationError(err?.message || 'Не удалось создать учетную запись');
    } finally {
      setRegistering(false);
    }
  };

  const handleAutoLogin = async () => {
    if (!registrationResult) return;
    setError('');
    setRegistrationError('');
    try {
      setAutoSigningIn(true);
      const user = await loginWithPassword(registrationResult.user.username, registrationResult.password);
      onLogin(user);
      setFeedback('Регистрация завершена. Выполняем вход...');
      goNext();
    } catch (err: any) {
      setRegistrationError(err?.message || 'Не удалось выполнить автоматический вход');
    } finally {
      setAutoSigningIn(false);
    }
  };

  const copyCredentials = async () => {
    if (!registrationResult || !registrationCredentialsText) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(registrationCredentialsText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = registrationCredentialsText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      setRegistrationFeedback('Логин и пароль скопированы в буфер обмена.');
    } catch {
      setRegistrationError('Не удалось скопировать в буфер обмена.');
    }
  };

  const downloadCredentials = () => {
    if (!registrationResult || !registrationCredentialsText) return;
    const blob = new Blob([registrationCredentialsText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hoa-login-${registrationResult.user.username || 'resident'}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    setRegistrationFeedback('Файл с данными скачан.');
  };

  const shareCredentials = async () => {
    if (!registrationResult || !registrationCredentialsText) return;
    const shareText = `${registrationCredentialsText}\n\nДом: ${registrationResult.house || houseNumber}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Доступ в личный кабинет ТСЖ', text: shareText });
        setRegistrationFeedback('Данные отправлены через системное меню.');
        return;
      } catch {
        // fall back to copy
      }
    }
    await copyCredentials();
    setRegistrationFeedback('Данные скопированы — отправьте их в чат или письмом.');
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
    setFeedback('Данные удалены.');
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
            Новое девяткино &nbsp;•&nbsp; Вход и регистрация
          </p>
          <h2 className="text-4xl font-extrabold leading-tight">Личный кабинет жителей</h2>
          <p className="text-base text-white/85 max-w-2xl">
            Войдите по логину или зарегистрируйтесь по ФИО и номеру дома, чтобы получить доступ к услугам и информации вашего ТСЖ.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-start lg:items-center justify-center px-4 sm:px-6 md:px-8 py-8 sm:py-10">
        <div className={`w-full max-w-lg bg-white/95 backdrop-blur border border-[color:var(--color-info-border)] rounded-2xl shadow-2xl shadow-[rgba(47,58,42,0.18)] p-6 sm:p-8 space-y-5 sm:space-y-7 login-card ${animateIn ? 'login-card--visible' : ''} ${isRegisterMode ? 'login-card--flipped' : ''}`}>
          <div className="flex items-start justify-between gap-3 login-stagger" style={staggerStyle('90ms')}>
            <div className="flex items-center gap-3">
              <img
                src="/images/gerb250.jpg"
                alt="Герб"
                className="w-12 h-12 rounded-xl border border-[color:var(--color-info-border)] object-cover"
              />
              <div>
                <p className="text-[11px] sm:text-xs uppercase tracking-[0.25em] text-[var(--color-ink-soft)]">Новое Девяткино</p>
                {/* <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-ink)]">Личный кабинет</h1> */}
              </div>
            </div>
            <div className="flex items-center bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] rounded-full p-1 gap-1">
              <button
                type="button"
                onClick={() => handleSwitchMode('login')}
                className={`px-3 sm:px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-1 transition ${!isRegisterMode ? 'bg-primary text-primary-contrast shadow-md shadow-primary/25' : 'text-[var(--color-ink)] hover:bg-white'}`}
                aria-pressed={!isRegisterMode}
              >
                <span className="material-symbols-outlined text-sm leading-none">login</span>
                Вход
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode('register')}
                className={`px-3 sm:px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-1 transition ${isRegisterMode ? 'bg-primary text-primary-contrast shadow-md shadow-primary/25' : 'text-[var(--color-ink)] hover:bg-white'}`}
                aria-pressed={isRegisterMode}
              >
                <span className="material-symbols-outlined text-sm leading-none">how_to_reg</span>
                Регистрация
              </button>
            </div>
          </div>

          <div className="login-card__canvas mt-5 sm:mt-7">
            <div className="login-flip">
              <div className="login-face login-face--front space-y-5 sm:space-y-6">
                <div className="space-y-2 login-stagger" style={staggerStyle('130ms')}>
                  <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-ink-soft)]">Вход</p>
                  <h2 className="text-2xl font-bold text-[var(--color-ink)]">Войти в личный кабинет</h2>
                  <p className="text-sm text-[var(--color-ink-soft)]">
                    Введите логин и пароль или воспользуйтесь готовыми тестовыми профилями.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 login-stagger" style={staggerStyle('170ms')}>
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
                    className="w-full py-3 rounded-xl bg-primary text-primary-contrast font-semibold shadow-lg shadow-primary/30 hover:bg-primary/90 transition"
                  >
                    Войти
                  </button>
                </form>

                {error && <p className="text-sm text-accent">{error}</p>}
                {feedback && !error && <p className="text-sm text-[var(--color-ink-soft)]">{feedback}</p>}

                <div className="space-y-3 login-stagger" style={staggerStyle('220ms')}>
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

                <div className="text-sm text-[var(--color-ink-soft)]">
                  Нет аккаунта?{' '}
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('register')}
                    className="text-primary font-semibold hover:underline"
                  >
                    Зарегистрируйтесь по ФИО
                  </button>
                </div>
              </div>

              <div className="login-face login-face--back space-y-5 sm:space-y-6">
                <div className="space-y-2 login-stagger" style={staggerStyle('130ms')}>
                  <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-ink-soft)]">Регистрация</p>
                  <h2 className="text-2xl font-bold text-[var(--color-ink)]">
                    {registrationResult ? 'Ваши учетные данные' : 'Получить учетные данные'}
                  </h2>
                  <p className="text-sm text-[var(--color-ink-soft)]">
                    {registrationResult
                      ? 'Сохраните логин и пароль — их видно только на этом шаге.'
                      : 'Укажите ФИО и дом — мы сверим запись в базе жителей, сгенерируем логин и пароль и покажем их вам.'}
                  </p>
                </div>

                {!registrationResult && (
                  <>
                    <form onSubmit={handleRegisterSubmit} className="space-y-4 login-stagger" style={staggerStyle('170ms')}>
                      <label className="block space-y-2">
                        <span className="text-sm font-semibold">Полное ФИО</span>
                        <div className="relative">
                          <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Иванов Иван Иванович"
                            autoComplete="name"
                            className="w-full rounded-xl border border-[color:var(--color-info-border)] bg-white px-4 py-3 text-[var(--color-ink)] shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                          />
                          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-soft)]">
                            badge
                          </span>
                        </div>
                      </label>

                      <label className="block space-y-2">
                        <span className="text-sm font-semibold">Дом</span>
                        <div className="relative">
                          <input
                            type="text"
                            value={houseNumber}
                            onChange={(e) => setHouseNumber(e.target.value)}
                            placeholder="например: 75А"
                            autoComplete="street-address"
                            className="w-full rounded-xl border border-[color:var(--color-info-border)] bg-white px-4 py-3 text-[var(--color-ink)] shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                          />
                          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-soft)]">
                            home
                          </span>
                        </div>
                      </label>

                      <button
                        type="submit"
                        disabled={registering}
                        className="w-full py-3 rounded-xl bg-primary text-primary-contrast font-semibold shadow-lg shadow-primary/30 hover:bg-primary/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {registering ? 'Ищем и генерируем...' : 'Найти в базе и выдать логин'}
                      </button>
                    </form>

                    {registrationError && <p className="text-sm text-accent">{registrationError}</p>}
                    {registrationFeedback && !registrationError && <p className="text-sm text-[var(--color-ink-soft)]">{registrationFeedback}</p>}
                  </>
                )}

                {registrationResult && (
                  <>
                    {registrationError && <p className="text-sm text-accent">{registrationError}</p>}
                    {registrationFeedback && !registrationError && <p className="text-sm text-[var(--color-ink-soft)]">{registrationFeedback}</p>}

                    <div className="space-y-3 login-stagger" style={staggerStyle('220ms')}>
                      <div className="p-4 rounded-xl bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] shadow-inner">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-[var(--color-ink)]">Ваши учетные данные</p>
                            <p className="text-xs text-[var(--color-ink-soft)]">Сохраните логин и пароль — мы покажем их только сейчас.</p>
                          </div>
                          <span className="material-symbols-outlined text-primary">key</span>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3 mt-3">
                          <div className="rounded-lg bg-white border border-[color:var(--color-info-border)] p-3">
                            <p className="text-[11px] uppercase tracking-wide text-[var(--color-ink-soft)]">Логин</p>
                            <p className="font-mono text-sm break-all text-[var(--color-ink)]">{registrationResult.user.username}</p>
                          </div>
                          <div className="rounded-lg bg-white border border-[color:var(--color-info-border)] p-3">
                            <p className="text-[11px] uppercase tracking-wide text-[var(--color-ink-soft)]">Пароль</p>
                            <p className="font-mono text-sm break-all text-[var(--color-ink)]">{registrationResult.password}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <button
                            type="button"
                            onClick={copyCredentials}
                            className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-[color:var(--color-info-border)] text-sm font-semibold hover:border-primary"
                          >
                            <span className="material-symbols-outlined text-base">content_copy</span>
                            Скопировать
                          </button>
                          <button
                            type="button"
                            onClick={downloadCredentials}
                            className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-[color:var(--color-info-border)] text-sm font-semibold hover:border-primary"
                          >
                            <span className="material-symbols-outlined text-base">download</span>
                            Скачать файл
                          </button>
                          <button
                            type="button"
                            onClick={shareCredentials}
                            className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-[color:var(--color-info-border)] text-sm font-semibold hover:border-primary"
                          >
                            <span className="material-symbols-outlined text-base">send</span>
                            Отправить
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoLogin}
                        disabled={autoSigningIn}
                        className="w-full py-3 rounded-xl bg-primary text-primary-contrast font-semibold shadow-lg shadow-primary/30 hover:bg-primary/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {autoSigningIn ? 'Входим...' : 'Продолжить и войти'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
