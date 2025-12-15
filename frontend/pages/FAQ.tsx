import React, { useEffect, useMemo, useState } from 'react';
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
  const [openQuestion, setOpenQuestion] = useState<string | null>(faqData[0]?.question ?? null);
  const [searchTerm, setSearchTerm] = useState('');
  const [faqIntroDone, setFaqIntroDone] = useState(false);

  const filteredFaqs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return faqData;
    return faqData.filter((item) => {
      const haystack = `${item.question} ${item.answer} ${item.category}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [searchTerm]);

  const handleToggle = (question: string) => {
    setOpenQuestion((current) => (current === question ? null : question));
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setOpenQuestion(null);
  };

  const shouldAnimateFaq = !faqIntroDone && filteredFaqs.length > 0;

  useEffect(() => {
    if (!shouldAnimateFaq) return undefined;
    const timer = window.setTimeout(() => setFaqIntroDone(true), 1200);
    return () => window.clearTimeout(timer);
  }, [shouldAnimateFaq]);

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
              placeholder="Поиск по вопросам..." 
              className="w-full py-4 pl-12 pr-4 rounded-xl text-[var(--color-ink)] focus:outline-none focus:ring-4 focus:ring-white/40 shadow-lg border border-white/40 placeholder:text-[var(--color-ink-soft)]"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <span className="material-symbols-outlined absolute left-4 top-4 text-white/80">search</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[var(--color-ink)] mb-4">Часто задаваемые вопросы</h2>
        {filteredFaqs.length === 0 && (
          <div className="border border-[color:var(--color-info-border)] rounded-xl bg-[var(--color-info-surface)] px-6 py-5 text-[var(--color-ink-soft)]">
            Не найдено вопросов по запросу "{searchTerm.trim()}". Попробуйте изменить формулировку.
          </div>
        )}
        {filteredFaqs.map((item, index) => {
          const isOpen = openQuestion === item.question;
          return (
            <div
              key={`${item.category}-${item.question}`}
              className={`faq-card border border-[color:var(--color-info-border)] rounded-xl bg-[var(--color-info-surface)] overflow-hidden backdrop-blur-sm ${
                shouldAnimateFaq ? 'faq-card--intro' : ''
              }`}
              style={shouldAnimateFaq ? { ['--faq-delay' as string]: `${index * 70}ms` } : undefined}
            >
              <button 
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[var(--color-info-surface)] transition-colors"
                onClick={() => handleToggle(item.question)}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${index}`}
              >
                <div>
                  <span className="text-xs font-bold text-primary mb-1 block">{item.category}</span>
                  <span className="font-semibold text-[var(--color-ink)]">{item.question}</span>
                </div>
                <span className={`material-symbols-outlined text-[var(--color-ink-soft)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              <div
                id={`faq-panel-${index}`}
                className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                } border-t ${isOpen ? 'border-[color:var(--color-info-border)]' : 'border-transparent'} bg-white/60`}
              >
                <div className="overflow-hidden">
                  <div
                    className={`px-6 pb-6 pt-4 text-[var(--color-ink-soft)] leading-relaxed transition-all duration-300 ${
                      isOpen ? 'translate-y-0' : '-translate-y-1'
                    }`}
                  >
                    {item.answer}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FAQ;
