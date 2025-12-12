import React from 'react';
import { BillingItem } from '../../pages/landingData';

type HowItWorksSectionProps = {
  steps: string[];
  billingItems: BillingItem[];
};

const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ steps, billingItems }) => (
  <section id="process" className="grid md:grid-cols-2 gap-10 items-center scroll-reveal scroll-mt-28 md:scroll-mt-32">
    <div className="space-y-4">
      <p className="text-sm font-semibold text-primary">Как это работает</p>
      <h2 className="text-3xl font-bold text-[var(--color-ink)]">Простое подключение и быстрый старт</h2>
      <p className="text-[var(--color-ink-soft)] leading-relaxed">
        Регистрируйтесь, добавляйте информацию о квартире и получайте доступ к ключевым сервисам. Все данные синхронизируются с базой управляющей компании.
      </p>
      <ul className="space-y-3 text-sm text-[var(--color-ink-soft)]">
        {steps.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="material-symbols-outlined text-primary mt-0.5">task_alt</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
    <div
      className="relative overflow-hidden rounded-2xl border border-[color:var(--color-info-border)] shadow-sm bg-[var(--color-info-surface)] backdrop-blur-sm scroll-reveal"
      style={{ transitionDelay: '120ms' }}
    >
      <div className="absolute inset-0 opacity-80 bg-[radial-gradient(circle_at_20%_20%,_rgba(35,51,35,0.12),_transparent_40%),_radial-gradient(circle_at_80%_0,_rgba(180,99,59,0.12),_transparent_35%)]" />
      <div className="relative p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary text-white flex items-center justify-center ring-2 ring-[color:var(--color-info-border)]">
            <span className="material-symbols-outlined">support</span>
          </div>
          <div>
            <p className="text-sm text-[var(--color-ink-soft)] font-medium">Поддержка жителей</p>
            <p className="text-lg font-semibold text-[var(--color-ink)]">Команда диспетчеров на связи</p>
          </div>
        </div>
        <div className="bg-[var(--color-sand)]/80 border border-[color:var(--color-info-border)] rounded-xl p-4 space-y-3 backdrop-blur">
          <div className="flex items-center justify-between text-sm text-[var(--color-ink-soft)]">
            <span className="font-medium text-[var(--color-ink)]">Оплата услуг</span>
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">Без комиссии</span>
          </div>
          <div className="space-y-3">
            {billingItems.map((item) => (
              <div
                key={item.title}
                className="flex items-center justify-between bg-[var(--color-info-surface)] rounded-xl px-3 py-2 border border-[color:var(--color-info-border)]"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">{item.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-ink)]">{item.title}</p>
                    <p className="text-xs text-[var(--color-ink-soft)]">{item.status}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-[var(--color-ink)]">{item.amount}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-sm text-[var(--color-ink-soft)] flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-primary">lock</span>
          Онлайн-оплата проходит через защищённый платёжный шлюз
        </div>
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
