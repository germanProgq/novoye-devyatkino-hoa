import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RequestComment, RequestItem, RequestStatus } from '../types';

const statusMeta: Record<RequestStatus, { label: string; color: string; bg: string; icon: string }> = {
  new: { label: 'Новое', color: 'text-primary', bg: 'bg-primary/10', icon: 'fiber_new' },
  in_progress: { label: 'В работе', color: 'text-amber-900', bg: 'bg-amber-100', icon: 'build' },
  resolved: { label: 'Решено', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: 'task_alt' },
};
const commentKindLabel: Record<RequestComment['kind'], string> = {
  reopen: 'Возврат в работу',
  note: 'Комментарий администратора',
};

const API_BASE_URL = (
  import.meta.env.VITE_BACKEND_URL
    ? String(import.meta.env.VITE_BACKEND_URL)
    : 'http://localhost:8080'
).replace(/\/$/, '');
const apiFetch = (input: string, init: RequestInit = {}) => fetch(input, { credentials: 'include', ...init });

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

const mapApiComment = (raw: any): RequestComment => ({
  id: raw?.id ?? `c-${Math.random().toString(36).slice(2)}`,
  text: raw?.text ?? '',
  createdAt: raw?.createdAt || raw?.created_at || raw?.date || '',
  kind: raw?.kind === 'reopen' ? 'reopen' : 'note',
});

const mapApiRequest = (raw: any): RequestItem => ({
  id: raw?.id ?? '',
  username: raw?.username || raw?.user || '',
  title: raw?.title ?? '',
  category: raw?.category || 'Общее',
  description: raw?.description ?? '',
  fullName: raw?.fullName || raw?.full_name || raw?.fio || '',
  status: raw?.status === 'resolved' ? 'resolved' : raw?.status === 'in_progress' ? 'in_progress' : 'new',
  createdAt: raw?.createdAt || raw?.created_at || '',
  updatedAt: raw?.updatedAt || raw?.updated_at || raw?.createdAt || '',
  comments: Array.isArray(raw?.comments) ? raw.comments.map(mapApiComment) : [],
});

const Requests: React.FC = () => {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'resolved' | 'all'>('active');
  const [viewMode, setViewMode] = useState<'list' | 'new'>('list');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Общее');
  const [description, setDescription] = useState('');
  const [fullName, setFullName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [introDone, setIntroDone] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/requests`);
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }
      const payload = await response.json();
      const list = Array.isArray(payload.requests) ? payload.requests : Array.isArray(payload) ? payload : [];
      setRequests(list.map(mapApiRequest));
    } catch (err) {
      console.error(err);
      setLoadError('Не удалось загрузить заявки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

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

  const triggerTabFeedback = useCallback(
    (event: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
      const target = event.currentTarget;
      const rect = target.getBoundingClientRect();
      const point = 'touches' in event ? event.touches[0] : event;
      const x = ((point.clientX - rect.left) / rect.width) * 100;
      const y = ((point.clientY - rect.top) / rect.height) * 100;
      target.style.setProperty('--tab-ripple-x', `${x}%`);
      target.style.setProperty('--tab-ripple-y', `${y}%`);
      target.classList.remove('soft-tab--pressed');
      // micro-interaction: briefly elevate and fade ripple
      window.requestAnimationFrame(() => {
        target.classList.add('soft-tab--pressed');
        window.setTimeout(() => target.classList.remove('soft-tab--pressed'), 420);
      });
    },
    [],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitSuccess(null);
    if (!title.trim() || !description.trim()) {
      setFormError('Заполните тему и описание обращения');
      return;
    }
    if (!fullName.trim()) {
      setFormError('Укажите ФИО заявителя');
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category: category.trim() || 'Общее',
          description: description.trim(),
          fullName: fullName.trim(),
        }),
      });
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }
      const payload = await response.json();
      const created = mapApiRequest(payload.request ?? payload);
      setRequests((prev) => [created, ...prev]);
      setTitle('');
      setCategory('Общее');
      setDescription('');
      setFullName('');
      setActiveTab('active');
      setViewMode('list');
      setSubmitSuccess('Заявка отправлена. Мы сообщим о статусе.');
    } catch (err) {
      console.error(err);
      setFormError('Не удалось отправить заявку. Попробуйте позже.');
    } finally {
      setSubmitting(false);
    }
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

  const shouldAnimateRequests = !introDone && !loading && viewMode === 'list' && filteredRequests.length > 0;

  useEffect(() => {
    if (!shouldAnimateRequests) return undefined;
    const timer = window.setTimeout(() => setIntroDone(true), 1400);
    return () => window.clearTimeout(timer);
  }, [shouldAnimateRequests]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {['list', 'new'].map((mode) => {
          const isActive = viewMode === mode;
          const label = mode === 'list' ? 'Мои заявки' : 'Новая заявка';
          return (
            <button
              key={mode}
              onMouseDown={triggerTabFeedback}
              onTouchStart={triggerTabFeedback}
              onClick={() => setViewMode(mode as typeof viewMode)}
              className={`soft-tab inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${
                isActive
                  ? 'soft-tab--active bg-primary text-primary-contrast border-primary shadow-sm'
                  : 'bg-white text-[var(--color-ink)] border-[color:var(--color-info-border)] hover:bg-[var(--color-info-surface)]'
              }`}
            >
              <span className="material-symbols-outlined text-base soft-tab__icon">
                {mode === 'list' ? 'view_list' : 'add_circle'}
              </span>
              <span className="soft-tab__label">{label}</span>
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
              {[...new Set(['Общее', ...requests.map((r) => r.category || 'Общее')])].map((cat) => (
                <option key={cat} value={cat} />
              ))}
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
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-primary text-primary-contrast font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-accent transition-colors disabled:opacity-70"
            >
              <span className="material-symbols-outlined text-base">send</span>
              {submitting ? 'Отправляем...' : 'Отправить заявку'}
            </button>
            {submitSuccess && <div className="text-sm text-emerald-700">{submitSuccess}</div>}
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
                    onMouseDown={triggerTabFeedback}
                    onTouchStart={triggerTabFeedback}
                    onClick={() => setActiveTab(tab.key)}
                    className={`soft-tab inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${
                      isActive
                        ? 'soft-tab--active bg-primary text-primary-contrast border-primary shadow-sm'
                        : 'bg-white text-[var(--color-ink)] border-[color:var(--color-info-border)] hover:bg-[var(--color-info-surface)]'
                    }`}
                  >
                    <span className="soft-tab__label">{tab.label}</span>
                    <span
                      className={`soft-tab__count w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[var(--color-info-surface)] text-[var(--color-ink-soft)]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void loadRequests()}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-info-surface)] disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                {loading ? 'Обновляем...' : 'Обновить'}
              </button>
              <button
                onClick={() => setViewMode('new')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-dashed text-sm font-semibold text-primary hover:bg-[var(--color-info-surface)] transition-colors"
              >
                <span className="material-symbols-outlined text-base">add</span>
                Добавить новую
              </button>
            </div>
          </div>

      <div className="space-y-3">
        {loadError && (
          <div className="border border-[color:var(--color-info-border)] rounded-xl bg-red-50 px-6 py-5 text-[var(--color-ink)] flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-base text-accent">error</span>
              {loadError}
            </div>
            <button
              onClick={() => void loadRequests()}
              className="text-sm font-semibold text-primary hover:text-accent"
            >
              Повторить загрузку
            </button>
          </div>
        )}
        {loading && (
          <div className="border border-[color:var(--color-info-border)] rounded-xl bg-[var(--color-info-surface)] px-6 py-5 text-[var(--color-ink-soft)]">
            Загружаем ваши заявки...
          </div>
        )}
        {!loading && filteredRequests.length === 0 && (
          <div className="border border-[color:var(--color-info-border)] rounded-xl bg-[var(--color-info-surface)] px-6 py-5 text-[var(--color-ink-soft)]">
            В этой вкладке пока нет заявок.
          </div>
        )}

        {filteredRequests.map((item, index) => {
          return (
            <article
              key={item.id}
              className={`request-card bg-white border border-[color:var(--color-info-border)] rounded-xl shadow-[0_10px_40px_-24px_rgba(0,0,0,0.25)] ${
                shouldAnimateRequests ? 'request-card--intro' : ''
              }`}
              style={shouldAnimateRequests ? { ['--request-delay' as string]: `${index * 70}ms` } : undefined}
            >
              <div className="request-card__inner p-5">
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
            </article>
          );
        })}
      </div>
        </>
      )}
    </div>
  );
};

export default Requests;
