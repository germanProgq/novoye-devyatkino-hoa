import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import PublicTopbar from '../../components/public/PublicTopbar';
import { ABOUT_LINKS } from './data';

const AboutLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--color-sand)] text-[var(--color-ink)]">
      <PublicTopbar />

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14 space-y-6 md:space-y-8">
        <div className="bg-white/75 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)]/70 font-semibold">
                Открытая информация
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-ink)]">О товариществе</h1>
              <p className="text-[var(--color-ink-soft)] leading-relaxed max-w-2xl">
                Сведения и материалы, опубликованные в соответствии с Постановлением Правительства РФ №731
                от 23.09.2010 г.
              </p>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] rounded-xl">
              <span className="material-symbols-outlined text-primary">gavel</span>
              <div className="text-sm text-[var(--color-ink-soft)]">
                <div className="font-semibold text-[var(--color-ink)]">Постановление №731</div>
                <div>23 сентября 2010 г.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] rounded-2xl p-3 md:p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {ABOUT_LINKS.map((link) => (
              <NavLink
                key={link.slug}
                to={`/o-tszh/${link.slug}`}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? 'bg-white text-primary shadow-sm border border-[color:var(--color-info-border)]'
                      : 'bg-white/70 border border-[color:var(--color-info-border)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
                  }`
                }
              >
                <span className="material-symbols-outlined text-base">{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>

        <Outlet />
      </div>
    </div>
  );
};

export default AboutLayout;
