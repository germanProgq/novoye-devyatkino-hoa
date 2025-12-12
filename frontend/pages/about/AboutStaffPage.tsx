import React from 'react';
import { STAFF_MEMBERS } from './data';
import { useScrollReveal } from './hooks';
import { toTelHref } from './utils';

const AboutStaffPage: React.FC = () => {
  useScrollReveal({ threshold: 0.18 });

  const management = STAFF_MEMBERS.filter((member) => member.category === 'management');
  const security = STAFF_MEMBERS.find((member) => member.category === 'security');

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="bg-white/80 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-6 md:p-8 space-y-4 scroll-reveal">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">badge</span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)]/70 font-semibold">
                Сотрудники ТСЖ
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-ink)]">Контакты и приём</h2>
            </div>
          </div>
          {security && (
            <div className="px-4 py-3 bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] rounded-xl text-sm text-[var(--color-ink)] flex flex-col gap-1 min-w-[240px]">
              <div className="flex items-center gap-2 font-semibold">
                <span className="material-symbols-outlined text-primary">shield_person</span>
                <span>Охрана (круглосуточно)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--color-ink-soft)] text-base">call</span>
                <a className="text-[var(--color-ink)] font-semibold hover:text-primary transition" href={`tel:${toTelHref(security.phone)}`}>
                  {security.phone}
                </a>
              </div>
              {security.secondaryPhone && (
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--color-ink-soft)] text-base">sos</span>
                  <a className="text-[var(--color-ink)] font-semibold hover:text-primary transition" href={`tel:${toTelHref(security.secondaryPhone)}`}>
                    {security.secondaryPhone}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white/80 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-6 md:p-8 space-y-6 scroll-reveal">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">handshake</span>
          <div>
            <h3 className="text-xl font-bold text-[var(--color-ink)]">Руководство и бухгалтерия</h3>
            <p className="text-[var(--color-ink-soft)]">Основные контакты по приёму граждан и финансовым вопросам.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {management.map((member, idx) => (
            <div
              key={member.role}
              className="p-4 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)] scroll-reveal"
              style={{ transitionDelay: `${80 + idx * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]/70 font-semibold">{member.role}</p>
                  {member.name && <p className="text-lg font-semibold text-[var(--color-ink)] mt-1">{member.name}</p>}
                </div>
                <span className="material-symbols-outlined text-[var(--color-ink-soft)] text-base">{member.icon}</span>
              </div>
              <div className="mt-3 space-y-2 text-sm text-[var(--color-ink-soft)]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">call</span>
                  <a className="font-semibold text-[var(--color-ink)] hover:text-primary transition" href={`tel:${toTelHref(member.phone)}`}>
                    {member.phone}
                  </a>
                </div>
                {member.email && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">mail</span>
                    <a className="font-semibold text-primary hover:text-accent transition" href={`mailto:${member.email}`}>
                      {member.email}
                    </a>
                  </div>
                )}
                {member.schedule && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-[var(--color-ink-soft)]">schedule</span>
                    <span className="text-[var(--color-ink)]">{member.schedule}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white/80 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-6 md:p-8 space-y-6 scroll-reveal">
        <div className="flex items-center gap-3 justify-between flex-wrap">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">construction</span>
            <div>
              <h3 className="text-xl font-bold text-[var(--color-ink)]">Оперативные службы</h3>
              <p className="text-[var(--color-ink-soft)]">Контакты для технических вопросов, охраны и обслуживания территории.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STAFF_MEMBERS.filter((member) => member.category !== 'management').map((member, idx) => (
            <div
              key={member.role}
              className="p-4 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)] scroll-reveal"
              style={{ transitionDelay: `${60 + idx * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]/70 font-semibold">{member.role}</p>
                  {member.name && <p className="font-semibold text-[var(--color-ink)] mt-1 leading-snug">{member.name}</p>}
                </div>
                <span className="material-symbols-outlined text-[var(--color-ink-soft)] text-base">{member.icon}</span>
              </div>
              <div className="mt-3 space-y-2 text-sm text-[var(--color-ink-soft)]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">call</span>
                  <a className="font-semibold text-[var(--color-ink)] hover:text-primary transition" href={`tel:${toTelHref(member.phone)}`}>
                    {member.phone}
                  </a>
                </div>
                {member.secondaryPhone && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">sos</span>
                    <a className="font-semibold text-[var(--color-ink)] hover:text-primary transition" href={`tel:${toTelHref(member.secondaryPhone)}`}>
                      {member.secondaryPhone}
                    </a>
                  </div>
                )}
                {member.email && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">mail</span>
                    <a className="font-semibold text-primary hover:text-accent transition" href={`mailto:${member.email}`}>
                      {member.email}
                    </a>
                  </div>
                )}
                {member.schedule && (
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-base text-[var(--color-ink-soft)]">schedule</span>
                    <span className="text-[var(--color-ink)] leading-snug">{member.schedule}</span>
                  </div>
                )}
                {member.note && <p className="text-xs text-[var(--color-ink-soft)] leading-snug">{member.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AboutStaffPage;
