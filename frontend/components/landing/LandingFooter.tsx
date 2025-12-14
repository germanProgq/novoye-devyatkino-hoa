import React from 'react';
import { Link } from 'react-router-dom';

const LandingFooter: React.FC = () => (
<footer className="bg-[var(--color-sand)] border-t border-[color:var(--color-info-border)] text-[var(--color-ink)]">
    <div className="max-w-6xl mx-auto px-4 py-8 md:px-6 md:py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="space-y-1">
        <p className="text-lg font-semibold">Портал ТСЖ</p>
        <p className="text-sm text-[var(--color-ink-soft)]">Прозрачное управление домом и удобный личный кабинет.</p>
      </div>
      <Link
        to="/dashboard"
        className="px-4 py-2.5 md:px-5 md:py-3 bg-primary text-primary-contrast font-semibold rounded-xl shadow-sm hover:bg-accent transition border border-[color:var(--color-info-border)]"
      >
        Открыть кабинет
      </Link>
    </div>
  </footer>
);

export default LandingFooter;
