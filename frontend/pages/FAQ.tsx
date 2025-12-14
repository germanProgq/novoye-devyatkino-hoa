import React, { useState } from 'react';
import { FaqItem } from '../types';

const faqData: FaqItem[] = [
  {
    category: 'Оплата',
    question: 'Как получить квитанцию на электронную почту?',
    answer: 'Чтобы получать квитанции в электронном виде, перейдите в раздел "Настройки профиля" и поставьте галочку напротив пункта "Электронные квитанции". Квитанции будут приходить 1-го числа каждого месяца.'
  },
  {
    category: 'Счетчики',
    question: 'Что делать, если я ошибся при вводе показаний?',
    answer: 'Если вы заметили ошибку до 25-го числа текущего месяца, вы можете повторно отправить показания. Система учтет последние переданные данные. Если период закрыт, свяжитесь с бухгалтерией.'
  },
  {
    category: 'Доступ',
    question: 'Как заказать пропуск для гостей на автомобиль?',
    answer: 'Заказать гостевой пропуск можно через мобильное приложение или позвонив на пост охраны по номеру +7 (999) 000-03-03. Сообщите марку и номер автомобиля.'
  },
  {
    category: 'Ремонт',
    question: 'В какое время разрешено проводить шумные работы?',
    answer: 'Согласно уставу ТСЖ и закону о тишине, шумные ремонтные работы разрешены с 09:00 до 19:00 в будние дни. В субботу — с 10:00 до 16:00. В воскресенье и праздники шумные работы запрещены.'
  }
];

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-8">
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-primary to-accent py-16 px-8 text-center text-white">
        <div className="absolute inset-0 opacity-25">
          <img src="https://picsum.photos/id/196/1200/400" className="w-full h-full object-cover" alt="Background" />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Как мы можем помочь?</h1>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Поиск по вопросам (например: парковка, оплата)..." 
              className="w-full py-4 pl-12 pr-4 rounded-xl text-[var(--color-ink)] focus:outline-none focus:ring-4 focus:ring-white/40 shadow-lg border border-white/40 placeholder:text-[var(--color-ink-soft)]"
            />
            <span className="material-symbols-outlined absolute left-4 top-4 text-white/80">search</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-[var(--color-ink)] mb-4">Часто задаваемые вопросы</h2>
          {faqData.map((item, index) => (
            <div key={index} className="border border-[color:var(--color-info-border)] rounded-xl bg-[var(--color-info-surface)] overflow-hidden backdrop-blur-sm">
              <button 
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/70 transition-colors"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                aria-expanded={openIndex === index}
                aria-controls={`faq-panel-${index}`}
              >
                <div>
                  <span className="text-xs font-bold text-primary mb-1 block">{item.category}</span>
                  <span className="font-semibold text-[var(--color-ink)]">{item.question}</span>
                </div>
                <span className={`material-symbols-outlined text-[var(--color-ink-soft)] transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              <div
                id={`faq-panel-${index}`}
                className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  openIndex === index ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                } border-t ${openIndex === index ? 'border-[color:var(--color-info-border)]' : 'border-transparent'} bg-white/60`}
              >
                <div className="overflow-hidden">
                  <div
                    className={`px-6 pb-6 pt-4 text-[var(--color-ink-soft)] leading-relaxed transition-all duration-300 ${
                      openIndex === index ? 'translate-y-0' : '-translate-y-1'
                    }`}
                  >
                    {item.answer}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-[var(--color-info-surface)] p-6 rounded-xl border border-[color:var(--color-info-border)] shadow-sm sticky top-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary">support_agent</span>
              <h3 className="font-bold text-[var(--color-ink)]">Не нашли ответ?</h3>
            </div>
            <p className="text-sm text-[var(--color-ink-soft)] mb-6">Заполните форму, и мы свяжемся с вами в течение 24 часов.</p>
            
            <form className="space-y-4" onSubmit={(e) => {e.preventDefault(); alert("Сообщение отправлено!")}}>
              <div>
                <label className="block text-xs font-medium text-[var(--color-ink-soft)] mb-1">Ваше имя</label>
                <input type="text" className="w-full px-3 py-2 border border-[color:var(--color-info-border)] rounded-lg text-sm focus:ring-primary/40 focus:border-primary bg-white text-[var(--color-ink)]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-ink-soft)] mb-1">Email</label>
                <input type="email" className="w-full px-3 py-2 border border-[color:var(--color-info-border)] rounded-lg text-sm focus:ring-primary/40 focus:border-primary bg-white text-[var(--color-ink)]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-ink-soft)] mb-1">Сообщение</label>
                <textarea rows={4} className="w-full px-3 py-2 border border-[color:var(--color-info-border)] rounded-lg text-sm focus:ring-primary/40 focus:border-primary bg-white text-[var(--color-ink)]"></textarea>
              </div>
              <button className="w-full bg-primary text-white font-medium py-2 rounded-lg hover:bg-accent transition-colors shadow-sm">
                Отправить вопрос
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
