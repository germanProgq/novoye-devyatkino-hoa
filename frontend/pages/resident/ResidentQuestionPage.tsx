import React, { useEffect, useMemo, useState } from 'react';
import { useScrollReveal } from './hooks';
import { toTelHref } from './utils';

type FormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  topic: string;
  message: string;
};

const initialState: FormState = {
  name: '',
  email: '',
  phone: '',
  address: '',
  topic: 'Общие вопросы',
  message: '',
};

const ResidentQuestionPage: React.FC = () => {
  useScrollReveal();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FormState>(initialState);

  useEffect(() => {
    if (!submitted) return;
    const id = window.setTimeout(() => setSubmitted(false), 3200);
    return () => window.clearTimeout(id);
  }, [submitted]);

  const handleChange = (key: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setForm(initialState);
  };

  const quickContacts = useMemo(
    () => [
      {
        label: 'Председатель ТСЖ',
        value: '8 (921) 939-55-70',
        icon: 'workspace_premium',
        email: 'v_ilya@inbox.ru',
      },
      {
        label: 'Бухгалтерия',
        value: '8 (812) 640-36-20',
        icon: 'account_balance_wallet',
        email: 'devytkino75@yandex.ru',
      },
    ],
    [],
  );

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-[color:var(--color-info-border)] shadow-sm bg-white/85 scroll-reveal">
        <div
          className="absolute inset-0 pointer-events-none opacity-45"
          aria-hidden
          style={{
            backgroundImage:
              'radial-gradient(120% 140% at 12% 18%, rgba(83,133,236,0.18), transparent 42%), radial-gradient(100% 120% at 80% 0%, rgba(135,175,255,0.14), transparent 36%)',
          }}
        />
        <div className="relative z-10 p-6 md:p-8 space-y-4 text-[var(--color-ink)]">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2 max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)]/80 font-semibold">Обращение к правлению</p>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">Задать вопрос правлению</h2>
              <p className="text-[var(--color-ink-soft)] leading-relaxed">
                Отправьте обращение онлайн: укажите контакты, тему и суть вопроса. Мы ответим в рабочие часы или перезвоним,
                если понадобится уточнение.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-ink)]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]">
              <span className="material-symbols-outlined text-base text-primary">lock_clock</span>
              Ответ в рабочее время
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]">
              <span className="material-symbols-outlined text-base text-primary">shield_person</span>
              Данные защищены
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="bg-white/80 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-6 md:p-8 space-y-4 scroll-reveal">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">forum</span>
            <div>
              <h3 className="text-xl font-bold text-[var(--color-ink)]">Форма обращения</h3>
              <p className="text-[var(--color-ink-soft)]">Заполните контактные данные и опишите вопрос.</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-[var(--color-ink)]">
                <span className="font-semibold">Имя и фамилия</span>
                <input
                  value={form.name}
                  onChange={handleChange('name')}
                  required
                  className="w-full rounded-xl border border-[color:var(--color-info-border)] bg-white/70 px-3 py-2 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                  placeholder="Например, Иван Петров"
                />
              </label>
              <label className="space-y-1 text-sm text-[var(--color-ink)]">
                <span className="font-semibold">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  required
                  className="w-full rounded-xl border border-[color:var(--color-info-border)] bg-white/70 px-3 py-2 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                  placeholder="you@example.com"
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-[var(--color-ink)]">
                <span className="font-semibold">Телефон</span>
                <input
                  value={form.phone}
                  onChange={handleChange('phone')}
                  required
                  className="w-full rounded-xl border border-[color:var(--color-info-border)] bg-white/70 px-3 py-2 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                  placeholder="+7 (___) ___-__-__"
                />
              </label>
              <label className="space-y-1 text-sm text-[var(--color-ink)]">
                <span className="font-semibold">Адрес/подъезд</span>
                <input
                  value={form.address}
                  onChange={handleChange('address')}
                  className="w-full rounded-xl border border-[color:var(--color-info-border)] bg-white/70 px-3 py-2 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                  placeholder="Дом, подъезд, квартира (при необходимости)"
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-[var(--color-ink)]">
                <span className="font-semibold">Тема обращения</span>
                <select
                  value={form.topic}
                  onChange={handleChange('topic')}
                  className="w-full rounded-xl border border-[color:var(--color-info-border)] bg-white/70 px-3 py-2 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                >
                  {['Общие вопросы', 'Финансы и начисления', 'Технические работы', 'Безопасность', 'Другое'].map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="space-y-1 text-sm text-[var(--color-ink)] block">
              <span className="font-semibold">Сообщение</span>
              <textarea
                value={form.message}
                onChange={handleChange('message')}
                required
                rows={5}
                className="w-full rounded-xl border border-[color:var(--color-info-border)] bg-white/70 px-3 py-2 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                placeholder="Опишите ситуацию, приложите детали — время, адрес, номера подъездов"
              />
            </label>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl border border-[color:var(--color-info-border)] bg-white hover:bg-[var(--color-info-surface)] text-[var(--color-ink)] font-semibold transition"
                  onClick={() => setForm(initialState)}
                >
                  Очистить
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold shadow-sm hover:-translate-y-0.5 hover:bg-accent transition"
                >
                  <span className="material-symbols-outlined text-base">send</span>
                  Отправить
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] rounded-2xl p-6 md:p-8 shadow-sm space-y-4 scroll-reveal" style={{ transitionDelay: '100ms' }}>
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">support_agent</span>
            <div>
              <h3 className="text-xl font-bold text-[var(--color-ink)]">Быстрые контакты</h3>
              <p className="text-[var(--color-ink-soft)]">Свяжитесь напрямую, если вопрос срочный.</p>
            </div>
          </div>
          <div className="grid gap-3">
            {quickContacts.map((contact, idx) => (
              <div
                key={contact.label}
                className="p-4 rounded-xl bg-white border border-[color:var(--color-info-border)] flex flex-col gap-2 scroll-reveal"
                style={{ transitionDelay: `${80 + idx * 40}ms` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]/70 font-semibold">{contact.label}</p>
                    <p className="text-base font-semibold text-[var(--color-ink)]">{contact.value}</p>
                  </div>
                  <span className="material-symbols-outlined text-[var(--color-ink-soft)] text-base">{contact.icon}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <a className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] text-primary font-semibold hover:text-accent transition" href={`tel:${toTelHref(contact.value)}`}>
                    <span className="material-symbols-outlined text-sm">call</span>
                    Позвонить
                  </a>
                  {contact.email && (
                    <a className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] text-primary font-semibold hover:text-accent transition" href={`mailto:${contact.email}`}>
                      <span className="material-symbols-outlined text-sm">mail</span>
                      Написать
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-xl bg-white/90 border border-[color:var(--color-info-border)] text-sm text-[var(--color-ink-soft)] space-y-2">
            <div className="flex items-center gap-2 text-[var(--color-ink)] font-semibold">
              <span className="material-symbols-outlined text-primary text-base">lightbulb</span>
              <span>Совет</span>
            </div>
            <p>Для вопросов по безопасности звоните охране: 640-08-42 или +7 (964) 361-87-48 — круглосуточно.</p>
          </div>
        </div>
      </section>

      {submitted && (
        <div className="fixed bottom-6 right-6 max-w-xs shadow-lg rounded-2xl bg-white border border-[color:var(--color-info-border)] p-4 flex items-start gap-3 animate-[fadeInUp_0.3s_ease]">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">mark_email_read</span>
          </div>
          <div className="text-sm">
            <div className="font-semibold text-[var(--color-ink)]">Обращение отправлено</div>
            <div className="text-[var(--color-ink-soft)]">Мы свяжемся с вами в ближайшее рабочее время.</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentQuestionPage;
