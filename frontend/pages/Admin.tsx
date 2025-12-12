import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { DocumentItem, NewsItem } from '../types';

type Building = {
  id: string;
  label: string;
  area: number;
  icon: 'architecture' | 'home_pin' | 'apartment';
};

type ResidentDebt = {
  id: string;
  name: string;
  unit: string;
  phone: string;
  debt: number;
  note?: string;
  houseId: string;
};

type Contribution = {
  id: string;
  name: string;
  month: string;
  amount: number;
  note?: string;
};

const houses: Building[] = [
  { id: 'main', label: '188661, Новое Девяткино, д. 75, А', area: 15894.1, icon: 'apartment' },
  { id: 'k1', label: 'Дом 75 корпус 1', area: 1342.9, icon: 'architecture' },
  { id: 'k2', label: 'Дом 75 корпус 2', area: 1348.3, icon: 'architecture' },
  { id: 'k3', label: 'Дом 75 корпус 3', area: 1180.2, icon: 'architecture' },
  { id: 'k4', label: 'Дом 75 корпус 4', area: 503.6, icon: 'architecture' },
  { id: 'k5', label: 'Дом 75 корпус 5', area: 1817.7, icon: 'architecture' },
  { id: 'k6', label: 'Дом 75 корпус 6', area: 1525.4, icon: 'architecture' },
  { id: 'k7', label: 'Дом 75 корпус 7', area: 1341.8, icon: 'architecture' },
  { id: 'k8', label: 'Дом 75 корпус 8', area: 1346.4, icon: 'architecture' },
  { id: 'k9', label: 'Дом 75 корпус 9', area: 1181.0, icon: 'architecture' },
  { id: 'k10', label: 'Дом 75 корпус 10', area: 1341.2, icon: 'architecture' },
  { id: 'k11', label: 'Дом 75 корпус 11', area: 831.5, icon: 'architecture' },
  { id: 'k12', label: 'Дом 75 корпус 12', area: 842.0, icon: 'architecture' },
  { id: 'k13', label: 'Дом 75 корпус 13', area: 444.3, icon: 'home_pin' },
  { id: 'k14', label: 'Дом 75 корпус 14', area: 441.4, icon: 'home_pin' },
  { id: 'k15', label: 'Дом 75 корпус 15', area: 406.4, icon: 'home_pin' },
];

const defaultNewsImage = '/images/gerb250.jpg';
const API_BASE_URL = (
  import.meta.env.VITE_BACKEND_URL
    ? String(import.meta.env.VITE_BACKEND_URL)
    : 'http://localhost:8080'
).replace(/\/$/, '');

const initialResidents: ResidentDebt[] = [];

const initialNews: NewsItem[] = [
  {
    id: 'n1',
    title: 'Обновление регламента работ по подъездам',
    summary: 'С 20 ноября бригада приступает к косметическому ремонту подъездов 1 и 2. Работы займут 7–10 дней, шумные процессы проводим с 10:00 до 18:00.',
    date: '12 Ноя 2024',
    image: '',
    tag: 'Важно',
  },
  {
    id: 'n2',
    title: 'Внутридворовая ярмарка выходного дня',
    summary: 'В субботу 16 ноября в 12:00 проводим двориковую ярмарку. Будут кофе, выпечка и стенд с инициативами жильцов.',
    date: '08 Ноя 2024',
    image: '/images/hero/hero-2.jpg',
    tag: 'Событие',
  },
  {
    id: 'n3',
    title: 'Проверка пожарной сигнализации',
    summary: 'Плановая проверка сигнализации в блоках А и Б пройдёт 18 ноября. Просьба обеспечить доступ в электрощитовые.',
    date: '06 Ноя 2024',
    image: '/images/fireman.jpg',
    tag: 'Ремонт',
  },
];

const initialDocuments: DocumentItem[] = [];

const baseCashflow = [
  { month: 'Июл', collected: 512000, debt: 82000 },
  { month: 'Авг', collected: 498000, debt: 76000 },
  { month: 'Сен', collected: 545000, debt: 68000 },
  { month: 'Окт', collected: 572000, debt: 64000 },
  { month: 'Ноя', collected: 558000, debt: 72000 },
  { month: 'Дек', collected: 0, debt: 0 },
];

const monthOrder = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

const formatCurrency = (value: number) => `${value.toLocaleString('ru-RU')} ₽`;

const formatSize = (bytes: number) => {
  if (!bytes || bytes <= 0) return '—';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const normalizeCategoryDisplay = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return 'Общее';
  return trimmed.toLowerCase() === 'общее' ? 'Общее' : trimmed;
};
const canonicalCategory = (value: string) => normalizeCategoryDisplay(value).toLowerCase();

const normalizeType = (type: string) => type.replace('.', '').toLowerCase() || 'doc';

const Admin: React.FC = () => {
  const [residents, setResidents] = useState<ResidentDebt[]>(initialResidents);
  const [newsItems, setNewsItems] = useState<NewsItem[]>(initialNews);
  const [newsForm, setNewsForm] = useState({
    title: '',
    summary: '',
    tag: 'Важно' as NewsItem['tag'],
    image: '',
  });
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('Общее');
  const [docDescription, setDocDescription] = useState('');
  const [docYear, setDocYear] = useState<number | ''>(new Date().getFullYear());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docLoading, setDocLoading] = useState(true);
  const [docError, setDocError] = useState<string | null>(null);
  const [docSaving, setDocSaving] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [debtorForm, setDebtorForm] = useState({
    houseId: houses[0]?.id ?? 'main',
    name: '',
    unit: '',
    phone: '',
    debt: 0,
    note: '',
  });
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [contributionForm, setContributionForm] = useState({
    name: '',
    amount: 0,
    month: 'Ноя',
    note: '',
  });
  const debtFormRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const mapApiDoc = (doc: any): DocumentItem => {
    const normalizedType = normalizeType(doc.type || '');
    const normalizedCategory = normalizeCategoryDisplay(doc.category || 'Общее');
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
      category: normalizedCategory,
      description: doc.description,
      year: doc.year,
      type: normalizedType,
      sizeBytes: typeof doc.sizeBytes === 'number' ? doc.sizeBytes : 0,
      fileName: doc.fileName || doc.filename || doc.id,
      downloadUrl,
    };
  };

  useEffect(() => {
    const load = async () => {
      setDocLoading(true);
      setDocError(null);
      try {
        const endpoints = ['/documents', '/api/documents'];
        let payload: any | null = null;
        let lastError: unknown = null;

        for (const path of endpoints) {
          try {
            const response = await fetch(`${API_BASE_URL}${path}`);
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
        setDocuments(docs.map(mapApiDoc));
      } catch (err) {
        console.error(err);
        setDocError('Не удалось загрузить документы');
      } finally {
        setDocLoading(false);
      }
    };
    load();
  }, []);

  const categoryOptions = useMemo(() => {
    const set = new Map<string, string>(); // canonical -> display
    documents.forEach((doc) => {
      const norm = normalizeCategoryDisplay(doc.category);
      set.set(canonicalCategory(norm), norm);
    });
    set.set(canonicalCategory(docCategory), normalizeCategoryDisplay(docCategory));
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [documents, docCategory]);

  const summary = useMemo(() => {
    const totalDebt = residents.reduce((sum, r) => sum + Math.max(r.debt, 0), 0);
    const indebtedCount = residents.filter((r) => r.debt > 0).length;
    const paidShare = residents.length === 0
      ? 100
      : Math.round(((residents.length - indebtedCount) / residents.length) * 100);
    const contributionTotal = contributions.reduce((sum, item) => sum + Math.max(item.amount, 0), 0);
    return {
      totalDebt,
      indebtedCount,
      paidShare,
      newsCount: newsItems.length,
      docCount: documents.length,
      contributionTotal,
    };
  }, [residents, newsItems, documents, contributions]);

  const chartData = useMemo(() => {
    const cloned = baseCashflow.map((item) => ({ ...item }));

    contributions.forEach((c) => {
      const idx = cloned.findIndex((row) => row.month === c.month);
      if (idx >= 0) {
        cloned[idx] = { ...cloned[idx], collected: cloned[idx].collected + c.amount };
      } else {
        cloned.push({ month: c.month, collected: c.amount, debt: cloned[cloned.length - 1]?.debt ?? 0 });
      }
    });

    const monthRank = (m: string) => monthOrder.indexOf(m);
    return cloned.sort((a, b) => {
      const ai = monthRank(a.month);
      const bi = monthRank(b.month);
      if (ai === -1 || bi === -1) return 0;
      return ai - bi;
    });
  }, [contributions]);

  const getHouseById = (id: string) => houses.find((h) => h.id === id);

  const handleDebtChange = (id: string, amount: number) => {
    setResidents((prev) =>
      prev.map((r) => (r.id === id ? { ...r, debt: Math.max(0, amount) } : r))
    );
  };

  const handleDebtorRemove = (id: string) => {
    setResidents((prev) => prev.filter((r) => r.id !== id));
  };

  const handleDebtorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtorForm.name.trim() || !debtorForm.unit.trim()) return;

    const newDebtor: ResidentDebt = {
      id: `r-${Date.now()}`,
      name: debtorForm.name.trim(),
      unit: debtorForm.unit.trim(),
      phone: debtorForm.phone.trim(),
      debt: Math.max(0, debtorForm.debt),
      note: debtorForm.note.trim() || undefined,
      houseId: debtorForm.houseId,
    };

    setResidents((prev) => [newDebtor, ...prev]);
    setDebtorForm({
      houseId: houses[0]?.id ?? 'main',
      name: '',
      unit: '',
      phone: '',
      debt: 0,
      note: '',
    });
  };

  const handleContributionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributionForm.name.trim() || contributionForm.amount <= 0) return;

    const newContribution: Contribution = {
      id: `c-${Date.now()}`,
      name: contributionForm.name.trim(),
      amount: contributionForm.amount,
      month: contributionForm.month,
      note: contributionForm.note.trim() || undefined,
    };

    setContributions((prev) => [newContribution, ...prev]);
    setContributionForm((prev) => ({ ...prev, amount: 0, name: '', note: '' }));
  };

  const handleContributionRemove = (id: string) => {
    setContributions((prev) => prev.filter((c) => c.id !== id));
  };

  const getNewsImage = (src?: string) => (src && src.trim() ? src.trim() : defaultNewsImage);

  const resetNewsForm = () => {
    setNewsForm({ title: '', summary: '', tag: 'Важно', image: '' });
    setEditingNewsId(null);
  };

  const handleNewsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsForm.title.trim() || !newsForm.summary.trim()) return;

    const payload: NewsItem = {
      id: editingNewsId ?? `n-${Date.now()}`,
      title: newsForm.title.trim(),
      summary: newsForm.summary.trim(),
      tag: newsForm.tag,
      date: new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }),
      image: getNewsImage(newsForm.image),
    };

    setNewsItems((prev) => {
      if (editingNewsId) {
        return prev.map((n) => (n.id === editingNewsId ? payload : n));
      }
      return [payload, ...prev];
    });

    resetNewsForm();
  };

  const handleNewsEdit = (item: NewsItem) => {
    setEditingNewsId(item.id);
    setNewsForm({
      title: item.title ?? '',
      summary: item.summary ?? '',
      tag: (item.tag ?? 'Важно') as NewsItem['tag'],
      image: item.image && item.image !== defaultNewsImage ? item.image : '',
    });
  };

  const handleNewsRemove = (id: string) => {
    setNewsItems((prev) => prev.filter((n) => n.id !== id));
    if (editingNewsId === id) {
      resetNewsForm();
    }
  };

  const handleDocumentAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setDocError('Выберите файл для загрузки');
      return;
    }

    setDocSaving(true);
    setDocError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', docTitle || selectedFile.name);
    const displayCategory = normalizeCategoryDisplay(docCategory);
    formData.append('category', displayCategory);
    formData.append('description', docDescription);
    if (typeof docYear === 'number') {
      formData.append('year', String(docYear));
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }
      const payload = await response.json();
      setDocuments((prev) => [mapApiDoc(payload), ...prev]);
      setSelectedFile(null);
      setDocTitle('');
      setDocDescription('');
      setDocCategory('Общее');
      setDocYear(new Date().getFullYear());
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error(err);
      setDocError('Не удалось загрузить документ');
    } finally {
      setDocSaving(false);
    }
  };

  const handleDocumentRemove = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${id}/hide`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to hide');
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    } catch (err) {
      console.error(err);
      setDocError('Не удалось удалить документ из списка');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-ink)]">Админ-панель</h1>
          <p className="text-[var(--color-ink-soft)]">
            Управляйте новостями, задолженностями и документами в одном окне.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-2 rounded-lg bg-white border border-[color:var(--color-info-border)] text-sm text-[var(--color-ink-soft)] flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">verified</span>
            Данные синхронизированы
          </span>
          <span className="px-3 py-2 rounded-lg bg-primary text-white text-sm flex items-center gap-2 shadow-sm">
            <span className="material-symbols-outlined text-white">admin_panel_settings</span>
            Режим администратора
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-[var(--color-info-surface)] p-4 rounded-xl border border-[color:var(--color-info-border)] shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--color-ink-soft)]">Задолженность дома</p>
            <span className="material-symbols-outlined text-primary">payments</span>
          </div>
          <h3 className="text-2xl font-bold text-[var(--color-ink)] mt-2">{formatCurrency(summary.totalDebt)}</h3>
          <p className="text-xs text-[var(--color-ink-soft)] mt-1">Сумма по всем жильцам</p>
        </div>

        <div className="bg-[var(--color-info-surface)] p-4 rounded-xl border border-[color:var(--color-info-border)] shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--color-ink-soft)]">Жильцы без долга</p>
            <span className="material-symbols-outlined text-primary">verified_user</span>
          </div>
          <h3 className="text-2xl font-bold text-[var(--color-ink)] mt-2">{summary.paidShare}%</h3>
          <p className="text-xs text-[var(--color-ink-soft)] mt-1">{residents.length - summary.indebtedCount} из {residents.length}</p>
        </div>

        <div className="bg-[var(--color-info-surface)] p-4 rounded-xl border border-[color:var(--color-info-border)] shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--color-ink-soft)]">Новости в ленте</p>
            <span className="material-symbols-outlined text-primary">campaign</span>
          </div>
          <h3 className="text-2xl font-bold text-[var(--color-ink)] mt-2">{summary.newsCount}</h3>
          <p className="text-xs text-[var(--color-ink-soft)] mt-1">Герб по умолчанию, если без обложки</p>
        </div>

        <div className="bg-[var(--color-info-surface)] p-4 rounded-xl border border-[color:var(--color-info-border)] shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--color-ink-soft)]">Документы в архиве</p>
            <span className="material-symbols-outlined text-primary">folder_open</span>
          </div>
          <h3 className="text-2xl font-bold text-[var(--color-ink)] mt-2">{summary.docCount}</h3>
          <p className="text-xs text-[var(--color-ink-soft)] mt-1">Можно загрузить или удалить</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--color-ink)]">Динамика сборов</h3>
            <span className="text-xs text-[var(--color-ink-soft)]">Обновляется по вручную внесённым платежам</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(175,194,215,0.45)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#3b4a3b', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(175, 194, 215, 0.18)' }}
                  contentStyle={{ borderRadius: '10px', border: '1px solid rgba(175, 194, 215, 0.45)', boxShadow: '0 10px 24px rgba(47, 58, 42, 0.14)' }}
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Месяц: ${label}`}
                />
                <Area type="monotone" dataKey="collected" stroke="var(--color-forest)" fill="rgba(47,58,42,0.18)" strokeWidth={2.2} name="Собрано" />
                <Area type="monotone" dataKey="debt" stroke="var(--color-brick)" fill="rgba(180,99,59,0.16)" strokeWidth={2.2} name="Долг" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--color-ink)]">Кратко</h3>
            <span className="material-symbols-outlined text-primary">insights</span>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-ink-soft)]">Просрочка</span>
              <span className="font-semibold text-[var(--color-ink)]">{summary.indebtedCount} квартиры</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-ink-soft)]">Средний долг</span>
              <span className="font-semibold text-[var(--color-ink)]">
                {summary.indebtedCount === 0 ? '—' : formatCurrency(Math.round(summary.totalDebt / summary.indebtedCount))}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-ink-soft)]">Новые документы</span>
              <span className="font-semibold text-[var(--color-ink)]">{documents.slice(0, 3).length} за неделю</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-ink-soft)]">Публикации</span>
              <span className="font-semibold text-[var(--color-ink)]">{newsItems.length} новости</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-ink-soft)]">Учтено взносов</span>
              <span className="font-semibold text-[var(--color-ink)]">
                {summary.contributionTotal > 0 ? formatCurrency(summary.contributionTotal) : 'Пока нет'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-[var(--color-ink)]">Взносы жильцов</h3>
            <p className="text-sm text-[var(--color-ink-soft)]">Добавьте оплату — она попадёт в график выше.</p>
          </div>
          <span className="text-xs text-[var(--color-ink-soft)] px-3 py-1 rounded-full bg-white border border-[color:var(--color-info-border)]">
            {contributions.length}
          </span>
        </div>

        <form onSubmit={handleContributionSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2 space-y-1">
              <label className="text-sm text-[var(--color-ink-soft)]">ФИО / квартира</label>
              <input
                type="text"
                value={contributionForm.name}
                onChange={(e) => setContributionForm({ ...contributionForm, name: e.target.value })}
                className="w-full h-11 border border-[color:var(--color-info-border)] rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
                placeholder="Например, Кв. 14 — Ковалёва"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-[var(--color-ink-soft)]">Месяц</label>
              <select
                value={contributionForm.month}
                onChange={(e) => setContributionForm({ ...contributionForm, month: e.target.value })}
                className="w-full h-11 border border-[color:var(--color-info-border)] rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
              >
                {monthOrder.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-[var(--color-ink-soft)]">Сумма</label>
              <input
                type="number"
                min={0}
                value={contributionForm.amount}
                onChange={(e) => setContributionForm({ ...contributionForm, amount: Number(e.target.value) || 0 })}
                className="w-full h-11 border border-[color:var(--color-info-border)] rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
                placeholder="0"
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-sm text-[var(--color-ink-soft)]">Комментарий (необязательно)</label>
              <input
                type="text"
                value={contributionForm.note}
                onChange={(e) => setContributionForm({ ...contributionForm, note: e.target.value })}
                className="w-full h-11 border border-[color:var(--color-info-border)] rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
                placeholder="Например, перечисление за воду"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-accent transition-colors shadow-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              Добавить взнос
            </button>
          </div>
        </form>

        <div className="mt-6 space-y-3">
          {contributions.length === 0 && (
            <div className="text-sm text-[var(--color-ink-soft)] bg-white border border-[color:var(--color-info-border)] rounded-lg px-3 py-3">
              Пока нет добавленных оплат.
            </div>
          )}
          {contributions.map((item) => (
            <div key={item.id} className="flex flex-col md:flex-row md:items-center gap-3 bg-white/70 border border-[color:var(--color-info-border)] rounded-lg px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--color-ink)]">{item.name}</p>
                <p className="text-xs text-[var(--color-ink-soft)] flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]">{item.month}</span>
                  {item.note && <span className="line-clamp-1">{item.note}</span>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-[var(--color-ink)]">{formatCurrency(item.amount)}</span>
                <button
                  onClick={() => handleContributionRemove(item.id)}
                  className="px-2.5 py-1.5 rounded-lg text-sm text-accent border border-[color:var(--color-info-border)] bg-white hover:bg-accent/10 transition-colors"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-[var(--color-ink)]">Управление задолженностью</h3>
          </div>
          <button
            onClick={() => debtFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className="w-9 h-9 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
            title="Добавить должника"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>

        <div ref={debtFormRef} className="mb-6">
          <form onSubmit={handleDebtorSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-5 space-y-1">
              <label className="text-sm text-[var(--color-ink-soft)]">Дом</label>
              <select
                value={debtorForm.houseId}
                onChange={(e) => setDebtorForm({ ...debtorForm, houseId: e.target.value })}
                className="w-full h-11 border border-[color:var(--color-info-border)] rounded-lg px-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
              >
                {houses.map((house) => (
                  <option key={house.id} value={house.id}>
                    {house.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-2 space-y-1">
              <label className="text-sm text-[var(--color-ink-soft)]">Квартира / блок</label>
              <input
                type="text"
                value={debtorForm.unit}
                onChange={(e) => setDebtorForm({ ...debtorForm, unit: e.target.value })}
                className="w-full h-11 border border-[color:var(--color-info-border)] rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
                placeholder="Например, Кв. 42"
              />
            </div>
            <div className="lg:col-span-3 space-y-1">
              <label className="text-sm text-[var(--color-ink-soft)]">ФИО</label>
              <input
                type="text"
                value={debtorForm.name}
                onChange={(e) => setDebtorForm({ ...debtorForm, name: e.target.value })}
                className="w-full h-11 border border-[color:var(--color-info-border)] rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
                placeholder="Имя должника"
              />
            </div>
            <div className="lg:col-span-2 space-y-1">
              <label className="text-sm text-[var(--color-ink-soft)]">Телефон</label>
              <input
                type="text"
                value={debtorForm.phone}
                onChange={(e) => setDebtorForm({ ...debtorForm, phone: e.target.value })}
                className="w-full h-11 border border-[color:var(--color-info-border)] rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
                placeholder="+7 ..."
              />
            </div>
            <div className="lg:col-span-2 space-y-1">
              <label className="text-sm text-[var(--color-ink-soft)]">Сумма долга</label>
              <input
                type="number"
                min={0}
                value={debtorForm.debt}
                onChange={(e) => setDebtorForm({ ...debtorForm, debt: Number(e.target.value) || 0 })}
                className="w-full h-11 border border-[color:var(--color-info-border)] rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
                placeholder="0"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm text-[var(--color-ink-soft)]">Заметка</label>
              <input
                type="text"
                value={debtorForm.note}
                onChange={(e) => setDebtorForm({ ...debtorForm, note: e.target.value })}
                className="w-full h-11 border border-[color:var(--color-info-border)] rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
                placeholder="Например, долг за отопление"
              />
            </div>
          </form>
          <div className="flex flex-wrap items-center justify-end gap-3 mt-3">
            <button
              onClick={handleDebtorSubmit}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-accent transition-colors shadow-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              Добавить должника
            </button>
          </div>
        </div>

        <div className="divide-y divide-[color:var(--color-info-border)]">
          {residents.length === 0 && (
            <div className="text-sm text-[var(--color-ink-soft)] bg-white border border-[color:var(--color-info-border)] rounded-lg px-3 py-3">
              Пока нет должников. Добавьте запись с помощью формы выше.
            </div>
          )}
          {residents.map((resident) => {
            const house = getHouseById(resident.houseId);
            return (
              <div key={resident.id} className="py-3 flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-white border border-[color:var(--color-info-border)] text-primary grid place-items-center shrink-0">
                    <span className="material-symbols-outlined">{house?.icon ?? 'home_pin'}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--color-ink)]">{resident.name || 'Без имени'}</p>
                    <p className="text-xs text-[var(--color-ink-soft)] flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 bg-white rounded border border-[color:var(--color-info-border)]">{resident.unit || '—'}</span>
                      {resident.phone && <span>{resident.phone}</span>}
                      {house && <span className="text-[var(--color-ink-soft)]">• {house.label} ({house.area} м²)</span>}
                      {resident.note && <span className="text-[var(--color-ink-soft)]">• {resident.note}</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={resident.debt}
                    onChange={(e) => handleDebtChange(resident.id, Number(e.target.value) || 0)}
                    className="w-28 border border-[color:var(--color-info-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
                    placeholder="0"
                  />
                  <span className="text-sm text-[var(--color-ink-soft)]">₽</span>
                </div>

                <button
                  onClick={() => handleDebtorRemove(resident.id)}
                  className="px-3 py-2 rounded-lg text-sm text-accent border border-[color:var(--color-info-border)] bg-white hover:bg-accent/10 transition-colors"
                >
                  Удалить
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-[var(--color-ink)]">Новости</h3>
              <p className="text-sm text-[var(--color-ink-soft)]">Создайте или отредактируйте публикацию.</p>
            </div>
            {editingNewsId && (
              <button
                onClick={resetNewsForm}
                className="text-sm text-primary hover:text-accent flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">close</span>
                Сбросить
              </button>
            )}
          </div>

          <form onSubmit={handleNewsSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm text-[var(--color-ink-soft)]">Заголовок</label>
                <input
                  type="text"
                  value={newsForm.title}
                  onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                  className="w-full border border-[color:var(--color-info-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
                  placeholder="Например, Работы по благоустройству"
                />
              </div>
            <div className="space-y-1">
              <label className="text-sm text-[var(--color-ink-soft)]">Тег</label>
              <div className="relative">
                <select
                  value={newsForm.tag}
                  onChange={(e) => setNewsForm({ ...newsForm, tag: e.target.value as NewsItem['tag'] })}
                  className="w-full h-[42px] border border-[color:var(--color-info-border)] rounded-lg px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)] appearance-none"
                >
                  <option value="Важно">Важно</option>
                  <option value="Событие">Событие</option>
                  <option value="Ремонт">Ремонт</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-soft)] text-base">
                  expand_more
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-[var(--color-ink-soft)]">Краткое описание</label>
              <textarea
                value={newsForm.summary}
                onChange={(e) => setNewsForm({ ...newsForm, summary: e.target.value })}
                className="w-full border border-[color:var(--color-info-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)] min-h-[96px]"
                placeholder="Коротко опишите новость"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-[var(--color-ink-soft)]">Ссылка на изображение (необязательно)</label>
              <input
                type="text"
                value={newsForm.image}
                onChange={(e) => setNewsForm({ ...newsForm, image: e.target.value })}
              className="w-full border border-[color:var(--color-info-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
              placeholder="Если оставить пустым — возьмём герб"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-accent transition-colors shadow-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">{editingNewsId ? 'save' : 'add_circle'}</span>
                {editingNewsId ? 'Сохранить изменения' : 'Опубликовать новость'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--color-ink)]">Лента публикаций</h3>
            <span className="text-xs text-[var(--color-ink-soft)]">{newsItems.length} шт.</span>
          </div>
          <div className="space-y-4">
            {newsItems.map((item) => {
              const img = getNewsImage(item.image);
              return (
                <div key={item.id} className="flex gap-3 bg-white/70 border border-[color:var(--color-info-border)] rounded-lg p-3">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] shrink-0">
                    <img src={img} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold text-white ${
                          item.tag === 'Важно' ? 'bg-accent' : item.tag === 'Событие' ? 'bg-primary' : 'bg-primary/80'
                        }`}>
                          {item.tag}
                        </span>
                        <span className="text-xs text-[var(--color-ink-soft)]">{item.date}</span>
                        {img === defaultNewsImage && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] text-[var(--color-ink-soft)]">
                            Герб по умолчанию
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleNewsEdit(item)}
                          className="p-1.5 rounded-md text-[var(--color-ink-soft)] hover:text-primary hover:bg-[var(--color-info-surface)]"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button
                          onClick={() => handleNewsRemove(item.id)}
                          className="p-1.5 rounded-md text-[var(--color-ink-soft)] hover:text-accent hover:bg-accent/10"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>
                    <p className="font-semibold text-[var(--color-ink)] line-clamp-1">{item.title}</p>
                    <p className="text-sm text-[var(--color-ink-soft)] line-clamp-2">{item.summary}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-[var(--color-ink)]">Документы</h3>
            <p className="text-sm text-[var(--color-ink-soft)]">Загрузите новые или удалите устаревшие.</p>
          </div>
        </div>

        <form onSubmit={handleDocumentAdd} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div className="md:col-span-2 space-y-1">
            <label className="text-sm text-[var(--color-ink-soft)]">Название</label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full border border-[color:var(--color-info-border)] rounded-lg px-3 py-2 text-sm bg-white text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Например, Финансовый отчет за 2024"
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-sm text-[var(--color-ink-soft)]">Файл</label>
            <label
              htmlFor="doc-file"
              className="w-full inline-flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-[color:var(--color-info-border)] bg-white text-sm cursor-pointer hover:bg-[var(--color-info-surface)]"
            >
              {!selectedFile && (
                <span className="inline-flex items-center gap-2 text-[var(--color-ink)] font-medium">
                  <span className="material-symbols-outlined text-base">attach_file</span>
                  Выбрать файл
                </span>
              )}
              <span className={`text-sm truncate ${selectedFile ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-soft)]'}`}>
                {selectedFile ? selectedFile.name : 'Файл не выбран'}
              </span>
            </label>
            <input
              id="doc-file"
              ref={fileInputRef}
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-[var(--color-ink-soft)]">Категория</label>
            <div className="relative">
              <input
                type="text"
                value={docCategory}
                onChange={(e) => {
                  setDocCategory(e.target.value);
                  setCategoryOpen(true);
                }}
                onFocus={() => setCategoryOpen(true)}
                onBlur={() => setTimeout(() => setCategoryOpen(false), 120)}
                className="w-full border border-[color:var(--color-info-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
                placeholder="Например, Отчеты"
              />
              {categoryOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-[color:var(--color-info-border)] rounded-lg shadow-sm max-h-40 overflow-auto">
                  {categoryOptions
                    .filter((cat) => cat.toLowerCase().includes(docCategory.trim().toLowerCase()))
                    .map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setDocCategory(cat);
                          setCategoryOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-info-surface)]"
                      >
                        {cat}
                      </button>
                    ))}
                  {categoryOptions.filter((cat) => cat.toLowerCase().includes(docCategory.trim().toLowerCase())).length === 0 && (
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
              value={docYear}
              onChange={(e) => {
                const value = e.target.value;
                setDocYear(value === '' ? '' : Number(value));
              }}
              className="w-full border border-[color:var(--color-info-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
              min={2010}
              max={2100}
            />
          </div>
          <div className="md:col-span-4 space-y-1">
            <label className="text-sm text-[var(--color-ink-soft)]">Комментарий</label>
            <input
              type="text"
              value={docDescription}
              onChange={(e) => setDocDescription(e.target.value)}
              className="w-full border border-[color:var(--color-info-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
              placeholder="Краткое описание для жильцов"
            />
          </div>
          <div className="md:col-span-4 flex flex-col md:flex-row items-start md:items-center gap-3 mt-2 w-full justify-end">
            <button
              type="submit"
              disabled={docSaving}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-accent transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70 self-end md:self-auto"
            >
              <span className="material-symbols-outlined text-base">upload</span>
              {docSaving ? 'Загрузка...' : 'Загрузить документ'}
            </button>
          </div>
        </form>

        {docError && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-accent/10 text-sm text-accent border border-accent/40">
            {docError}
          </div>
        )}

        <div className="divide-y divide-[color:var(--color-info-border)]">
          {docLoading && (
            <div className="py-4 text-sm text-[var(--color-ink-soft)]">Загрузка документов...</div>
          )}
          {!docLoading && documents.length === 0 && (
            <div className="py-4 text-sm text-[var(--color-ink-soft)]">Документы не найдены</div>
          )}
          {documents.map((doc) => (
            <div key={doc.id} className="py-3 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-white border border-[color:var(--color-info-border)] grid place-items-center">
                  <span className="material-symbols-outlined text-primary">description</span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--color-ink)] truncate">{doc.title}</p>
                  <p className="text-xs text-[var(--color-ink-soft)] truncate">
                    {doc.category} • {doc.year ?? '—'} • {formatSize(doc.sizeBytes)}
                  </p>
                  {doc.description && <p className="text-xs text-[var(--color-ink-soft)] line-clamp-1">{doc.description}</p>}
                </div>
              </div>
              <button
                onClick={() => handleDocumentRemove(doc.id)}
                className="px-3 py-2 rounded-lg text-sm text-accent border border-[color:var(--color-info-border)] bg-white hover:bg-accent/10 transition-colors self-start md:self-auto"
              >
                Удалить
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Admin;
