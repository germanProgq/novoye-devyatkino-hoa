import React from 'react';
import { useScrollReveal } from './hooks';

const ResidentContactsPage: React.FC = () => {
  useScrollReveal();

  return (
    <div className="bg-white/80 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-6 md:p-8 space-y-5 scroll-reveal">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-primary">apartment</span>
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-ink)]">Контакты ТСЖ</h2>
          <p className="text-[var(--color-ink-soft)]">Оперативные способы связи для жителей</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          { label: 'Адрес', value: '188661, Ленинградская обл., Всеволожский р-н, деревня Новое Девяткино, д. 75А', icon: 'location_on' },
          { label: 'Телефон', value: '8 (812) 640-36-20', icon: 'call' },
          { label: 'Электронная почта', value: 'devytkino75@yandex.ru', icon: 'mail', link: 'mailto:devytkino75@yandex.ru' },
          { label: 'Сайт', value: 'новоедевяткино75.рф', icon: 'public', link: 'https://новоедевяткино75.рф' },
        ].map((item) => (
          <div key={item.label} className="p-4 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)] flex items-start gap-3">
            <span className="material-symbols-outlined text-[var(--color-ink-soft)]">{item.icon}</span>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]/70 font-semibold">{item.label}</p>
              {item.link ? (
                <a href={item.link} className="text-base font-semibold text-primary hover:text-accent transition">
                  {item.value}
                </a>
              ) : (
                <p className="text-base font-semibold text-[var(--color-ink)]">{item.value}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-4 rounded-xl border border-[color:var(--color-info-border)] bg-white/70">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]/70 font-semibold">Режим работы</p>
          <ul className="mt-2 space-y-2 text-sm text-[var(--color-ink)]">
            <li className="flex justify-between gap-3">
              <span className="text-[var(--color-ink-soft)]">Пн-Пт</span>
              <span className="font-semibold">10:00 - 18:00</span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-[var(--color-ink-soft)]">Перерыв</span>
              <span className="font-semibold">13:00 - 14:00</span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-[var(--color-ink-soft)]">Выходные</span>
              <span className="font-semibold">Суббота и воскресенье</span>
            </li>
          </ul>
        </div>
        <div className="p-4 rounded-xl border border-[color:var(--color-info-border)] bg-white/70 space-y-2">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]/70 font-semibold">Прием руководства</p>
          <p className="text-sm text-[var(--color-ink-soft)]">Председатель правления: вторник с 20:00 до 21:00.</p>
          <p className="text-sm text-[var(--color-ink-soft)]">Бухгалтер: вторник 18:00-20:00, четверг 11:00-13:00.</p>
          <div className="flex items-center gap-2 pt-1">
            <span className="material-symbols-outlined text-[var(--color-ink-soft)] text-base">phone</span>
            <span className="font-semibold text-[var(--color-ink)]">8 (921) 939-55-70</span>
          </div>
          <a className="text-primary font-semibold inline-flex items-center gap-1 hover:text-accent transition" href="mailto:v_ilya@inbox.ru">
            v_ilya@inbox.ru
            <span className="material-symbols-outlined text-sm">open_in_new</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default ResidentContactsPage;
