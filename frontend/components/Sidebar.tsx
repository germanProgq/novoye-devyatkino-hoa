import React, { useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { SessionUser, isAdmin } from '../utils/auth';

const Sidebar: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user: SessionUser;
  onLogout: () => void;
  onSwitchAccount: () => void;
}> = ({ isOpen, onClose, user, onLogout, onSwitchAccount }) => {
  const navItems = [
    { name: 'Главная', path: '/dashboard', icon: 'dashboard' },
    // { name: 'Показания счетчиков', path: '/meters', icon: 'speed' },
    { name: 'Документы', path: '/documents', icon: 'folder' },
    { name: 'Новости', path: '/news', icon: 'newspaper' },
    { name: 'Заявки', path: '/requests', icon: 'assignment' },
    { name: 'Вопросы и ответы', path: '/faq', icon: 'help' },
    { name: 'Админ-панель', path: '/admin', icon: 'admin_panel_settings' },
  ];
  const visibleNavItems = isAdmin(user) ? navItems : navItems.filter((item) => item.path !== '/admin');

  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const name = useMemo(() => user.username || 'Неизвестный', [user.username]);
  const meta = useMemo(() => (isAdmin(user) ? 'Администратор' : 'Пользователь'), [user]);

  const handleLogout = () => {
    onLogout();
    setMenuOpen(false);
    if (window.innerWidth < 1024) onClose();
    navigate('/', { replace: true });
  };

  const handleSwitchAccount = () => {
    onSwitchAccount();
    setMenuOpen(false);
    if (window.innerWidth < 1024) onClose();
    navigate('/login', { replace: true });
  };

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 w-64 bg-white/90 backdrop-blur border-r border-[color:var(--color-info-border)] transform transition-transform duration-300 ease-in-out
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    lg:relative lg:translate-x-0
  `;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={sidebarClasses}>
        <div className="flex items-center gap-3 px-6 h-16 border-b border-[color:var(--color-info-border)]">
          <img
            src="/images/gerb250.jpg"
            alt="Герб"
            className="w-10 h-10 object-cover rounded-lg bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]"
          />
          <span className="text-xl font-bold text-[var(--color-ink)]">Портал ТСЖ</span>
        </div>

        <nav className="p-4 space-y-1">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => { if(window.innerWidth < 1024) onClose(); }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary ring-1 ring-[color:var(--color-info-border)]'
                    : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-info-surface)] hover:text-[var(--color-ink)]'
                }`
              }
            >
              <span className={`material-symbols-outlined ${item.path === '/' ? '' : ''}`}>
                {item.icon}
              </span>
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[color:var(--color-info-border)]">
          <div className="relative">
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex items-center gap-3 w-full px-4 py-2 text-left rounded-xl hover:bg-[var(--color-info-surface)] transition"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--color-info-surface)] text-[var(--color-ink-soft)] border border-[color:var(--color-info-border)] flex items-center justify-center">
                <span className="material-symbols-outlined">person</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-ink)] truncate">{name}</p>
                <p className="text-xs text-[var(--color-ink-soft)] truncate">{meta}</p>
              </div>
              <span className="material-symbols-outlined text-[var(--color-ink-soft)]">expand_more</span>
            </button>

            {menuOpen && (
              <div className="absolute bottom-14 left-4 right-4 bg-white border border-[color:var(--color-info-border)] shadow-xl rounded-xl overflow-hidden z-20">
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
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
