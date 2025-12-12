import React, { useState } from 'react';
import { DocumentItem } from '../types';

const mockDocs: DocumentItem[] = [
  { id: '1', title: 'Протокол собрания жильцов №12', date: '2023-10-15', size: '2.4 MB', type: 'pdf', category: 'Протоколы' },
  { id: '2', title: 'Финансовый отчет за 3 квартал', date: '2023-10-01', size: '1.1 MB', type: 'xls', category: 'Отчетность' },
  { id: '3', title: 'Договор на обслуживание лифтов', date: '2023-09-12', size: '4.5 MB', type: 'pdf', category: 'Договоры' },
  { id: '4', title: 'Правила проживания (обновленные)', date: '2023-08-01', size: '890 KB', type: 'doc', category: 'Правила' },
  { id: '5', title: 'График уборки подъездов', date: '2023-11-01', size: '500 KB', type: 'pdf', category: 'Разное' },
];

const Documents: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Все');

  const filteredDocs = mockDocs.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Все' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['Все', 'Протоколы', 'Отчетность', 'Договоры', 'Правила'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-ink)]">Документы</h1>
          <p className="text-[var(--color-ink-soft)]">Архив официальных документов ТСЖ.</p>
        </div>
        <button className="bg-primary hover:bg-accent text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
          <span className="material-symbols-outlined">upload</span>
          Загрузить документ
        </button>
      </div>

      <div className="bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm overflow-hidden backdrop-blur-sm">
        {/* Filters */}
        <div className="p-4 border-b border-[color:var(--color-info-border)] flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[var(--color-ink-soft)]">search</span>
            <input 
              type="text" 
              placeholder="Поиск документов..." 
              className="w-full pl-10 pr-4 py-2 border border-[color:var(--color-info-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-white text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'bg-white text-[var(--color-ink-soft)] border border-[color:var(--color-info-border)] hover:bg-[var(--color-info-surface)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="divide-y divide-[color:var(--color-info-border)]">
          {filteredDocs.length > 0 ? (
            filteredDocs.map((doc) => (
              <div key={doc.id} className="p-4 flex items-center gap-4 hover:bg-white/70 transition-colors group">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  doc.type === 'pdf' ? 'bg-accent/15 text-accent' :
                  doc.type === 'xls' ? 'bg-primary/10 text-primary' :
                  'bg-[var(--color-info-surface)] text-[var(--color-ink)]'
                }`}>
                  <span className="material-symbols-outlined">
                    {doc.type === 'pdf' ? 'picture_as_pdf' : doc.type === 'xls' ? 'table_view' : 'description'}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-[var(--color-ink)] truncate">{doc.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-[var(--color-ink-soft)] mt-1">
                    <span>{doc.date}</span>
                    <span>•</span>
                    <span>{doc.size}</span>
                    <span>•</span>
                    <span className="bg-[var(--color-info-surface)] px-2 py-0.5 rounded text-[var(--color-ink)] border border-[color:var(--color-info-border)]">{doc.category}</span>
                  </div>
                </div>

                <button className="p-2 text-[var(--color-ink-soft)] hover:text-accent hover:bg-accent/10 rounded-full transition-colors">
                  <span className="material-symbols-outlined">download</span>
                </button>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-[var(--color-ink-soft)]">
              Документы не найдены
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Documents;
