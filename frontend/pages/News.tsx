import React, { useState } from 'react';
import { NewsItem } from '../types';

const newsData: NewsItem[] = [
  {
    id: '1',
    title: 'Плановое отключение горячей воды',
    summary: 'В связи с профилактическими работами на теплотрассе, подача горячей воды будет приостановлена с 15 по 17 ноября. Приносим извинения за неудобства.',
    date: '10 Ноя 2023',
    image: 'https://picsum.photos/id/10/800/400',
    tag: 'Важно'
  },
  {
    id: '2',
    title: 'Субботник во дворе',
    summary: 'Приглашаем всех жильцов принять участие в осеннем субботнике. Инвентарь (грабли, мешки, перчатки) будет выдан управляющей компанией. Чай и угощения после работы!',
    date: '05 Ноя 2023',
    image: 'https://picsum.photos/id/1055/800/400',
    tag: 'Событие'
  },
  {
    id: '3',
    title: 'Ремонт лифта в 3 подъезде',
    summary: 'Ремонтные работы завершены. Грузовой лифт снова функционирует в штатном режиме. Заменены тросы и панель управления.',
    date: '01 Ноя 2023',
    image: 'https://picsum.photos/id/970/800/400',
    tag: 'Ремонт'
  },
];

const News: React.FC = () => {
  const [filter, setFilter] = useState('Все');
  const filters = ['Все', 'Важно', 'Событие', 'Ремонт'];

  const filteredNews = filter === 'Все' ? newsData : newsData.filter(n => n.tag === filter);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[var(--color-ink)]">Новости ТСЖ</h1>
        <p className="text-[var(--color-ink-soft)]">Будьте в курсе последних событий вашего дома.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-3 space-y-6">
          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filter === f 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'bg-white border border-[color:var(--color-info-border)] text-[var(--color-ink-soft)] hover:bg-[var(--color-info-surface)]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Articles */}
          <div className="space-y-6">
            {filteredNews.map(item => (
              <article key={item.id} className="bg-[var(--color-info-surface)] rounded-2xl border border-[color:var(--color-info-border)] shadow-sm overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-shadow backdrop-blur-sm">
                <div className="md:w-1/3 h-48 md:h-auto relative">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover absolute inset-0" />
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm ${
                      item.tag === 'Важно' ? 'bg-accent' :
                      item.tag === 'Событие' ? 'bg-primary' : 'bg-primary/80'
                    }`}>
                      {item.tag}
                    </span>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="text-xs text-[var(--color-ink-soft)] mb-2">{item.date}</div>
                  <h2 className="text-xl font-bold text-[var(--color-ink)] mb-3">{item.title}</h2>
                  <p className="text-[var(--color-ink-soft)] text-sm leading-relaxed flex-1">
                    {item.summary}
                  </p>
                  <button className="mt-4 text-primary font-medium text-sm flex items-center gap-1 hover:text-accent self-start">
                    Читать далее
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[var(--color-info-surface)] p-6 rounded-xl border border-[color:var(--color-info-border)] shadow-sm backdrop-blur-sm">
            <h3 className="font-bold text-[var(--color-ink)] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">schedule</span>
              Часы работы офиса
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between">
                <span className="text-[var(--color-ink-soft)]">Пн - Пт</span>
                <span className="font-medium text-[var(--color-ink)]">09:00 - 18:00</span>
              </li>
              <li className="flex justify-between">
                <span className="text-[var(--color-ink-soft)]">Суббота</span>
                <span className="font-medium text-[var(--color-ink)]">10:00 - 14:00</span>
              </li>
              <li className="flex justify-between">
                <span className="text-[var(--color-ink-soft)]">Воскресенье</span>
                <span className="text-accent font-medium">Выходной</span>
              </li>
            </ul>
          </div>

          <div className="bg-[var(--color-info-surface)] p-6 rounded-xl border border-[color:var(--color-info-border)] shadow-sm backdrop-blur-sm">
            <h3 className="font-bold text-[var(--color-ink)] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-accent">emergency</span>
              Экстренные службы
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-accent/20 p-2 rounded-lg text-accent">
                  <span className="material-symbols-outlined text-sm">plumbing</span>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-ink-soft)] font-medium">Аварийная сантехника</p>
                  <p className="text-sm font-bold text-[var(--color-ink)]">+7 (999) 000-01-01</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                  <span className="material-symbols-outlined text-sm">bolt</span>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-ink-soft)] font-medium">Электрик (Дежурный)</p>
                  <p className="text-sm font-bold text-[var(--color-ink)]">+7 (999) 000-02-02</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                  <span className="material-symbols-outlined text-sm">local_police</span>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-ink-soft)] font-medium">Охрана</p>
                  <p className="text-sm font-bold text-[var(--color-ink)]">+7 (999) 000-03-03</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default News;
