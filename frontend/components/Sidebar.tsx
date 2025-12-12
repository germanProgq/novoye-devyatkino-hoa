import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const navItems = [
    { name: 'Главная', path: '/dashboard', icon: 'dashboard' },
    { name: 'Показания счетчиков', path: '/meters', icon: 'speed' },
    { name: 'Документы', path: '/documents', icon: 'folder' },
    { name: 'Новости', path: '/news', icon: 'newspaper' },
    { name: 'Вопросы и ответы', path: '/faq', icon: 'help' },
    { name: 'Админ-панель', path: '/admin', icon: 'admin_panel_settings' },
  ];

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
          {navItems.map((item) => (
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
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-10 h-10 rounded-full bg-[var(--color-info-surface)] text-[var(--color-ink-soft)] border border-[color:var(--color-info-border)] flex items-center justify-center">
              <span className="material-symbols-outlined">person</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-ink)] truncate">Александр П.</p>
              <p className="text-xs text-[var(--color-ink-soft)] truncate">Кв. 42</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
