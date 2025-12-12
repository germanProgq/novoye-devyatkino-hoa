import React from 'react';
import { MapEmbed } from '../../components/landing/MapSection';
import { ABOUT_CONTACTS, ABOUT_REQUISITES, ABOUT_SCHEDULE } from './data';
import { useScrollReveal } from './hooks';
import { toTelHref } from './utils';

const AboutRequisitesPage: React.FC = () => {
  useScrollReveal({ threshold: 0.16 });

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="bg-white/80 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-6 md:p-8 space-y-6 scroll-reveal">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)]/70 font-semibold">
              Реквизиты и контакты
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-ink)]">{ABOUT_CONTACTS.name}</h2>
            <p className="text-[var(--color-ink-soft)] leading-relaxed max-w-3xl">
              Актуальные контакты правления, бухгалтерии и охраны, а также банковские реквизиты товарищества.
            </p>
          </div>
          <a
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-semibold shadow-sm hover:bg-accent transition"
            href={`mailto:${ABOUT_CONTACTS.email.value}`}
          >
            <span className="material-symbols-outlined text-base">edit_square</span>
            Написать нам
          </a>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-4 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)] space-y-2 scroll-reveal">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">where_to_vote</span>
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]/70 font-semibold">Адрес</p>
            </div>
            <p className="text-[var(--color-ink)] font-semibold leading-snug">{ABOUT_CONTACTS.address}</p>
          </div>

          <div className="p-4 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)] space-y-2 scroll-reveal" style={{ transitionDelay: '60ms' }}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">call</span>
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]/70 font-semibold">Телефон</p>
            </div>
            <div className="space-y-1 text-sm text-[var(--color-ink-soft)]">
              {ABOUT_CONTACTS.phones.map((phone) => (
                <div key={phone.label} className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-[var(--color-ink-soft)]">{phone.icon}</span>
                  <a className="font-semibold text-[var(--color-ink)] hover:text-primary transition" href={`tel:${toTelHref(phone.value)}`}>
                    {phone.value}
                  </a>
                  <span className="text-[var(--color-ink-soft)]/80">{phone.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)] space-y-2 scroll-reveal" style={{ transitionDelay: '120ms' }}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">mail</span>
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]/70 font-semibold">E-mail</p>
            </div>
            <a className="text-primary font-semibold inline-flex items-center gap-2 hover:text-accent transition" href={`mailto:${ABOUT_CONTACTS.email.value}`}>
              {ABOUT_CONTACTS.email.value}
              <span className="material-symbols-outlined text-sm">open_in_new</span>
            </a>
            <p className="text-xs text-[var(--color-ink-soft)] leading-snug">
              Электронная почта для обращений жителей и организаций.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="bg-white/80 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-6 md:p-8 space-y-4 scroll-reveal">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">schedule</span>
            <div>
              <h3 className="text-xl font-bold text-[var(--color-ink)]">Часы работы и приём</h3>
              <p className="text-[var(--color-ink-soft)]">График приёма правления, бухгалтерии и службы охраны.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {ABOUT_SCHEDULE.map((item, idx) => (
              <div
                key={`${item.label}-${item.time}-${item.note ?? idx}`}
                className="p-4 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)] scroll-reveal"
                style={{ transitionDelay: `${60 + idx * 50}ms` }}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">{item.icon ?? 'schedule'}</span>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">{item.label}</p>
                  <span className="text-[var(--color-ink-soft)]">—</span>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">{item.time}</p>
                </div>
                {item.note && <p className="text-xs text-[var(--color-ink-soft)] mt-1">{item.note}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/80 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-6 md:p-8 space-y-4 scroll-reveal" style={{ transitionDelay: '100ms' }}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">forum</span>
            <div>
              <h3 className="text-xl font-bold text-[var(--color-ink)]">Связаться прямо сейчас</h3>
              <p className="text-[var(--color-ink-soft)]">Позвоните или отправьте письмо — ответим в рабочие часы.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {ABOUT_CONTACTS.phones.slice(0, 2).map((phone) => (
              <a
                key={phone.label}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)] text-[var(--color-ink)] font-semibold hover:text-primary hover:-translate-y-0.5 transition"
                href={`tel:${toTelHref(phone.value)}`}
              >
                <span className="material-symbols-outlined text-sm">{phone.icon}</span>
                {phone.value}
              </a>
            ))}
            <a
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)] text-primary font-semibold hover:text-accent hover:-translate-y-0.5 transition"
              href={`mailto:${ABOUT_CONTACTS.email.value}`}
            >
              <span className="material-symbols-outlined text-sm">mail</span>
              {ABOUT_CONTACTS.email.value}
            </a>
          </div>
          <div className="text-xs text-[var(--color-ink-soft)] leading-snug">
            Охрана работает круглосуточно. Для вопросов по оплате и начислениям используйте контакты бухгалтерии.
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="bg-white/80 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-6 md:p-8 space-y-4 scroll-reveal">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">receipt_long</span>
            <div>
              <h3 className="text-xl font-bold text-[var(--color-ink)]">Реквизиты организации</h3>
              <p className="text-[var(--color-ink-soft)]">Данные для оплаты и официальных запросов.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-sm text-[var(--color-ink)]">
            <div className="p-4 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)]">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]/70 font-semibold">ИНН / КПП</p>
              <p className="font-semibold mt-1">{ABOUT_REQUISITES.inn}</p>
              <p className="font-semibold">{ABOUT_REQUISITES.kpp}</p>
            </div>
            <div className="p-4 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)]">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]/70 font-semibold">Расчётный счёт</p>
              <p className="font-semibold mt-1 leading-snug">{ABOUT_REQUISITES.account}</p>
              <p className="text-[var(--color-ink-soft)] text-xs mt-1">{ABOUT_REQUISITES.bank}</p>
              <p className="text-xs text-[var(--color-ink-soft)] mt-1">БИК {ABOUT_REQUISITES.bic}</p>
            </div>
            <div className="p-4 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)]">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]/70 font-semibold">Кор. счёт</p>
              <p className="font-semibold mt-1">{ABOUT_REQUISITES.correspondentAccount}</p>
            </div>
            <div className="p-4 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)]">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]/70 font-semibold">Юр. адрес</p>
              <p className="font-semibold mt-1 leading-snug">{ABOUT_REQUISITES.legalAddress}</p>
              <p className="text-xs text-[var(--color-ink-soft)] mt-1">Руководитель: {ABOUT_REQUISITES.director}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-6 md:p-8 space-y-4 scroll-reveal" style={{ transitionDelay: '120ms' }}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">map</span>
            <div>
              <h3 className="text-xl font-bold text-[var(--color-ink)]">Карта и проезд</h3>
             </div>
          </div>
          <MapEmbed iframeClassName="w-full h-72" />
          <p className="text-xs text-[var(--color-ink-soft)]">Загрузка карты может занять несколько секунд.</p>
        </div>
      </section>
    </div>
  );
};

export default AboutRequisitesPage;
