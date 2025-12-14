import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NewsItem } from '../types';
import { getStoredSessionUser, isAdmin as isAdminRole } from '../utils/auth';

const defaultNewsImage = '/images/gerb250.jpg';
const API_BASE_URL = (
  import.meta.env.VITE_BACKEND_URL
    ? String(import.meta.env.VITE_BACKEND_URL)
    : 'http://localhost:8080'
).replace(/\/$/, '');

const buildAssetUrl = (path?: string) => {
  if (!path || !path.trim()) return '';
  if (path.startsWith('http') || path.startsWith('//')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

const MONTH_NAMES_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

const formatNewsDate = (raw?: string) => {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  const day = String(date.getDate()).padStart(2, '0');
  const monthName = MONTH_NAMES_GENITIVE[date.getMonth()] ?? '';
  const year = date.getFullYear();
  return `${day} ${monthName} ${year}`;
};

const getTagTone = (tag: string) => {
  const normalized = (tag || '').toLowerCase();
  if (normalized.includes('важ')) return 'bg-accent';
  if (normalized.includes('собы')) return 'bg-primary';
  if (normalized.includes('ремонт')) return 'bg-[rgba(47,58,42,0.9)]';
  return 'bg-[var(--color-ink-soft)]';
};

const NEWS_PAGE_SIZE = 10;
const getNewsCardId = (id: string) => `news-card-${id}`;

type NewsLocationState = {
  highlightNewsId?: string;
  restoreFilter?: string;
  restorePage?: number;
};

const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
  const target = event.currentTarget;
  if (target.dataset.fallbackApplied === 'true') return;
  target.dataset.fallbackApplied = 'true';
  target.src = defaultNewsImage;
};

const mapApiNews = (item: any): NewsItem => {
  const created = item.createdAt || item.created_at || item.date;
  const imagePath =
    item.imageUrl ||
    item.image_url ||
    item.image ||
    (item.imageFilename && item.id ? `/api/news/${item.id}/image` : '') ||
    (item.image_filename && item.id ? `/api/news/${item.id}/image` : '');
  const image = buildAssetUrl(imagePath) || defaultNewsImage;
  return {
    id: item.id ?? '',
    title: item.title || 'Без заголовка',
    summary: item.summary || item.description || '',
    tag: item.tag || 'Без тега',
    date: formatNewsDate(created) || '—',
    image,
    imageUrl: image,
    createdAt: created,
  };
};

const News: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('Все');
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminActionError, setAdminActionError] = useState<string | null>(null);
  const [busyNewsId, setBusyNewsId] = useState<string | null>(null);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [skipNextFilterReset, setSkipNextFilterReset] = useState(false);
  const [introAnimated, setIntroAnimated] = useState(false);
  const pageChangeInitialized = useRef(false);

  useEffect(() => {
    const loadNews = async () => {
      setLoading(true);
      setError(null);
      try {
        const endpoints = ['/news', '/api/news'];
        let payload: any | null = null;
        let lastError: unknown = null;

        for (const path of endpoints) {
          try {
            const response = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include' });
            if (!response.ok) {
              lastError = new Error(`API responded with ${response.status}`);
              continue;
            }
            payload = await response.json();
            break;
          } catch (err) {
            lastError = err;
          }
        }

        if (!payload) {
          throw lastError ?? new Error('Не удалось загрузить новости');
        }

        const list = Array.isArray(payload.news) ? payload.news : [];
        setNewsItems(list.map(mapApiNews));
      } catch (err) {
        console.error(err);
        setError('Не удалось загрузить новости. Попробуйте обновить страницу.');
      } finally {
        setLoading(false);
      }
    };

    loadNews();
  }, []);

  useEffect(() => {
    setIsAdmin(isAdminRole(getStoredSessionUser()));
  }, []);

  useEffect(() => {
    // Reset intro flag on fresh mounts (including full reloads)
    setIntroAnimated(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const state = location.state as NewsLocationState | null;
    if (state) {
      if (state.restoreFilter) {
        setSkipNextFilterReset(true);
        setFilter(state.restoreFilter);
      }
      if (typeof state.restorePage === 'number') {
        setPage(state.restorePage);
      }
      if (state.highlightNewsId) {
        setPendingScrollId(state.highlightNewsId);
      }
      navigate(location.pathname + location.search + location.hash, { replace: true });
    }
  }, [location.hash, location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (!location.hash.startsWith('#news-card-')) return;
    const targetId = location.hash.replace('#news-card-', '');
    if (targetId) {
      setPendingScrollId(targetId);
    }
  }, [location.hash]);

  const tagCountMap = useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>();
    newsItems.forEach((item) => {
      const key = item.tag || 'Без тега';
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [newsItems]);

  const tags = useMemo(() => {
    const list = Array.from(tagCountMap.keys(), (tag) => String(tag)).sort((a, b) => a.localeCompare(b, 'ru'));
    return ['Все', ...list];
  }, [tagCountMap]);

  useEffect(() => {
    if (filter !== 'Все' && !tags.includes(filter)) {
      setFilter('Все');
    }
  }, [filter, tags]);

  const tagCounts = useMemo(() => Array.from(tagCountMap.entries()).sort((a, b) => b[1] - a[1]), [tagCountMap]);

  const filteredNews = useMemo(() => {
    if (filter === 'Все') return newsItems;
    return newsItems.filter((item) => item.tag === filter);
  }, [filter, newsItems]);

  useEffect(() => {
    if (skipNextFilterReset) {
      setSkipNextFilterReset(false);
      return;
    }
    setPage(0);
  }, [filter, skipNextFilterReset]);

  useEffect(() => {
    const totalPages = Math.ceil(filteredNews.length / NEWS_PAGE_SIZE);
    setPage((prev) => {
      if (totalPages === 0) return 0;
      return Math.min(prev, totalPages - 1);
    });
  }, [filteredNews.length]);

  const totalPages = Math.ceil(filteredNews.length / NEWS_PAGE_SIZE);
  const paginatedNews = useMemo(() => {
    const start = page * NEWS_PAGE_SIZE;
    return filteredNews.slice(start, start + NEWS_PAGE_SIZE);
  }, [filteredNews, page]);
  const hasPagination = totalPages > 1;
  const pageLabel = totalPages > 0 ? `${page + 1}/${totalPages}` : '—';
  const canPrev = page > 0;
  const canNext = page + 1 < totalPages;
  const shouldPlayIntro = !introAnimated && !loading && !error && filteredNews.length > 0;

  useEffect(() => {
    if (!pendingScrollId || loading) return;
    const targetIndex = filteredNews.findIndex((item) => item.id === pendingScrollId);
    if (targetIndex === -1) return;
    const targetPage = Math.floor(targetIndex / NEWS_PAGE_SIZE);
    if (page !== targetPage) {
      setPage(targetPage);
      return;
    }
    const el = document.getElementById(getNewsCardId(pendingScrollId));
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setHighlightId(pendingScrollId);
      setPendingScrollId(null);
    }
  }, [filteredNews, loading, page, pendingScrollId]);

  useEffect(() => {
    if (!highlightId) return;
    const timer = window.setTimeout(() => setHighlightId(null), 3200);
    return () => window.clearTimeout(timer);
  }, [highlightId]);

  useEffect(() => {
    if (!shouldPlayIntro) return undefined;
    const timer = window.setTimeout(() => setIntroAnimated(true), 1400);
    return () => window.clearTimeout(timer);
  }, [shouldPlayIntro]);

  useEffect(() => {
    if (!pageChangeInitialized.current) {
      pageChangeInitialized.current = true;
      return;
    }
    if (pendingScrollId) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page, pendingScrollId]);

  const handleAdminEdit = (item: NewsItem) => {
    setAdminActionError(null);
    const hash = getNewsCardId(item.id);
    navigate('/admin?tab=news', {
      state: {
        editNewsId: item.id,
        newsPrefill: item,
        restoreFilter: filter,
        restorePage: page,
        returnHash: hash,
        targetTab: 'news',
      },
    });
  };

  const handleAdminDelete = async (id: string) => {
    setAdminActionError(null);
    setBusyNewsId(id);
    try {
      const response = await fetch(`${API_BASE_URL}/api/news/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!response.ok && response.status !== 204) {
        throw new Error('Failed to delete');
      }
      setNewsItems((prev) => prev.filter((item) => item.id !== id));
      if (pendingScrollId === id) setPendingScrollId(null);
      if (highlightId === id) setHighlightId(null);
    } catch (err) {
      console.error(err);
      setAdminActionError('Не удалось удалить новость');
    } finally {
      setBusyNewsId(null);
    }
  };

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
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilter(tag)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filter === tag
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white border border-[color:var(--color-info-border)] text-[var(--color-ink-soft)] hover:bg-[var(--color-info-surface)]'
                }`}
              >
                {tag === 'Все' ? 'Все' : `${tag}${tagCountMap.get(tag) ? ` (${tagCountMap.get(tag)})` : ''}`}
              </button>
            ))}
          </div>

          {/* Articles */}
          <div className="space-y-6">
            {adminActionError && (
              <div className="p-4 text-sm text-accent bg-accent/10 rounded-xl border border-accent/30 shadow-sm">
                {adminActionError}
              </div>
            )}
            {loading && (
              <div className="p-8 text-center text-[var(--color-ink-soft)] bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm">
                Загрузка новостей...
              </div>
            )}

            {!loading && error && (
              <div className="p-8 text-center text-accent bg-accent/10 rounded-xl border border-accent/30 shadow-sm">
                {error}
              </div>
            )}

            {!loading && !error && filteredNews.length === 0 && (
              <div className="p-8 text-center text-[var(--color-ink-soft)] bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm">
                Публикаций нет для выбранного тега.
              </div>
            )}

            {!loading && !error && paginatedNews.map((item, index) => {
              const image = item.image || item.imageUrl || defaultNewsImage;
              const tagTone = getTagTone(item.tag);
              const date = item.date || formatNewsDate(item.createdAt) || '—';
              const isHighlighted = highlightId === item.id;
              const cardId = getNewsCardId(item.id);
              return (
                <article
                  key={item.id}
                  id={cardId}
                  className={`group relative bg-[var(--color-info-surface)] rounded-2xl border border-[color:var(--color-info-border)] shadow-sm overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-all duration-400 ease-out backdrop-blur-sm news-stagger ${
                    shouldPlayIntro ? 'news-stagger--intro' : ''
                  } ${
                    isHighlighted ? 'ring-2 ring-primary/60 ring-offset-1 ring-offset-[var(--color-info-surface)]' : ''
                  }`}
                  aria-live={isHighlighted ? 'polite' : undefined}
                  aria-label={item.title}
                  style={{
                    ...(isHighlighted ? { boxShadow: '0 10px 30px rgba(0,0,0,0.08)' } : {}),
                    ...(shouldPlayIntro ? { ['--news-delay' as string]: `${index * 80}ms` } : {}),
                  }}
                >
                  {isAdmin && (
                    <div className="order-3 md:order-none flex flex-wrap items-center justify-between md:justify-end gap-3 md:gap-2 px-4 pb-4 md:px-0 md:pb-0 md:absolute md:top-3 md:right-3 md:z-10 w-full md:w-auto">
                      <button
                        type="button"
                        onClick={() => handleAdminEdit(item)}
                        className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-white/95 border border-[color:var(--color-info-border)] text-[var(--color-ink-soft)] hover:text-primary hover:bg-white shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={busyNewsId === item.id}
                      >
                        <span className="material-symbols-outlined text-sm align-middle">edit</span>{' '}
                        Редактировать
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdminDelete(item.id)}
                        className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-white/95 border border-[color:var(--color-info-border)] text-accent hover:bg-accent/10 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={busyNewsId === item.id}
                      >
                        <span className="material-symbols-outlined text-sm align-middle">delete</span>{' '}
                        Удалить
                      </button>
                    </div>
                  )}
                  <div className="order-1 md:order-none md:w-1/3 w-full h-48 md:h-[220px] lg:h-[260px] relative overflow-hidden bg-[var(--color-info-surface)]">
                    <img
                      src={image}
                      alt={item.title}
                      className="w-full h-full object-contain absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
                      onError={handleImageError}
                    />
                    <div className="absolute top-4 left-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm ${tagTone}`}>
                        {item.tag || 'Без тега'}
                      </span>
                    </div>
                  </div>
                  <div className="order-2 md:order-none p-6 flex-1 flex flex-col">
                    <div className="text-xs text-[var(--color-ink-soft)] mb-2">{date}</div>
                    <h2 className="text-xl font-bold text-[var(--color-ink)] mb-3">{item.title}</h2>
                    <p className="text-[var(--color-ink-soft)] text-sm leading-relaxed flex-1">
                      {item.summary || 'Описание будет добавлено позже.'}
                    </p>
                  </div>
                </article>
              );
            })}

            {!loading && !error && hasPagination && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                  disabled={!canPrev}
                  className="p-2 rounded-lg border border-[color:var(--color-info-border)] bg-white text-[var(--color-ink-soft)] hover:text-primary hover:bg-[var(--color-info-surface)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-base">chevron_left</span>
                </button>
                <span className="text-sm text-[var(--color-ink-soft)] px-2">{pageLabel}</span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={!canNext}
                  className="p-2 rounded-lg border border-[color:var(--color-info-border)] bg-white text-[var(--color-ink-soft)] hover:text-primary hover:bg-[var(--color-info-surface)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="hidden lg:block lg:col-span-1 space-y-6">
          <div className="bg-[var(--color-info-surface)] p-6 rounded-xl border border-[color:var(--color-info-border)] shadow-sm backdrop-blur-sm">
            <h3 className="font-bold text-[var(--color-ink)] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">sell</span>
              Теги публикаций
            </h3>
            {tagCounts.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-soft)]">Теги появятся после первой публикации.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {tagCounts.map(([tag, count]) => (
                  <li key={tag} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${getTagTone(tag)}`} />
                      <span className="text-[var(--color-ink)]">{tag}</span>
                    </div>
                    <span className="text-[var(--color-ink-soft)]">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

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
