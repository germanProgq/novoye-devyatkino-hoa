import React from 'react';
import { USEFUL_LINK_CATEGORIES } from './data';
import { useScrollReveal } from './hooks';

const ResidentLinksPage: React.FC = () => {
  useScrollReveal();

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="bg-white/80 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-6 md:p-8 space-y-4 scroll-reveal">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">public</span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)]/70 font-semibold">
                Полезные сайты
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-ink)]">Рекомендованные ресурсы</h2>
              <p className="text-[var(--color-ink-soft)] leading-relaxed max-w-3xl">
                Официальные порталы муниципалитета и региона, а также сервисы для жителей Нового Девяткино.
              </p>
            </div>
          </div>
          <div className="px-4 py-3 bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] rounded-xl text-sm text-[var(--color-ink)]">
            <div className="font-semibold text-[var(--color-ink)]">Муниципальные ресурсы</div>
            <p className="text-[var(--color-ink-soft)]">Всеволожский район и Ленинградская область</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {USEFUL_LINK_CATEGORIES.map((category, idx) => (
          <div
            key={category.title}
            className="bg-white/80 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-5 md:p-6 space-y-3 scroll-reveal"
            style={{ transitionDelay: `${80 + idx * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary">{category.icon}</span>
                <div>
                  <h3 className="text-xl font-bold text-[var(--color-ink)]">{category.title}</h3>
                  <p className="text-sm text-[var(--color-ink-soft)]">Проверенные источники и онлайн-сервисы</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] text-xs font-semibold text-[var(--color-ink)]">
                {category.items.length}
              </span>
            </div>

            <div className="space-y-3">
              {category.items.map((item, itemIdx) => (
                <a
                  key={item.url}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block p-4 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)] hover:border-primary/60 hover:-translate-y-0.5 transition scroll-reveal"
                  style={{ transitionDelay: `${120 + itemIdx * 40}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-base text-primary">{item.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-ink)] leading-snug">{item.title}</p>
                        {item.description && (
                          <p className="text-xs text-[var(--color-ink-soft)] mt-1">{item.description}</p>
                        )}
                        <p className="text-xs text-primary font-semibold mt-1">{item.url.replace(/^https?:\/\//, '')}</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-[var(--color-ink-soft)] text-sm">open_in_new</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};

export default ResidentLinksPage;
