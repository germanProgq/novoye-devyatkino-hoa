import React, { useEffect, useMemo, useState } from 'react';

type RequestStatus = 'new' | 'in_progress' | 'resolved';

type RequestComment = {
  id: string;
  text: string;
  createdAt: string;
  kind: 'reopen' | 'note';
};

type RequestItem = {
  id: string;
  title: string;
  category: string;
  description: string;
  fullName?: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  comments?: RequestComment[];
};

const statusMeta: Record<RequestStatus, { label: string; color: string; bg: string; icon: string }> = {
  new: { label: 'Новое', color: 'text-primary', bg: 'bg-primary/10', icon: 'fiber_new' },
  in_progress: { label: 'В работе', color: 'text-[var(--color-ink)]', bg: 'bg-amber-100', icon: 'build' },
  resolved: { label: 'Решено', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: 'task_alt' },
};
const commentKindLabel: Record<RequestComment['kind'], string> = {
  reopen: 'Возврат в работу',
  note: 'Комментарий администратора',
};

const STORAGE_KEY = 'hoa-requests-v1';

const seedRequests: RequestItem[] = [
  {
    id: 'req-1',
    title: 'Шум в подъезде по вечерам',
    category: 'Общее имущество',
    description: 'После 22:00 регулярно слышен шум со второго этажа. Просьба разобраться с нарушителями тишины.',
    fullName: 'Иван Петров',
    status: 'in_progress',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    comments: [],
  },
  {
    id: 'req-2',
    title: 'Нет света в подъезде',
    category: 'Инженерные системы',
    description: 'Перегорела лампочка у лифта на 5 этаже, вечером очень темно.',
    fullName: 'Марина Соколова',
    status: 'in_progress',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    comments: [],
  },
  {
    id: 'req-3',
    title: 'Заявка на замену счетчика воды',
    category: 'Счетчики',
    description: 'Нужно заменить счетчик холодной воды в квартире 54, срок поверки истек.',
    fullName: 'Александр Смирнов',
    status: 'resolved',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    comments: [
      {
        id: 'c-1',
        text: 'Исполнено, счетчик заменен 12.03',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        kind: 'note',
      },
    ],
  },
];

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const loadFromStorage = (): RequestItem[] => {
  if (typeof window === 'undefined') return seedRequests;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedRequests;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seedRequests;
    return parsed.map((item: any) => ({
      ...item,
      fullName: item.fullName || item.fio || '',
      status: item.status === 'resolved' ? 'resolved' : item.status === 'in_progress' ? 'in_progress' : 'new',
      comments: Array.isArray(item.comments)
        ? item.comments.map((c: any) => ({
            id: c.id || `c-${Math.random().toString(36).slice(2)}`,
            text: c.text || '',
            createdAt: c.createdAt || c.date || new Date().toISOString(),
            kind: c.kind === 'note' ? 'note' : 'reopen',
          }))
        : [],
    }));
  } catch (err) {
    console.error('Failed to load requests from storage', err);
    return seedRequests;
  }
};

const Requests: React.FC = () => {
  const [requests, setRequests] = useState<RequestItem[]>(() => loadFromStorage());
  const [activeTab, setActiveTab] = useState<'active' | 'resolved' | 'all'>('active');
  const [viewMode, setViewMode] = useState<'list' | 'new'>('list');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Общее');
  const [description, setDescription] = useState('');
  const [fullName, setFullName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [reopenDrafts, setReopenDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  }, [requests]);

  const counts = useMemo(() => {
    const resolved = requests.filter((item) => item.status === 'resolved').length;
    const active = requests.length - resolved;
    return { active, resolved, all: requests.length };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const list = [...requests].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    if (activeTab === 'resolved') return list.filter((item) => item.status === 'resolved');
    if (activeTab === 'active') return list.filter((item) => item.status !== 'resolved');
    return list;
  }, [requests, activeTab]);

  const updateStatus = (id: string, status: RequestStatus) => {
    setRequests((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item)),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setFormError('Заполните тему и описание обращения');
      return;
    }
    if (!fullName.trim()) {
      setFormError('Укажите ФИО заявителя');
      return;
    }
    setFormError(null);
    const now = new Date().toISOString();
    const newRequest: RequestItem = {
      id: `req-${Date.now()}`,
      title: title.trim(),
      category: category.trim() || 'Общее',
      description: description.trim(),
      fullName: fullName.trim(),
      status: 'new',
      createdAt: now,
      updatedAt: now,
    };
    setRequests((prev) => [newRequest, ...prev]);
    setTitle('');
    setCategory('Общее');
    setDescription('');
    setFullName('');
    setActiveTab('active');
    setViewMode('list');
  };

  const renderStatusPill = (status: RequestStatus) => {
    const meta = statusMeta[status];
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full ${meta.bg} ${meta.color}`}>
        <span className="material-symbols-outlined text-base leading-none">{meta.icon}</span>
        {meta.label}
      </span>
    );
  };

  const tabs: Array<{ key: typeof activeTab; label: string; count: number }> = [
    { key: 'active', label: 'Активные', count: counts.active },
    { key: 'resolved', label: 'Решенные', count: counts.resolved },
    { key: 'all', label: 'Все', count: counts.all },
  ];

  const handleReopen = (item: RequestItem) => {
    const comment = (reopenDrafts[item.id] ?? '').trim();
    if (!comment) return;
    const now = new Date().toISOString();
    const entry: RequestComment = {
      id: `c-${Date.now()}`,
      text: comment,
      createdAt: now,
      kind: 'reopen',
    };
    setRequests((prev) =>
      prev.map((req) =>
        req.id === item.id
          ? {
              ...req,
              status: 'in_progress',
              updatedAt: now,
              comments: [...(req.comments ?? []), entry],
            }
          : req,
      ),
    );
    setReopenDrafts((prev) => ({ ...prev, [item.id]: '' }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {['list', 'new'].map((mode) => {
          const isActive = viewMode === mode;
          const label = mode === 'list' ? 'Мои заявки' : 'Новая заявка';
          return (
            <button
              key={mode}
              onClick={() => setViewMode(mode as typeof viewMode)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white text-[var(--color-ink)] border-[color:var(--color-info-border)] hover:bg-[var(--color-info-surface)]'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {mode === 'list' ? 'view_list' : 'add_circle'}
              </span>
              {label}
            </button>
          );
        })}
      </div>

      {viewMode === 'new' && (
        <div className="bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">assignment_add</span>
            <h1 className="text-2xl font-bold text-[var(--color-ink)]">Заявки и обращения</h1>
          </div>
          <p className="text-sm text-[var(--color-ink-soft)]">
            Здесь можно оставить заявку и отслеживать ее статус.
          </p>
        </div>

        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-[var(--color-ink-soft)] block mb-1">Тема обращения</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: протечка крыши, шум в подъезде"
              className="w-full px-3 py-2 rounded-lg border border-[color:var(--color-info-border)] bg-white text-[var(--color-ink)] focus:ring-primary/30 focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--color-ink-soft)] block mb-1">ФИО</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Фамилия Имя Отчество"
              className="w-full px-3 py-2 rounded-lg border border-[color:var(--color-info-border)] bg-white text-[var(--color-ink)] focus:ring-primary/30 focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--color-ink-soft)] block mb-1">Категория</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              list="request-categories"
              placeholder="Укажите свою категорию (можно новую)"
              className="w-full px-3 py-2 rounded-lg border border-[color:var(--color-info-border)] bg-white text-[var(--color-ink)] focus:ring-primary/30 focus:border-primary"
            />
            <datalist id="request-categories">
              {[...new Set(requests.map((r) => r.category || 'Общее').concat(seedRequests.map((r) => r.category || 'Общее')))].map(
                (cat) => (
                  <option key={cat} value={cat} />
                ),
              )}
            </datalist>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-[var(--color-ink-soft)] block mb-1">Описание проблемы</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Расскажите подробности, время возникновения, контакт для связи"
              className="w-full px-3 py-2 rounded-lg border border-[color:var(--color-info-border)] bg-white text-[var(--color-ink)] focus:ring-primary/30 focus:border-primary"
              required
            />
          </div>

          {formError && (
            <div className="md:col-span-2 text-sm text-accent flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              {formError}
            </div>
          )}

          <div className="md:col-span-2 flex flex-wrap gap-3 items-center justify-between">
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-accent transition-colors"
            >
              <span className="material-symbols-outlined text-base">send</span>
              Отправить заявку
            </button>
          </div>
        </form>
        </div>
      )}

      {viewMode === 'list' && (
        <>
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white text-[var(--color-ink)] border-[color:var(--color-info-border)] hover:bg-[var(--color-info-surface)]'
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        isActive ? 'bg-white/20 text-white' : 'bg-[var(--color-info-surface)] text-[var(--color-ink-soft)]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setViewMode('new')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-dashed text-sm font-semibold text-primary hover:bg-[var(--color-info-surface)] transition-colors"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Добавить новую
            </button>
          </div>

      <div className="space-y-3">
        {filteredRequests.length === 0 && (
          <div className="border border-[color:var(--color-info-border)] rounded-xl bg-[var(--color-info-surface)] px-6 py-5 text-[var(--color-ink-soft)]">
            В этой вкладке пока нет заявок.
          </div>
        )}

        {filteredRequests.map((item) => {
          const meta = statusMeta[item.status];
          return (
            <div
              key={item.id}
              className="bg-white border border-[color:var(--color-info-border)] rounded-xl p-5 shadow-[0_10px_40px_-24px_rgba(0,0,0,0.25)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {renderStatusPill(item.status)}
                    <span className="text-xs text-[var(--color-ink-soft)]">обновлено {formatDate(item.updatedAt)}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--color-ink)]">{item.title}</h3>
                  <div className="text-sm text-primary font-medium">{item.category || 'Общее'}</div>
                  <div className="text-sm text-[var(--color-ink-soft)]">ФИО: {item.fullName || '—'}</div>
                </div>
              </div>
              <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed mb-4">{item.description}</p>

              <div className="flex flex-wrap gap-3 items-start justify-between">
                <div className="text-xs text-[var(--color-ink-soft)]">
                  Создано {formatDate(item.createdAt)}
                </div>
                <div className="flex-1 min-w-[240px] flex flex-wrap gap-2 justify-end">
                  {item.status === 'new' && (
                    <button
                      onClick={() => updateStatus(item.id, 'in_progress')}
                      className="px-3 py-2 rounded-lg border border-[color:var(--color-info-border)] text-sm font-medium hover:bg-[var(--color-info-surface)]"
                    >
                      Взять в работу
                    </button>
                  )}
                  {item.status !== 'resolved' && (
                    <button
                      onClick={() => updateStatus(item.id, 'resolved')}
                      className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-sm"
                    >
                      Отметить решенной
                    </button>
                  )}
                  {item.status === 'resolved' && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                      <input
                        value={reopenDrafts[item.id] ?? ''}
                        onChange={(e) => setReopenDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        placeholder="Комментарий для возврата"
                        className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)] text-[var(--color-ink)] focus:ring-primary/30 focus:border-primary"
                      />
                      <button
                        onClick={() => handleReopen(item)}
                        disabled={!(reopenDrafts[item.id] ?? '').trim()}
                        className="px-3 py-2 rounded-lg border border-[color:var(--color-info-border)] text-sm font-semibold hover:bg-[var(--color-info-surface)] disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Вернуть в работу
                      </button>
                    </div>
                  )}
                </div>
              </div>
                {item.comments && item.comments.length > 0 && (
                  <div className="mt-4 border-t border-[color:var(--color-info-border)] pt-3">
                    <div className="text-xs font-semibold text-[var(--color-ink-soft)] mb-2">Комментарии</div>
                    <div className="space-y-2">
                      {item.comments.map((comment) => (
                        <div key={comment.id} className="text-sm text-[var(--color-ink-soft)] bg-[var(--color-info-surface)] rounded-lg px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-[var(--color-ink)]">{commentKindLabel[comment.kind] ?? 'Комментарий'}</span>
                            <span className="text-xs">{formatDate(comment.createdAt)}</span>
                          </div>
                          <div className="mt-1 whitespace-pre-wrap">{comment.text}</div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
        </>
      )}
    </div>
  );
};

export default Requests;
