import React from 'react';
import { Link, NavLink } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'О ТСЖ', to: '/o-tszh' },
  { label: 'Информация для жильцов', to: '/informaciya' },
  { label: 'Новости', to: '/news' },
  { label: 'FAQ', to: '/faq' },
];

const PublicTopbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 bg-[var(--color-sand)]/95 backdrop-blur border-b border-[color:var(--color-info-border)]">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-3 text-[var(--color-ink)] font-semibold hover:text-primary transition"
          >
            <span className="w-11 h-11 rounded-xl border border-[color:var(--color-info-border)] bg-white text-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined">home</span>
            </span>
            <div className="leading-tight">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
                Новое Девяткино
              </div>
              <div className="text-base md:text-lg">Портал ТСЖ</div>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm hover:-translate-y-0.5 transition"
            >
              <span className="material-symbols-outlined text-base">login</span>
              Личный кабинет
            </Link>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto hide-scrollbar pb-1" aria-label="Навигация по открытым разделам">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/news' || link.to === '/faq'}
              className={({ isActive }) =>
                `px-3 md:px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white/70 border border-[color:var(--color-info-border)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-info-surface)]'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default PublicTopbar;
