import React from 'react';
import RedirectToast from './RedirectToast';
import { HOUSES, TOTAL_HOUSE_AREA } from './data';
import { useRedirectToast, useScrollReveal } from './hooks';
import { formatArea } from './utils';

const AboutSvedeniyaPage: React.FC = () => {
  useScrollReveal({ threshold: 0.14, rootMargin: '0px 0px -12% 0px' });
  const { redirectingTo, handleRedirect } = useRedirectToast();

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="bg-white/80 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-6 md:p-8 space-y-4 scroll-reveal">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)]/70 font-semibold">
              Сведения о ТСЖ
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-ink)]">ТСЖ «Новое Девяткино 75»</h2>
            <p className="text-[var(--color-ink-soft)] max-w-2xl leading-relaxed">
              Открытая информация по Постановлению Правительства РФ №731 от 23 сентября 2010 г. Актуальные данные
              о товариществе и контактных лицах опубликованы для жителей и заинтересованных организаций.
            </p>
            <div className="flex flex-wrap gap-2 text-sm">
              {[
                { label: 'ИНН', value: '4703112280', icon: 'verified' },
                { label: 'КПП', value: '470301001', icon: 'badge' },
                { label: 'Дата регистрации', value: '15.07.2009', icon: 'event' },
              ].map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] text-[var(--color-ink)]"
                >
                  <span className="material-symbols-outlined text-base text-primary">{item.icon}</span>
                  <span className="font-semibold">
                    {item.label}: {item.value}
                  </span>
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full sm:w-auto min-w-[260px]">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]">
              <span className="material-symbols-outlined text-primary text-2xl">gavel</span>
              <div className="leading-snug">
                <div className="text-sm font-semibold text-[var(--color-ink)]">Постановление №731</div>
                <div className="text-[var(--color-ink-soft)]">от 23.09.2010 г.</div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]">
              <span className="material-symbols-outlined text-primary text-2xl">where_to_vote</span>
              <div className="leading-snug">
                <div className="text-sm font-semibold text-[var(--color-ink)]">Адрес правления</div>
                <div className="text-[var(--color-ink-soft)]">
                  188661, Ленинградская обл., Всеволожский р-н, деревня Новое Девяткино, д. 75А
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="bg-white/80 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-6 md:p-8 space-y-5 scroll-reveal">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">apartment</span>
            <div>
              <h3 className="text-xl font-bold text-[var(--color-ink)]">Общая информация</h3>
              <p className="text-[var(--color-ink-soft)]">Товарищество собственников жилья «Новое Девяткино 75»</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: 'Полное наименование', value: 'Товарищество собственников жилья «Новое Девяткино 75»' },
              { label: 'Сокращенное наименование', value: 'ТСЖ «Новое Девяткино 75»' },
              { label: 'Председатель правления', value: 'Васильев Илья Анатольевич' },
              { label: 'ИНН', value: '4703112280' },
              { label: 'КПП', value: '470301001' },
            ].map((item, idx) => (
              <div
                key={item.label}
                className="p-4 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)] scroll-reveal"
                style={{ transitionDelay: `${60 + idx * 50}ms` }}
              >
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]/70 font-semibold">{item.label}</p>
                <p className="text-base md:text-lg font-semibold text-[var(--color-ink)] mt-1 leading-snug">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div
          className="bg-white/80 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-6 md:p-8 space-y-4 scroll-reveal"
          style={{ transitionDelay: '120ms' }}
        >
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">how_to_reg</span>
            <div>
              <h3 className="text-xl font-bold text-[var(--color-ink)]">Регистрационные данные</h3>
              <p className="text-[var(--color-ink-soft)]">Документы о регистрации товарищества</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: 'ОГРН', value: '1094703002701' },
              { label: 'Дата регистрации', value: '15.07.2009' },
              { label: 'Наименование регистрирующего органа', value: 'ИФНС России по Всеволожскому району Ленинградской области' },
            ].map((item, idx) => (
              <div
                key={item.label}
                className="p-4 rounded-xl border border-[color:var(--color-info-border)] bg-white/70 scroll-reveal"
                style={{ transitionDelay: `${100 + idx * 60}ms` }}
              >
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]/70 font-semibold">{item.label}</p>
                <p className="text-base font-semibold text-[var(--color-ink)] mt-1 leading-snug">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--color-ink-soft)]">
            <span className="material-symbols-outlined text-base text-primary">history_edu</span>
            <span>Данные соответствуют Постановлению Правительства РФ №731.</span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="bg-white/80 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-6 md:p-8 space-y-4 scroll-reveal">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">call</span>
            <div>
              <h3 className="text-xl font-bold text-[var(--color-ink)]">Контактная информация</h3>
              <p className="text-[var(--color-ink-soft)]">Адрес, телефон, электронная почта и сайты ТСЖ</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[var(--color-ink-soft)]">location_on</span>
              <div>
                <p className="text-sm text-[var(--color-ink-soft)]">Адрес</p>
                <p className="font-semibold text-[var(--color-ink)]">
                  188661, Ленинградская обл., Всеволожский р-н, деревня Новое Девяткино, д. 75А
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[var(--color-ink-soft)]">phone</span>
              <div>
                <p className="text-sm text-[var(--color-ink-soft)]">Телефон</p>
                <p className="font-semibold text-[var(--color-ink)]">8 (812) 640-36-20</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[var(--color-ink-soft)]">mail</span>
              <div>
                <p className="text-sm text-[var(--color-ink-soft)]">Электронная почта</p>
                <a className="font-semibold text-primary hover:text-accent transition" href="mailto:devytkino75@yandex.ru">
                  devytkino75@yandex.ru
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[var(--color-ink-soft)]">public</span>
              <div className="space-y-2">
                <p className="text-sm text-[var(--color-ink-soft)]">Сайт ТСЖ</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'новоедевяткино75.рф', url: 'https://новоедевяткино75.рф' },
                    { label: 'www.novoedevyatkino75.ru', url: 'https://www.novoedevyatkino75.ru' },
                  ].map((link, idx) => (
                    <a
                      key={link.url}
                      href={link.url}
                      onClick={handleRedirect(link.url, link.label)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[color:var(--color-info-border)] bg-white/80 text-primary font-semibold hover:-translate-y-0.5 hover:shadow-sm transition"
                      rel="noreferrer"
                      target="_blank"
                      style={{ transitionDelay: `${80 + idx * 40}ms` }}
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="bg-white/80 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-6 md:p-8 space-y-5 scroll-reveal"
          style={{ transitionDelay: '80ms' }}
        >
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">schedule</span>
            <div>
              <h3 className="text-xl font-bold text-[var(--color-ink)]">График работы и прием</h3>
              <p className="text-[var(--color-ink-soft)]">
                Ежедневно с 10:00 до 18:00, кроме субботы и воскресенья. Перерыв на обед с 13:00 до 14:00.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div
              className="p-4 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)] scroll-reveal"
              style={{ transitionDelay: '120ms' }}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person</span>
                <p className="font-semibold text-[var(--color-ink)]">Председатель ТСЖ</p>
              </div>
              <p className="text-sm text-[var(--color-ink-soft)] mt-1">Васильев Илья Анатольевич</p>
              <div className="flex items-center gap-2 mt-2 text-sm font-semibold text-[var(--color-ink)]">
                <span className="material-symbols-outlined text-[var(--color-ink-soft)] text-base">call</span>
                8 (921) 939-55-70
              </div>
              <a className="text-primary font-semibold inline-flex items-center gap-1 hover:text-accent transition text-sm" href="mailto:v_ilya@inbox.ru">
                v_ilya@inbox.ru
                <span className="material-symbols-outlined text-sm">north_east</span>
              </a>
              <p className="text-xs text-[var(--color-ink-soft)] mt-2">Прием граждан: вторник с 20:00 до 21:00.</p>
            </div>

            <div
              className="p-4 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)] scroll-reveal"
              style={{ transitionDelay: '160ms' }}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
                <p className="font-semibold text-[var(--color-ink)]">Бухгалтер</p>
              </div>
              <p className="text-sm text-[var(--color-ink-soft)] mt-1">Прием граждан:</p>
              <ul className="text-sm text-[var(--color-ink)] mt-1 space-y-1">
                <li>Вторник — 18:00–20:00</li>
                <li>Четверг — 11:00–13:00</li>
              </ul>
              <p className="text-xs text-[var(--color-ink-soft)] mt-2">
                Ежедневно с 10:00 до 18:00, выходные: суббота и воскресенье. Перерыв 13:00–14:00.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white/80 border border-[color:var(--color-info-border)] shadow-sm rounded-2xl p-6 md:p-8 space-y-5 scroll-reveal">
        <div className="flex items-start gap-3 justify-between flex-wrap">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">apartment</span>
            <div>
              <h3 className="text-xl font-bold text-[var(--color-ink)]">Перечень многоквартирных домов</h3>
              <p className="text-[var(--color-ink-soft)]">
                188661, Ленинградская обл., Всеволожский р-н, Новое Девяткино, д. 75, А
              </p>
            </div>
          </div>
          <div className="px-4 py-2 rounded-lg bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] text-sm font-semibold text-[var(--color-ink)]">
            Общая площадь: {formatArea(TOTAL_HOUSE_AREA, 3)} м²
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {HOUSES.map((house, idx) => (
            <div
              key={house.name}
              className="p-4 rounded-xl border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)] scroll-reveal"
              style={{ transitionDelay: `${60 + idx * 20}ms` }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-[var(--color-ink)]">{house.name}</p>
                <span className="material-symbols-outlined text-[var(--color-ink-soft)] text-base">architecture</span>
              </div>
              <p className="text-sm text-[var(--color-ink-soft)] mt-1">
                Общая площадь: <span className="font-semibold text-[var(--color-ink)]">{formatArea(house.area, 3)} м²</span>
              </p>
              {house.note && (
                <span className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-soft)] mt-2 px-2 py-1 rounded-lg bg-white/80 border border-[color:var(--color-info-border)]">
                  <span className="material-symbols-outlined text-sm text-primary">home_pin</span>
                  {house.note}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <RedirectToast label={redirectingTo} />
    </div>
  );
};

export default AboutSvedeniyaPage;
