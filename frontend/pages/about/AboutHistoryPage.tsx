import React from 'react';
import { HISTORY_SECTIONS } from './data';
import { useScrollReveal } from './hooks';

const AboutHistoryPage: React.FC = () => {
  useScrollReveal({ threshold: 0.18 });

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="bg-white/80 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-6 md:p-8 space-y-4 scroll-reveal">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-primary">history_edu</span>
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)]/70 font-semibold">
              Историческая справка
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-ink)]">История деревни Девяткино</h2>
            <p className="text-[var(--color-ink-soft)] leading-relaxed max-w-3xl">
              Краткое изложение ключевых этапов истории деревни Девяткино и современного Нового Девяткино: от переноса
              в 1888 году до статуса крупнейшего населённого пункта Ленинградской области.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {HISTORY_SECTIONS.map((section, idx) => (
          <article
            key={section.title}
            className="p-5 md:p-6 bg-white/80 border border-[color:var(--color-info-border)] rounded-2xl shadow-sm scroll-reveal flex flex-col gap-3"
            style={{ transitionDelay: `${80 + idx * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary">{section.icon}</span>
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]/70 font-semibold">Раздел</p>
                  <h3 className="text-lg md:text-xl font-bold text-[var(--color-ink)] leading-snug">{section.title}</h3>
                </div>
              </div>
              {section.badge && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] text-xs font-semibold text-[var(--color-ink)]">
                  <span className="material-symbols-outlined text-sm text-primary">calendar_month</span>
                  {section.badge}
                </span>
              )}
            </div>
            <div className="space-y-2 text-[var(--color-ink-soft)] leading-relaxed text-sm md:text-base">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-[var(--color-ink-soft)]">
                  {paragraph}
                </p>
              ))}
            </div>
            {section.list && (
              <ul className="space-y-2 text-sm text-[var(--color-ink)]">
                {section.list.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-base text-[var(--color-ink-soft)]">task_alt</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </section>
    </div>
  );
};

export default AboutHistoryPage;
