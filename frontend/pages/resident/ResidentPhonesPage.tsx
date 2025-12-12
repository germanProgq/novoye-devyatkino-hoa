import React from 'react';
import { PHONE_CATEGORIES } from './data';
import { useScrollReveal } from './hooks';
import { toTelHref } from './utils';

const ResidentPhonesPage: React.FC = () => {
  useScrollReveal();

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="bg-white/80 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-6 md:p-8 space-y-4 scroll-reveal">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">call</span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)]/70 font-semibold">
                Полезные телефоны
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-ink)]">Информация для собственников жилья</h2>
              <p className="text-[var(--color-ink-soft)] leading-relaxed max-w-3xl">
                Экстренные контакты, служебные телефоны и приём должностных лиц.
              </p>
            </div>
          </div>
          <div className="px-4 py-3 bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] rounded-xl text-sm text-[var(--color-ink)]">
            <div className="font-semibold text-[var(--color-ink)]">Безопасность</div>
            <p className="text-[var(--color-ink-soft)]">Группа реагирования: 640-08-42, +7 (964) 361-87-48</p>
          </div>
        </div>
      </section>

      {PHONE_CATEGORIES.map((category, idx) => (
        <section
          key={category.title}
          className="bg-white/80 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-6 md:p-8 space-y-4 scroll-reveal"
          style={{ transitionDelay: `${60 + idx * 40}ms` }}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary">{category.icon}</span>
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-[var(--color-ink)]">{category.title}</h3>
                {category.highlight && <p className="text-[var(--color-ink-soft)]">{category.highlight}</p>}
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] text-xs font-semibold text-[var(--color-ink)]">
              {category.items.length} контактов
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {category.items.map((item, itemIdx) => (
              <div
                key={item.title}
                className="p-4 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)] shadow-sm scroll-reveal"
                style={{ transitionDelay: `${80 + itemIdx * 40}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]/70 font-semibold">{item.title}</p>
                    {item.person && <p className="text-sm font-semibold text-[var(--color-ink)] mt-1">{item.person}</p>}
                  </div>
                  <span className="material-symbols-outlined text-[var(--color-ink-soft)] text-base">{item.icon}</span>
                </div>

                <div className="mt-3 space-y-1 text-sm">
                  {item.description && <p className="text-[var(--color-ink-soft)]">{item.description}</p>}
                  {item.address && (
                    <p className="text-[var(--color-ink-soft)]">
                      <span className="material-symbols-outlined text-base align-middle mr-1 text-[var(--color-ink-soft)]">location_on</span>
                      {item.address}
                    </p>
                  )}
                  <div className="space-y-1">
                    {item.phones.map((phone) => (
                      <a
                        key={phone}
                        className="flex items-center gap-2 text-[var(--color-ink)] font-semibold hover:text-primary transition"
                        href={`tel:${toTelHref(phone)}`}
                      >
                        <span className="material-symbols-outlined text-base text-[var(--color-ink-soft)]">call</span>
                        {phone}
                      </a>
                    ))}
                  </div>
                  {item.schedule && (
                    <p className="text-xs text-[var(--color-ink-soft)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-[var(--color-ink-soft)]">schedule</span>
                      {item.schedule}
                    </p>
                  )}
                  {item.note && <p className="text-xs text-[var(--color-ink-soft)] leading-snug">{item.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default ResidentPhonesPage;
