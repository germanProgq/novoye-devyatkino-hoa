import React, { useEffect, useState } from 'react';
import { BOARD_CHAIR, BOARD_MEMBERS } from './data';
import { useScrollReveal } from './hooks';
import { toTelHref } from './utils';

const AboutBoardPage: React.FC = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useScrollReveal({ threshold: 0.22, rootMargin: '0px 0px -12% 0px' });

  return (
    <div
      className={`space-y-6 md:space-y-8 transition-all duration-700 ease-out ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
    >
      <section className="bg-white/80 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-6 md:p-8 space-y-4 scroll-reveal">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">groups</span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)]/70 font-semibold">
                Правление ТСЖ
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-ink)]">Состав и контакты правления</h2>
              <p className="text-[var(--color-ink-soft)] leading-relaxed max-w-3xl">
                Официальные контакты правления ТСЖ «Новое Девяткино 75».
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 text-sm text-[var(--color-ink)]">
          <div className="p-4 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)]">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]/70 font-semibold">Роль</p>
            <p className="font-semibold mt-1">{BOARD_CHAIR.role}</p>
            <p className="text-[var(--color-ink-soft)]">Ответственный за работу товарищества</p>
          </div>
          <div className="p-4 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)]">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]/70 font-semibold">Состав</p>
            <p className="font-semibold mt-1">1 председатель и {BOARD_MEMBERS.length} членов правления</p>
            <p className="text-[var(--color-ink-soft)]">Утверждены на общем собрании</p>
          </div>
          <div className="p-4 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)]">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]/70 font-semibold">Контакты</p>
            <p className="font-semibold mt-1">{BOARD_CHAIR.phone}</p>
            <a className="text-primary font-semibold hover:text-accent transition" href={`mailto:${BOARD_CHAIR.email}`}>
              {BOARD_CHAIR.email}
            </a>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="bg-white/80 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-6 md:p-8 space-y-4 scroll-reveal">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">workspace_premium</span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-soft)]/70 font-semibold">
                Председатель правления
              </p>
              <h3 className="text-xl md:text-2xl font-bold text-[var(--color-ink)]">{BOARD_CHAIR.name}</h3>
              <p className="text-[var(--color-ink-soft)]">
                Готов отвечать на вопросы жителей и организовывать работу правления.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] text-sm font-semibold text-[var(--color-ink)]">
              <span className="material-symbols-outlined text-sm">schedule</span>
              График приема: {BOARD_CHAIR.schedule}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <a
              className="flex items-start gap-3 p-4 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)] hover:border-primary/60 transition"
              href={`tel:${toTelHref(BOARD_CHAIR.phone)}`}
            >
              <span className="material-symbols-outlined text-[var(--color-ink-soft)]">call</span>
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]/70 font-semibold">Телефон</p>
                <p className="font-semibold text-[var(--color-ink)]">{BOARD_CHAIR.phone}</p>
                <p className="text-[var(--color-ink-soft)] text-sm">Лучше звонить в рабочее время</p>
              </div>
            </a>

            <a
              className="flex items-start gap-3 p-4 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)] hover:border-primary/60 transition"
              href={`mailto:${BOARD_CHAIR.email}`}
            >
              <span className="material-symbols-outlined text-[var(--color-ink-soft)]">mail</span>
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]/70 font-semibold">Эл. почта</p>
                <p className="font-semibold text-primary">{BOARD_CHAIR.email}</p>
                <p className="text-[var(--color-ink-soft)] text-sm">Для письменных запросов и обращений</p>
              </div>
            </a>
          </div>

          <div className="p-4 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)]">
            <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
              Приоритетные вопросы: организация собраний, координация работ по дому, обработка обращений жителей и
              взаимодействие с подрядчиками. Для оперативных вопросов удобнее звонить, для фиксирования просьбы —
              отправить письмо на указанную почту.
            </p>
          </div>
        </div>

        <div className="bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] rounded-2xl p-6 md:p-8 shadow-sm space-y-4 scroll-reveal" style={{ transitionDelay: '120ms' }}>
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">chat</span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-soft)]/70 font-semibold">
                Как обратиться
              </p>
              <h3 className="text-xl font-bold text-[var(--color-ink)]">Оперативная связь с правлением</h3>
              <p className="text-[var(--color-ink-soft)]">
                Используйте телефон или электронную почту председателя. Письменные запросы помогают фиксировать детали.
              </p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-[var(--color-ink)]">
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-base text-[var(--color-ink-soft)]">task_alt</span>
              <span>Обращения по содержанию дома и придомовой территории.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-base text-[var(--color-ink-soft)]">task_alt</span>
              <span>Вопросы к смете, планам работ и решениям общих собраний.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-base text-[var(--color-ink-soft)]">task_alt</span>
              <span>Пожелания по цифровым сервисам ТСЖ и передаче показаний.</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="bg-white/80 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-6 md:p-8 space-y-4 scroll-reveal">
        <div className="flex items-start gap-3 justify-between flex-wrap">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">diversity_3</span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-soft)]/70 font-semibold">
                Члены правления
              </p>
              <h3 className="text-xl md:text-2xl font-bold text-[var(--color-ink)]">Команда правления</h3>
              <p className="text-[var(--color-ink-soft)] max-w-2xl">
                Актуальные контакты членов правления для консультаций по отдельным вопросам.
              </p>
            </div>
          </div>
          <div className="px-4 py-2 rounded-lg bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] text-sm font-semibold text-[var(--color-ink)]">
            {BOARD_MEMBERS.length} представителей
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BOARD_MEMBERS.map((member, index) => (
            <div
              key={member.name}
              className="p-4 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)] shadow-sm scroll-reveal"
              style={{ transitionDelay: `${60 + index * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]/70 font-semibold">Член правления</p>
                  <p className="font-semibold text-[var(--color-ink)] mt-1 leading-snug">{member.name}</p>
                </div>
                <span className="material-symbols-outlined text-[var(--color-ink-soft)] text-base">verified</span>
              </div>
              <div className="mt-3 space-y-2 text-sm text-[var(--color-ink-soft)]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">call</span>
                  <a className="font-semibold text-[var(--color-ink)] hover:text-primary transition" href={`tel:${toTelHref(member.phone)}`}>
                    {member.phone}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">mail</span>
                  {member.email ? (
                    <a className="font-semibold text-primary hover:text-accent transition" href={`mailto:${member.email}`}>
                      {member.email}
                    </a>
                  ) : (
                    <span className="text-[var(--color-ink-soft)]/80">Эл. почта не указана</span>
                  )}
                </div>
                {member.note && <p className="text-xs text-[var(--color-ink-soft)]">{member.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AboutBoardPage;
