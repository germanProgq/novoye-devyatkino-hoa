import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../ThemeToggle';

type NavChild = { label: string; href: string; target?: '_blank' | '_self' | '_parent' | '_top' };

type NavItem =
  | { id: string; label: string; href: string; type: 'anchor' }
  | { id: string; label: string; href: string; type: 'route' }
  | { id: string; label: string; href: string; type: 'group'; children: NavChild[] };

const NAV_ITEMS: NavItem[] = [
  {
    id: 'o-tszh',
    label: 'О ТСЖ',
    href: '/o-tszh/svedeniya',
    type: 'group',
    children: [
      { label: 'Сведения о ТСЖ', href: '/o-tszh/svedeniya' },
      { label: 'Правление ТСЖ', href: '/o-tszh/pravlenie' },
      { label: 'Сотрудники ТСЖ', href: '/o-tszh/sotrudniki' },
      { label: 'Реквизиты и контакты', href: '/o-tszh/rekvizity' },
      { label: 'Историческая справка', href: '/o-tszh/istoriya' },
      { label: 'Фотогалерея', href: '/o-tszh/fotogalereya' },
    ],
  },
  {
    id: 'resident-info',
    label: 'Информация для жильцов',
    href: '/informaciya/poryadok-uslug',
    type: 'group',
    children: [
      { label: 'Порядок оказания услуг', href: '/informaciya/poryadok-uslug' },
      { label: 'Тарифы на коммунальные услуги', href: '/images/tariffs/tarrifs.pdf', target: '_blank' },
      { label: 'Полезные телефоны', href: '/informaciya/poleznye-telefony' },
      { label: 'Полезные сайты', href: '/informaciya/poleznye-sayty' },
      { label: 'Контакты ТСЖ', href: '/informaciya/kontakty-tszh' },
      { label: 'Задать вопрос правлению', href: '/informaciya/vopros-pravleniyu' },
    ],
  },
  { id: 'news', label: 'Новости', href: '/news', type: 'route' },
  { id: 'faq', label: 'FAQ', href: '/faq', type: 'route' },
];

const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

const LandingHeader: React.FC = () => {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [heroProgress, setHeroProgress] = useState(0);
  const [pastHero, setPastHero] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileDropdowns, setMobileDropdowns] = useState<Record<string, boolean>>({});
  const closeTimeoutRef = useRef<number | null>(null);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 1024;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const query = window.matchMedia('(max-width: 1023px)');
    const handle = () => setIsMobile(query.matches);
    handle();
    query.addEventListener('change', handle);
    window.addEventListener('resize', handle);
    return () => {
      query.removeEventListener('change', handle);
      window.removeEventListener('resize', handle);
    };
  }, []);

  useEffect(() => {
    const hero = document.getElementById('landing-hero');
    if (!hero) return;

    let frame: number | null = null;

    const measure = () => {
      frame = null;
      const heroRect = hero.getBoundingClientRect();
      const heroHeight = heroRect.height || hero.offsetHeight || 1;
      const headerHeight = headerRef.current?.offsetHeight || 88;
      const scrollY = window.scrollY;
      const heroPast = heroRect.bottom <= headerHeight + 2;
      const mobilePast = isMobile && scrollY > headerHeight * 0.6;
      setHeroProgress(clamp(scrollY / heroHeight));
      setPastHero(heroPast || mobilePast);
    };

    const onScroll = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    window.addEventListener('hero-ready', measure);

    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
      window.removeEventListener('hero-ready', measure);
    };
  }, [isMobile]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    const handleScroll = () => setMobileOpen(false);
    window.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [mobileOpen]);

  const headerStyle = useMemo(() => {
    const glassSurface = 'rgba(var(--color-surface-rgb), 0.97)';
    const border = 'var(--color-info-border)';
    const shadowStrong = '0 16px 38px -26px rgba(0, 0, 0, 0.45)';
    const shadowMobile = '0 14px 30px -24px rgba(0, 0, 0, 0.45)';

    // Mobile: fully transparent over hero, solid after
    if (isMobile) {
      if (!pastHero) {
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          boxShadow: 'none',
        } as React.CSSProperties;
      }
      return {
        backgroundColor: glassSurface,
        borderColor: border,
        boxShadow: shadowMobile,
        backdropFilter: 'blur(10px)',
      } as React.CSSProperties;
    }

    // Desktop/tablet
    if (pastHero) {
      return {
        backgroundColor: glassSurface,
        borderColor: border,
        boxShadow: shadowStrong,
        backdropFilter: 'blur(10px)',
      } as React.CSSProperties;
    }

    // Over hero: fully transparent, no glass
    return {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      boxShadow: 'none',
      backdropFilter: 'none',
    } as React.CSSProperties;
  }, [isMobile, pastHero]);

  const brandSolid = pastHero;
  const toneClass = brandSolid ? 'text-[var(--color-ink)]' : 'text-white';
  const navLinkTone = brandSolid
    ? 'hover:bg-[var(--color-info-surface)] hover:border-[color:var(--color-info-border)] text-[var(--color-ink)]'
    : 'hover:bg-white/10 hover:border-white/20 text-white';
  const labelTone = brandSolid ? 'text-[var(--color-ink-soft)]' : 'text-white/70';
  const navBase = 'px-3 py-2 rounded-lg border text-sm font-semibold transition duration-200 flex items-center gap-1';
  const navActive = 'bg-accent text-primary-contrast shadow-sm border-transparent';
  const navNeutral = navLinkTone;
  const toggleTone = pastHero || isMobile ? 'default' : 'inverted';
  const toggleMobileDropdown = (id: string) => {
    setMobileDropdowns((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const closeMobileMenu = () => setMobileOpen(false);
  const toggleMobileMenu = () => setMobileOpen((state) => !state);

  return (
    <div
      className={`landing-header fixed top-0 left-0 right-0 z-[60] border-b overflow-visible ${pastHero ? 'landing-header--pinned' : 'landing-header--hero'}`}
      ref={headerRef}
      style={headerStyle}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between gap-4">
        <a href="#landing-hero" className={`inline-flex items-center gap-3 font-semibold text-base md:text-lg ${toneClass}`}>
          <span
            className={`w-11 h-11 rounded-xl border flex items-center justify-center shadow-sm ${
              brandSolid ? 'bg-white text-primary border-[color:var(--color-info-border)]' : 'bg-white/10 text-white border-white/25'
            }`}
          >
            <span className="material-symbols-outlined">cottage</span>
          </span>
          <span className="flex flex-col leading-tight">
            <span className={`text-[11px] uppercase tracking-[0.18em] font-medium ${labelTone}`}>
              Новое Девяткино
            </span>
            <span>Портал ТСЖ</span>
          </span>
        </a>

        <nav className="hidden lg:flex items-center gap-2 relative z-[70]">
          {NAV_ITEMS.map((item) => {
            if (item.type === 'group') {
              const isOpen = openDropdown === item.id;
              const cancelClose = () => {
                if (closeTimeoutRef.current) {
                  window.clearTimeout(closeTimeoutRef.current);
                  closeTimeoutRef.current = null;
                }
              };
              const scheduleClose = () => {
                cancelClose();
                closeTimeoutRef.current = window.setTimeout(() => setOpenDropdown(null), 160);
              };

              return (
                <div
                  key={item.id}
                  className={`relative ${isOpen ? 'z-[80]' : ''}`}
                  onMouseEnter={() => {
                    cancelClose();
                    setOpenDropdown(item.id);
                  }}
                  onMouseLeave={scheduleClose}
                  onFocusCapture={() => setOpenDropdown(item.id)}
                  onBlur={(event) => {
                    const next = event.relatedTarget as Node | null;
                    if (!next || !event.currentTarget.contains(next)) {
                      setOpenDropdown((current) => (current === item.id ? null : current));
                    }
                  }}
                >
                  <Link to={item.href} className={`${navBase} ${isOpen ? navActive : navNeutral}`}>
                    <span>{item.label}</span>
                    <span className="material-symbols-outlined text-base">{isOpen ? 'expand_less' : 'expand_more'}</span>
                  </Link>
                  <div
                    className={`absolute left-0 z-[90] mt-2 w-64 rounded-2xl border border-[color:var(--color-info-border)] bg-[var(--color-surface)] shadow-xl backdrop-blur-md transition-all duration-150 ${
                      isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'
                    }`}
                    onMouseEnter={cancelClose}
                    onMouseLeave={scheduleClose}
                  >
                    <div className="p-2 space-y-1">
                      {item.children.map((child) => {
                        const linkClasses =
                          'group flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-info-surface)] hover:text-accent transition';

                        if (child.target === '_blank') {
                          return (
                            <a
                              key={child.href}
                              href={child.href}
                              target="_blank"
                              rel="noreferrer noopener"
                              className={linkClasses}
                            >
                              <span>{child.label}</span>
                              <span className="material-symbols-outlined text-base text-[var(--color-ink-soft)] group-hover:text-accent">open_in_new</span>
                            </a>
                          );
                        }

                        return (
                          <Link
                            key={child.href}
                            to={child.href}
                            className={linkClasses}
                          >
                            <span>{child.label}</span>
                            <span className="material-symbols-outlined text-base text-[var(--color-ink-soft)] group-hover:text-accent">arrow_outward</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            const className = `${navBase} ${navNeutral}`;
            if (item.type === 'route') {
              return (
                <Link key={item.id} to={item.href} className={className}>
                  {item.label}
                </Link>
              );
            }
            return (
              <a key={item.id} href={item.href} className={className}>
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="#contacts"
            className={`hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border transition ${
              pastHero
                ? 'border-[color:var(--color-info-border)] text-[var(--color-ink)] hover:bg-[var(--color-info-surface)]'
                : 'border-white/30 text-white hover:bg-white/10'
            }`}
          >
            <span className="material-symbols-outlined text-base">call</span>
            Контакты
          </a>
          <ThemeToggle variant="icon" tone={toggleTone} />
          <Link
            to="/dashboard"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition duration-200 ${
              pastHero
                ? 'bg-primary text-primary-contrast shadow-sm hover:-translate-y-0.5 hover:shadow-md'
                : 'border border-white/60 text-white hover:bg-white/10'
            }`}
            aria-label="Войти"
          >
            <span className="material-symbols-outlined text-base">login</span>
            <span className="hidden sm:inline">Войти</span>
          </Link>
          <button
            type="button"
            className={`lg:hidden p-2 rounded-lg border transition ${
              pastHero ? 'border-[color:var(--color-info-border)] bg-white text-primary shadow-sm' : 'border-white/60 text-white'
            }`}
            onClick={toggleMobileMenu}
            aria-label="Меню"
            aria-expanded={mobileOpen}
          >
            <span className="material-symbols-outlined">{mobileOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {isMobile && (
        <div
          className={`lg:hidden fixed inset-0 bg-black/22 transition ${
            mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={closeMobileMenu}
          style={{ zIndex: 55 }}
        />
      )}

      <div
        className={`lg:hidden fixed left-4 right-4 origin-top rounded-2xl border shadow-xl transition-all duration-200 ${
          mobileOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
        } ${
          pastHero || isMobile
            ? 'bg-[var(--color-sand)] text-[var(--color-ink)] border-[color:var(--color-info-border)]'
            : 'bg-[rgba(16,20,14,0.9)] border-white/15 text-white'
        }`}
        style={{ top: pastHero ? '76px' : '72px', zIndex: 60 }}
      >
        <div className="p-4 space-y-2">
          {NAV_ITEMS.map((item) => {
            const mobileTone = pastHero || isMobile ? 'hover:bg-[var(--color-info-surface)] text-[var(--color-ink)]' : 'hover:bg-white/10 text-white';

            if (item.type === 'group') {
              const isOpen = Boolean(mobileDropdowns[item.id]);
              const surface = pastHero || isMobile
                ? 'bg-white border-[color:var(--color-info-border)]'
                : 'bg-white/5 border-white/20 text-white';
              const childTone = pastHero || isMobile
                ? 'text-[var(--color-ink)] hover:text-primary hover:bg-[var(--color-info-surface)]'
                : 'text-white hover:bg-white/10';

              return (
                <div key={item.id} className={`rounded-xl border ${surface} overflow-hidden`}>
                  <button
                    type="button"
                    onClick={() => toggleMobileDropdown(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-3 text-sm font-semibold transition ${mobileTone}`}
                  >
                    <span>{item.label}</span>
                    <span className="material-symbols-outlined text-base opacity-70">
                      {isOpen ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                  <div
                    className={`grid transition-all duration-200 ${
                      isOpen ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0 pointer-events-none'
                    }`}
                  >
                    {item.children.map((child) => (
                      child.target === '_blank' ? (
                        <a
                          key={child.href}
                          href={child.href}
                          target="_blank"
                          rel="noreferrer noopener"
                          className={`flex items-center justify-between px-4 py-2 text-sm font-semibold transition ${childTone}`}
                          onClick={closeMobileMenu}
                        >
                          <span>{child.label}</span>
                          <span className={`material-symbols-outlined text-base ${pastHero || isMobile ? 'text-[var(--color-ink-soft)]' : 'text-white/80'}`}>
                            open_in_new
                          </span>
                        </a>
                      ) : (
                        <Link
                          key={child.href}
                          to={child.href}
                          className={`flex items-center justify-between px-4 py-2 text-sm font-semibold transition ${childTone}`}
                          onClick={closeMobileMenu}
                        >
                          <span>{child.label}</span>
                          <span className={`material-symbols-outlined text-base ${pastHero || isMobile ? 'text-[var(--color-ink-soft)]' : 'text-white/80'}`}>
                            arrow_outward
                          </span>
                        </Link>
                      )
                    ))}
                  </div>
                </div>
              );
            }

            const className = `flex items-center justify-between px-3 py-3 rounded-xl text-sm font-semibold transition ${mobileTone}`;
            if (item.type === 'route') {
              return (
                <Link key={item.id} to={item.href} className={className} onClick={closeMobileMenu}>
                  <span>{item.label}</span>
                  <span className="material-symbols-outlined text-base opacity-70">arrow_outward</span>
                </Link>
              );
            }
            return (
              <a key={item.id} href={item.href} className={className} onClick={closeMobileMenu}>
                <span>{item.label}</span>
                <span className="material-symbols-outlined text-base opacity-70">arrow_outward</span>
              </a>
            );
          })}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <a
              href="#contacts"
              className={`px-3 py-3 rounded-xl text-sm font-semibold border ${
                pastHero || isMobile
                  ? 'bg-[var(--color-info-surface)] border-[color:var(--color-info-border)] text-[var(--color-ink)]'
                  : 'bg-white/10 border-white/20 text-white'
              }`}
            >
              Контакты
            </a>
            <Link
              to="/dashboard"
              className="px-3 py-3 rounded-xl text-sm font-semibold text-primary-contrast bg-primary text-center hover:-translate-y-0.5 transition inline-flex items-center justify-center gap-2"
              aria-label="Войти"
            >
              <span className="material-symbols-outlined text-base">login</span>
              <span className="hidden sm:inline">Войти</span>
            </Link>
          </div>
          <div className="pt-2">
            <ThemeToggle variant="chip" tone={toggleTone} className="w-full justify-center" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingHeader;
