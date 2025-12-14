import React from 'react';
import { useTheme } from '../utils/theme';

type ThemeToggleProps = {
  variant?: 'chip' | 'icon';
  tone?: 'default' | 'inverted';
  className?: string;
};

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'chip',
  tone = 'default',
  className = '',
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Светлая тема' : 'Темная тема';
  const icon = isDark ? 'light_mode' : 'dark_mode';

  const baseClasses =
    variant === 'icon'
      ? 'inline-flex items-center justify-center rounded-lg border transition-colors'
      : 'inline-flex items-center gap-2 rounded-xl border text-sm font-semibold transition-colors';
  const toneClasses =
    tone === 'inverted'
      ? 'border-white/25 text-white bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.16)]'
      : 'border-[color:var(--color-info-border)] bg-white/70 text-[var(--color-ink)] hover:bg-[var(--color-info-surface)]';
  const padding = variant === 'icon' ? 'p-2' : 'px-3 py-2';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`${baseClasses} ${toneClasses} ${padding} ${className}`}
      aria-label={label}
    >
      <span className="material-symbols-outlined text-base leading-none">{icon}</span>
      {variant === 'chip' && <span>{label}</span>}
    </button>
  );
};

export default ThemeToggle;
