import React, { ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Outlet, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import PageLoader from './components/PageLoader';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import MeterReadings from './pages/MeterReadings';
import Documents from './pages/Documents';
import News from './pages/News';
import FAQ from './pages/FAQ';
import Requests from './pages/Requests';
import Admin from './pages/Admin';
import Login from './pages/Login';
import { SessionUser, clearSession, fetchCurrentUser, getStoredSessionUser, isAdmin } from './utils/auth';
import {
  AboutBoardPage,
  AboutGalleryPage,
  AboutHistoryPage,
  AboutLayout,
  AboutRequisitesPage,
  AboutStaffPage,
  AboutSvedeniyaPage,
} from './pages/about';
import {
  ResidentContactsPage,
  ResidentInfoLayout,
  ResidentLinksPage,
  ResidentPhonesPage,
  ResidentQuestionPage,
  ResidentServicesPage,
  ResidentTariffsPage,
} from './pages/resident';

const API_BASE_URL = (
  import.meta.env.VITE_BACKEND_URL
    ? String(import.meta.env.VITE_BACKEND_URL)
    : 'http://localhost:8080'
).replace(/\/$/, '');
const apiFetch = (input: string, init: RequestInit = {}) => fetch(input, { credentials: 'include', ...init });

const useHasUserData = (user: SessionUser | null) => {
  const [hasData, setHasData] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setHasData(null);
      return;
    }

    const loadPresence = async () => {
      let hasLinks = false;
      let hasMeters = false;
      let debtsLoaded = false;
      let metersLoaded = false;

      try {
        const response = await apiFetch(`${API_BASE_URL}/api/accounts/me/debts`);
        if (response.ok) {
          debtsLoaded = true;
          const payload = await response.json();
          const links = Array.isArray(payload.links) ? payload.links : [];
          hasLinks = links.length > 0;
        }
      } catch (err) {
        console.error(err);
      }

      try {
        const response = await apiFetch(`${API_BASE_URL}/api/meters`);
        if (response.ok) {
          metersLoaded = true;
          const payload = await response.json();
          const list = Array.isArray(payload.readings) ? payload.readings : Array.isArray(payload) ? payload : [];
          hasMeters = list.length > 0;
        }
      } catch (err) {
        console.error(err);
      }

      if (cancelled) return;

      if (hasLinks || hasMeters) {
        setHasData(true);
      } else if (debtsLoaded && metersLoaded) {
        setHasData(false);
      } else {
        setHasData(null);
      }
    };

    setHasData(null);
    void loadPresence();

    return () => {
      cancelled = true;
    };
  }, [user?.username]);

  return hasData;
};

const AppLayout: React.FC<{
  user: SessionUser;
  onLogout: () => void;
  onSwitchAccount: () => void;
}> = ({ user, onLogout, onSwitchAccount }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const accountName = useMemo(() => user.username || 'Неизвестный', [user.username]);
  const accountMeta = useMemo(() => (user.role === 'admin' ? 'Администратор' : 'Пользователь'), [user.role]);
  const hasUserData = useHasUserData(user);
  const showMetersLink = hasUserData === false;
  const pageTransitionClass = useMemo(() => {
    if (location.pathname === '/documents') return 'page-transition page-transition--fade';
    return 'page-transition';
  }, [location.pathname]);

  // Helper to determine page title for mobile header
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard': return 'Главная';
      case '/meters': return 'Показания';
      case '/documents': return 'Документы';
      case '/news': return 'Новости';
      case '/requests': return 'Заявки';
      case '/faq': return 'Вопросы';
      case '/admin': return 'Админ';
      default: return 'Портал ТСЖ';
    }
  };

  const handleLogout = () => {
    onLogout();
    setUserMenuOpen(false);
    navigate('/', { replace: true });
  };

  const handleSwitchAccount = () => {
    onSwitchAccount();
    setUserMenuOpen(false);
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!userMenuOpen) return undefined;
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [userMenuOpen]);

  return (
    <div className="flex h-screen bg-[var(--color-sand)] text-[var(--color-ink)] font-sans overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
        onSwitchAccount={handleSwitchAccount}
        showMetersLink={showMetersLink}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="bg-white/95 backdrop-blur border-b border-[color:var(--color-info-border)] h-16 flex items-center px-4 justify-between lg:hidden shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-[var(--color-ink-soft)] hover:bg-[var(--color-info-surface)] rounded-lg"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1 className="font-bold text-lg">{getPageTitle()}</h1>
          </div>
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className="w-10 h-10 rounded-full bg-[var(--color-info-surface)] text-[var(--color-ink-soft)] border border-[color:var(--color-info-border)] flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-base leading-none">person</span>
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-[color:var(--color-info-border)] rounded-xl shadow-xl overflow-hidden z-20">
                <div className="px-4 py-3 border-b border-[color:var(--color-info-border)]">
                  <p className="text-sm font-semibold text-[var(--color-ink)] truncate">{accountName}</p>
                  <p className="text-xs text-[var(--color-ink-soft)] truncate">{accountMeta}</p>
                </div>
                <button
                  onClick={handleSwitchAccount}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-[var(--color-info-surface)] text-[var(--color-ink)]"
                >
                  <span className="material-symbols-outlined text-primary">switch_account</span>
                  Сменить аккаунт
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-[var(--color-info-surface)] text-accent"
                >
                  <span className="material-symbols-outlined">logout</span>
                  Выйти
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content Scroll Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            <div key={location.pathname} className={pageTransitionClass}>
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const RequireAuth: React.FC<{ children: ReactElement; user: SessionUser | null; checking: boolean }> = ({ children, user, checking }) => {
  const location = useLocation();
  if (checking) {
    return <PageLoader visible />;
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
};

const RequireAdmin: React.FC<{ children: ReactElement; user: SessionUser | null; checking: boolean }> = ({ children, user, checking }) => {
  const location = useLocation();
  if (checking) return <PageLoader visible />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!isAdmin(user)) return <Navigate to="/dashboard" state={{ from: location }} replace />;
  return children;
};

const App: React.FC = () => {
  const [showLoader, setShowLoader] = useState(true);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(getStoredSessionUser());
  const [authChecking, setAuthChecking] = useState(true);
  const loaderFadeMs = 0;
  const loaderFillMs = 0;

  useEffect(() => {
    let mounted = true;
    const syncSession = async () => {
      const user = await fetchCurrentUser();
      if (!mounted) return;
      setSessionUser(user);
      setAuthChecking(false);
    };
    syncSession().catch(() => setAuthChecking(false));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let settled = false;
    let hideTimer: number | null = null;
    const started = performance.now();
    const minimumVisible = loaderFillMs + 300;

    const endLoading = () => {
      if (settled) return;
      settled = true;
      const elapsed = performance.now() - started;
      const delay = Math.max(260, minimumVisible - elapsed);
      hideTimer = window.setTimeout(() => setShowLoader(false), delay);
    };

    const safety = window.setTimeout(endLoading, 4500);

    if (document.readyState === 'complete') {
      endLoading();
    } else {
      window.addEventListener('load', endLoading);
    }

    return () => {
      if (hideTimer) {
        window.clearTimeout(hideTimer);
      }
      window.clearTimeout(safety);
      window.removeEventListener('load', endLoading);
    };
  }, []);

  useEffect(() => {
    if (showLoader) {
      document.body.classList.add('loader-active');
      document.body.classList.remove('hero-ready');
      return;
    }
    const announceReady = () => {
      document.body.classList.remove('loader-active');
      document.body.classList.add('hero-ready');
      window.dispatchEvent(new Event('hero-ready'));
    };
    const id = window.setTimeout(announceReady, loaderFadeMs);
    return () => window.clearTimeout(id);
  }, [showLoader]);

  const handleLoginSuccess = (user: SessionUser) => {
    setSessionUser(user);
  };

  const handleLogout = async () => {
    await clearSession();
    setSessionUser(null);
  };

  const handleSwitchAccount = async () => {
    await handleLogout();
  };

  return (
    <>
      <PageLoader visible={showLoader} />
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login onLogin={handleLoginSuccess} />} />
          <Route path="/o-tszh" element={<AboutLayout />}>
            <Route index element={<Navigate to="/o-tszh/svedeniya" replace />} />
            <Route path="svedeniya" element={<AboutSvedeniyaPage />} />
            <Route path="pravlenie" element={<AboutBoardPage />} />
            <Route path="sotrudniki" element={<AboutStaffPage />} />
            <Route path="rekvizity" element={<AboutRequisitesPage />} />
            <Route path="istoriya" element={<AboutHistoryPage />} />
            <Route path="fotogalereya" element={<AboutGalleryPage />} />
          </Route>
          <Route path="/informaciya" element={<ResidentInfoLayout />}>
            <Route index element={<Navigate to="/informaciya/poryadok-uslug" replace />} />
            <Route path="poryadok-uslug" element={<ResidentServicesPage />} />
            <Route path="tarify" element={<ResidentTariffsPage />} />
            <Route path="poleznye-telefony" element={<ResidentPhonesPage />} />
            <Route path="poleznye-sayty" element={<ResidentLinksPage />} />
            <Route path="kontakty-tszh" element={<ResidentContactsPage />} />
            <Route path="vopros-pravleniyu" element={<ResidentQuestionPage />} />
          </Route>
          <Route
            element={(
              <RequireAuth user={sessionUser} checking={authChecking}>
                <AppLayout
                  user={sessionUser as SessionUser}
                  onLogout={handleLogout}
                  onSwitchAccount={handleSwitchAccount}
                />
              </RequireAuth>
            )}
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/meters" element={<MeterReadings />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/news" element={<News />} />
            <Route path="/requests" element={<Requests />} />
            <Route path="/faq" element={<FAQ />} />
            <Route
              path="/admin"
              element={(
                <RequireAdmin user={sessionUser} checking={authChecking}>
                  <Admin />
                </RequireAdmin>
              )}
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </>
  );
};

export default App;
