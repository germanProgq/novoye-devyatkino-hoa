import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import PublicTopbar from '../../components/public/PublicTopbar';
import { INFO_LINKS } from './data';

const ResidentLayout: React.FC = () => {
  const linkClasses = (active: boolean) =>
    `inline-flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-sm font-semibold transition ${
      active
        ? 'bg-white text-primary shadow-sm border border-[color:var(--color-info-border)]'
        : 'bg-white/70 border border-[color:var(--color-info-border)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
    }`;

  return (
    <div className="min-h-screen bg-[var(--color-sand)] text-[var(--color-ink)]">
      <PublicTopbar />

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14 space-y-6 md:space-y-8">
        <div className="bg-white/75 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)]/70 font-semibold">
                Информация для жильцов
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-ink)]">Справочная зона</h1>
              <p className="text-[var(--color-ink-soft)] leading-relaxed max-w-2xl">
                Полезные материалы, тарифы, контакты и ссылки для жителей домов Нового Девяткино 75.
              </p>
            </div>
            <div className="px-4 py-3 bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] rounded-xl text-sm text-[var(--color-ink-soft)]">
              <div className="font-semibold text-[var(--color-ink)]">Актуальность</div>
              <p>Последнее обновление: ноябрь 2024</p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] rounded-2xl p-3 md:p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {INFO_LINKS.map((link) => {
              if (link.href) {
                return (
                  <a
                    key={link.slug}
                    href={link.href}
                    target={link.target ?? '_blank'}
                    rel="noreferrer noopener"
                    className={linkClasses(false)}
                  >
                    <span className="material-symbols-outlined text-base">{link.icon}</span>
                    {link.label}
                  </a>
                );
              }

              return (
                <NavLink
                  key={link.slug}
                  to={`/informaciya/${link.slug}`}
                  className={({ isActive }) => linkClasses(isActive)}
                >
                  <span className="material-symbols-outlined text-base">{link.icon}</span>
                  {link.label}
                </NavLink>
              );
            })}
          </div>
        </div>

        <Outlet />
      </div>
    </div>
  );
};

export default ResidentLayout;
