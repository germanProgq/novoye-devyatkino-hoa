/// <reference types="vite/client" />
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DocumentItem } from '../types';
import { getStoredSessionUser, isAdmin } from '../utils/auth';

const API_BASE_URL = (
  import.meta.env.VITE_BACKEND_URL
    ? String(import.meta.env.VITE_BACKEND_URL)
    : 'http://localhost:8080'
).replace(/\/$/, '');

const formatSize = (bytes: number) => {
  if (!bytes || bytes <= 0) return '—';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const normalizeType = (type: string) => type.replace('.', '').toLowerCase() || 'doc';
const normalizeCategoryDisplay = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return 'Общее';
  return trimmed.toLowerCase() === 'общее' ? 'Общее' : trimmed;
};
const canonicalCategory = (value: string) => normalizeCategoryDisplay(value).toLowerCase();

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Общее');
  const [newYear, setNewYear] = useState<number | ''>('');
  const [newDescription, setNewDescription] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    setIsAdminUser(isAdmin(getStoredSessionUser()));
  }, []);

  useEffect(() => {
    const fetchDocuments = async () => {
      setLoading(true);
      setError(null);
      try {
        const endpoints = ['/documents', '/api/documents'];
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
          throw lastError ?? new Error('Не удалось загрузить документы');
        }

        const docs = Array.isArray(payload.documents) ? payload.documents : [];
        const mapped: DocumentItem[] = docs.map((doc: any) => {
          const normalizedType = normalizeType(doc.type || '');
          const rawDownload = doc.downloadUrl || doc.download_url || '';
          const downloadUrl =
            rawDownload.startsWith('http') || rawDownload.startsWith('//')
              ? rawDownload
              : rawDownload
              ? `${API_BASE_URL}${rawDownload.startsWith('/') ? '' : '/'}${rawDownload}`
              : '';
          return {
            id: doc.id,
            title: doc.title || doc.fileName || 'Без названия',
            category: normalizeCategoryDisplay(doc.category || 'Общее'),
            description: doc.description,
            year: doc.year,
            type: normalizedType,
            sizeBytes: typeof doc.sizeBytes === 'number' ? doc.sizeBytes : 0,
            fileName: doc.fileName || doc.filename || doc.id,
            downloadUrl,
          };
        });
        setDocuments(mapped);
      } catch (err) {
        console.error(err);
        setError('Не удалось загрузить документы. Попробуйте обновить страницу.');
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const categories = useMemo(() => {
    const unique = new Map<string, string>();
    documents.forEach((doc) => {
      const display = normalizeCategoryDisplay(doc.category || 'Общее');
      unique.set(canonicalCategory(display), display);
    });
    const cats = Array.from(unique.values());
    return ['Все', ...cats];
  }, [documents]);

  const uploadCategoryOptions = useMemo(() => {
    const unique = new Map<string, string>();
    documents.forEach((doc) => {
      const display = normalizeCategoryDisplay(doc.category || 'Общее');
      unique.set(canonicalCategory(display), display);
    });
    const displayInput = normalizeCategoryDisplay(newCategory);
    unique.set(canonicalCategory(displayInput), displayInput);
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [documents, newCategory]);

  const filteredDocs = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return documents.filter((doc) => {
      const matchesSearch = `${doc.title} ${doc.description ?? ''}`.toLowerCase().includes(query);
      const matchesCategory =
        selectedCategory === 'Все' ||
        canonicalCategory(doc.category || '') === canonicalCategory(selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [documents, searchTerm, selectedCategory]);

  const handleDownload = (doc: DocumentItem) => {
    if (doc.downloadUrl) {
      window.open(doc.downloadUrl, '_blank');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminUser) {
      setUploadError('Недостаточно прав для загрузки документов');
      return;
    }
    if (!newFile) {
      setUploadError('Выберите файл');
      return;
    }
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append('file', newFile);
    formData.append('title', newTitle || newFile.name);
    const displayCategory = normalizeCategoryDisplay(newCategory);
    formData.append('category', displayCategory);
    formData.append('description', newDescription);
    if (typeof newYear === 'number') {
      formData.append('year', String(newYear));
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }
      const payload = await response.json();
      const newDoc = {
        id: payload.id,
        title: payload.title,
        category: normalizeCategoryDisplay(payload.category || 'Общее'),
        description: payload.description,
        year: payload.year,
        type: normalizeType(payload.type || ''),
        sizeBytes: typeof payload.sizeBytes === 'number' ? payload.sizeBytes : 0,
        fileName: payload.fileName || payload.filename || payload.id,
        downloadUrl: payload.downloadUrl
          ? `${API_BASE_URL}${payload.downloadUrl.startsWith('/') ? '' : '/'}${payload.downloadUrl}`
          : '',
      } as DocumentItem;
      setDocuments((prev) => [newDoc, ...prev]);
      setNewFile(null);
      setNewTitle('');
      setNewCategory('Прочее');
      setNewYear('');
      setNewDescription('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setUploadOpen(false);
    } catch (err) {
      console.error(err);
      setUploadError('Не удалось загрузить документ');
    } finally {
      setUploading(false);
    }
  };

  const renderIcon = (type: string) => {
    if (type === 'pdf') return 'picture_as_pdf';
    if (type === 'xls' || type === 'xlsx') return 'table_view';
    return 'description';
  };

  const renderIconClasses = (type: string) => {
    if (type === 'pdf') return 'bg-accent/15 text-accent';
    if (type === 'xls' || type === 'xlsx') return 'bg-primary/10 text-primary';
    return 'bg-[var(--color-info-surface)] text-[var(--color-ink)]';
  };
  const searchActive = searchOpen || !!searchTerm;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-ink)]">Документы</h1>
          <p className="text-[var(--color-ink-soft)]">Архив официальных документов ТСЖ.</p>
        </div>
        {isAdminUser && (
          <button
            onClick={() => setUploadOpen((v) => !v)}
            className="bg-primary hover:bg-accent text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined">upload</span>
            {uploadOpen ? 'Скрыть форму' : 'Загрузить документ'}
          </button>
        )}
      </div>

      <div className="bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm overflow-hidden backdrop-blur-sm">
        {isAdminUser && uploadOpen && (
          <div className="p-4 border-b border-[color:var(--color-info-border)] bg-white/70 space-y-3">
            <h3 className="font-semibold text-[var(--color-ink)]">Новая загрузка</h3>
            <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm text-[var(--color-ink-soft)]">Название</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full border border-[color:var(--color-info-border)] rounded-lg px-3 py-2 text-sm bg-white text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Например, Финансовый отчет"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-[var(--color-ink-soft)]">Файл</label>
                <label
                  htmlFor="document-file"
                  className="w-full inline-flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-[color:var(--color-info-border)] bg-white text-sm cursor-pointer hover:bg-[var(--color-info-surface)]"
                >
                  {!newFile && (
                    <span className="inline-flex items-center gap-2 text-[var(--color-ink)] font-medium">
                      <span className="material-symbols-outlined text-base">attach_file</span>
                      Выбрать файл
                    </span>
                  )}
                  <span className={`text-sm truncate ${newFile ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-soft)]'}`}>
                    {newFile ? newFile.name : 'Файл не выбран'}
                  </span>
                </label>
                <input
                  id="document-file"
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-[var(--color-ink-soft)]">Категория</label>
                <div className="relative">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => {
                      setNewCategory(e.target.value);
                      setCategoryOpen(true);
                    }}
                    onFocus={() => setCategoryOpen(true)}
                    onBlur={() => setTimeout(() => setCategoryOpen(false), 120)}
                    className="w-full border border-[color:var(--color-info-border)] rounded-lg px-3 py-2 text-sm bg-white text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Например, Отчеты"
                  />
                  {categoryOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-[color:var(--color-info-border)] rounded-lg shadow-sm max-h-40 overflow-auto">
                      {uploadCategoryOptions
                        .filter((cat) => cat.toLowerCase().includes(newCategory.trim().toLowerCase()))
                        .map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setNewCategory(cat);
                              setCategoryOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-info-surface)]"
                          >
                            {cat}
                          </button>
                        ))}
                      {uploadCategoryOptions.filter((cat) => cat.toLowerCase().includes(newCategory.trim().toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-sm text-[var(--color-ink-soft)]">Нет совпадений</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-[var(--color-ink-soft)]">Год</label>
                <input
                  type="number"
                  value={newYear}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewYear(value === '' ? '' : Number(value));
                  }}
                  className="w-full border border-[color:var(--color-info-border)] rounded-lg px-3 py-2 text-sm bg-white text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="2024"
                  min={2010}
                  max={2100}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-sm text-[var(--color-ink-soft)]">Комментарий</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full border border-[color:var(--color-info-border)] rounded-lg px-3 py-2 text-sm bg-white text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[80px]"
                  placeholder="Кратко опишите документ"
                />
              </div>
              {uploadError && (
                <div className="md:col-span-2 text-sm text-accent bg-accent/10 border border-accent/30 rounded-lg px-3 py-2">
                  {uploadError}
                </div>
              )}
              <div className="md:col-span-2 flex gap-2">
                <button
                  type="submit"
                  disabled={uploading}
                  className="bg-primary hover:bg-accent disabled:opacity-70 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined">upload</span>
                  {uploading ? 'Загрузка...' : 'Загрузить'}
                </button>
                <button
                  type="button"
                  onClick={() => setUploadOpen(false)}
                  className="bg-white text-[var(--color-ink-soft)] px-4 py-2 rounded-lg border border-[color:var(--color-info-border)]"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="p-4 border-b border-[color:var(--color-info-border)] flex flex-col md:flex-row md:items-center md:flex-nowrap gap-4">
          <div
            className={`relative w-full md:flex-none md:overflow-hidden transition-[width] duration-300 ease-out ${
              searchActive ? 'md:w-[360px]' : 'md:w-12 md:cursor-pointer'
            }`}
            onClick={() => {
              setSearchOpen(true);
              searchInputRef.current?.focus();
            }}
          >
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[var(--color-ink-soft)] pointer-events-none">search</span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Поиск документов..."
              className={`w-full pl-10 pr-4 py-2 border border-[color:var(--color-info-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-white text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)] ${
                searchActive
                  ? ''
                  : 'md:border-transparent md:bg-transparent md:shadow-none md:pl-9 md:pr-0 md:text-transparent md:caret-transparent md:placeholder-transparent md:cursor-pointer'
              }`}
              value={searchTerm}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => {
                if (!searchTerm) setSearchOpen(false);
              }, 120)}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 md:pb-0 md:flex-1 md:min-w-0">
            {categories.map((cat) => (
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

        <div className="divide-y divide-[color:var(--color-info-border)] min-h-[200px]">
          {loading && (
            <div className="p-8 text-center text-[var(--color-ink-soft)]">
              Загрузка документов...
            </div>
          )}

          {!loading && error && (
            <div className="p-8 text-center text-red-600">
              {error}
            </div>
          )}

          {!loading && !error && filteredDocs.length === 0 && (
            <div className="p-8 text-center text-[var(--color-ink-soft)]">
              Документы не найдены
            </div>
          )}

          {!loading && !error && filteredDocs.map((doc) => (
            <div key={doc.id} className="p-4 flex items-start md:items-center gap-4 hover:bg-white/70 transition-colors group">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${renderIconClasses(doc.type)}`}>
                <span className="material-symbols-outlined">
                  {renderIcon(doc.type)}
                </span>
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="text-sm font-medium text-[var(--color-ink)] truncate">{doc.title}</h4>
                {doc.description && (
                  <p className="text-xs text-[var(--color-ink-soft)] leading-snug line-clamp-2">{doc.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-[var(--color-ink-soft)]">
                  <span>{doc.year ?? '—'}</span>
                  <span>•</span>
                  <span>{formatSize(doc.sizeBytes)}</span>
                  <span>•</span>
                  <span className="bg-[var(--color-info-surface)] px-2 py-0.5 rounded text-[var(--color-ink)] border border-[color:var(--color-info-border)]">
                    {doc.category}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleDownload(doc)}
                className="p-2 text-[var(--color-ink-soft)] hover:text-accent hover:bg-accent/10 rounded-full transition-colors"
                title="Скачать"
              >
                <span className="material-symbols-outlined">download</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Documents;
