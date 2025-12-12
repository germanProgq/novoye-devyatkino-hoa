import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Outlet, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import PageLoader from './components/PageLoader';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import MeterReadings from './pages/MeterReadings';
import Documents from './pages/Documents';
import News from './pages/News';
import FAQ from './pages/FAQ';
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

const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Helper to determine page title for mobile header
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard': return 'Главная';
      case '/meters': return 'Показания';
      case '/documents': return 'Документы';
      case '/news': return 'Новости';
      case '/faq': return 'Вопросы';
      default: return 'Портал ТСЖ';
    }
  };

  return (
    <div className="flex h-screen bg-[var(--color-sand)] text-[var(--color-ink)] font-sans overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
          <div className="w-8 h-8 rounded-full bg-[var(--color-info-surface)] text-[var(--color-ink-soft)] border border-[color:var(--color-info-border)] flex items-center justify-center">
            <span className="material-symbols-outlined text-base leading-none">person</span>
          </div>
        </header>

        {/* Main Content Scroll Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [showLoader, setShowLoader] = useState(true);
  const loaderFadeMs = 0;
  const loaderFillMs = 0;

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

  return (
    <>
      <PageLoader visible={showLoader} />
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
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
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/meters" element={<MeterReadings />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/news" element={<News />} />
            <Route path="/faq" element={<FAQ />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </>
  );
};

export default App;
