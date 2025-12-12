import React from 'react';
import { Contact } from '../../pages/landingData';

type ContactsSectionProps = {
  contacts: Contact[];
};

const isEmailValue = (value: string) => value.includes('@');
const isPhoneLabel = (label: string) => /тел|связь/i.test(label);
const normalizePhone = (value: string) => value.replace(/[^+\d]/g, '');

const ContactsSection: React.FC<ContactsSectionProps> = ({ contacts }) => (
  <section id="contacts" className="space-y-6 scroll-mt-28 md:scroll-mt-32">
    <div>
      <p className="text-sm font-semibold text-primary">Контакты</p>
      <h2 className="text-3xl font-bold text-[var(--color-ink)]">Связь с ТСЖ и службами</h2>
    </div>
    <div className="grid md:grid-cols-3 gap-4">
      {contacts.map((contact, idx) => (
        <div
          key={contact.title}
          className="bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] rounded-xl p-5 flex flex-col gap-3 scroll-reveal"
          style={{ transitionDelay: `${idx * 100}ms` }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-[color:var(--color-info-border)]">
              <span className="material-symbols-outlined text-primary">{contact.icon}</span>
            </div>
            <div>
              <p className="text-sm text-[var(--color-ink-soft)]">Контакт</p>
              <p className="text-base font-semibold text-[var(--color-ink)]">{contact.title}</p>
            </div>
          </div>
          <div className="space-y-2">
            {contact.details.map((detail) => (
              <div key={`${contact.title}-${detail.label}-${detail.value}`} className="flex flex-col">
                <span className="text-xs uppercase tracking-wide text-[var(--color-ink-soft)]">{detail.label}</span>
                {isEmailValue(detail.value) ? (
                  <a
                    href={`mailto:${detail.value}`}
                    className="text-sm text-[var(--color-ink)] hover:text-primary underline decoration-dotted md:no-underline md:hover:underline"
                  >
                    {detail.value}
                  </a>
                ) : isPhoneLabel(detail.label) ? (
                  <a
                    href={`tel:${normalizePhone(detail.value)}`}
                    className="text-sm text-[var(--color-ink)] hover:text-primary underline decoration-dotted md:no-underline md:hover:underline"
                  >
                    {detail.value}
                  </a>
                ) : (
                  <span className="text-sm text-[var(--color-ink)]">{detail.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default ContactsSection;
