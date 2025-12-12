import React from 'react';

type RedirectToastProps = {
  label: string | null;
};

const RedirectToast: React.FC<RedirectToastProps> = ({ label }) => {
  if (!label) return null;

  return (
    <div className={`redirect-toast ${label ? 'redirect-toast--visible' : ''}`}>
      <div className="redirect-toast__icon">
        <span className="material-symbols-outlined text-primary text-lg">open_in_new</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-[var(--color-ink)]">Открываем сайт ТСЖ</div>
        <div className="text-xs text-[var(--color-ink-soft)] truncate">{label}</div>
        <div className="redirect-toast__progress" aria-hidden />
      </div>
    </div>
  );
};

export default RedirectToast;
