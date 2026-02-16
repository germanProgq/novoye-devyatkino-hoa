import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, Scatter, Tooltip, TooltipContentProps, XAxis } from 'recharts';
import {
  ContributionItem,
  ContributionSummary,
  ContributionSuggestion,
  AccountPersonLink,
  AccountUser,
  DebtorItem,
  DocumentItem,
  NewsItem,
  MeterRecord,
  RequestItem,
  RequestStatus,
  RequestComment,
} from '../types';

type Building = {
  id: string;
  label: string;
  area: number;
  icon: 'architecture' | 'home_pin' | 'apartment';
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

const formatHouseNameForDisplay = (label?: string) => {
  if (!label) return '';
  const trimmed = label.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  const corpusIdx = lower.indexOf('корпус');
  if (corpusIdx !== -1) {
    return trimmed.slice(corpusIdx).trim();
  }
  const commaIdx = trimmed.indexOf(',');
  const head = (commaIdx !== -1 ? trimmed.slice(0, commaIdx) : trimmed).trim();
  if (!head) return trimmed;
  return head;
};

const capitalizeFirst = (value?: string) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const defaultNewsImage = '/images/gerb250.jpg';
const baseNewsTags = ['Важно', 'Событие', 'Ремонт'];
const API_BASE_URL = (
  import.meta.env.VITE_BACKEND_URL
    ? String(import.meta.env.VITE_BACKEND_URL)
    : 'http://localhost:8080'
).replace(/\/$/, '');
const apiFetch = (input: string, init: RequestInit = {}) => fetch(input, { credentials: 'include', ...init });

const initialDocuments: DocumentItem[] = [];

const FULL_MONTHS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

const FULL_MONTHS_GENITIVE = [
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

const SHORT_MONTHS_GENITIVE = [
  'янв',
  'фев',
  'мар',
  'апр',
  'май',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];

const normalizeMonthLabel = (label: string) => {
  const normalized = (label || '').trim().toLowerCase();
  const shortMap: Record<string, number> = {
    янв: 0,
    фев: 1,
    мар: 2,
    апр: 3,
    май: 4,
    июн: 5,
    июл: 6,
    авг: 7,
    сен: 8,
    окт: 9,
    ноя: 10,
    дек: 11,
  };
  const exactIndex = FULL_MONTHS.findIndex((m) => m.toLowerCase() === normalized);
  if (exactIndex !== -1) return FULL_MONTHS[exactIndex];
  const shortKey = normalized.slice(0, 3);
  if (shortMap[shortKey] !== undefined) return FULL_MONTHS[shortMap[shortKey]];
  return label || '—';
};

const buildRecentMonths = (count: number) => {
  const now = new Date();
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const point = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = FULL_MONTHS[point.getMonth()];
    if (label) months.push(label);
  }
  return months;
};

const buildRecentMonthsWindow = (availableMonths: string[], limit = 12) => {
  const now = new Date();
  const nowIdx = now.getMonth(); // 0-11
  const unique = Array.from(new Set(availableMonths.map((m) => normalizeMonthLabel(m)).filter(Boolean)));
  const monthIndices = unique
    .map((m) => monthOrder.indexOf(m))
    .filter((idx) => idx >= 0 && idx < 12);

  if (monthIndices.length === 0) {
    return buildRecentMonths(limit);
  }

  const diffs = monthIndices.map((idx) => ((nowIdx - idx + 12) % 12));
  const maxDiff = Math.min(Math.max(...diffs), limit - 1);
  const windowLength = Math.min(limit, maxDiff + 1);

  const windowMonths: string[] = [];
  for (let i = windowLength - 1; i >= 0; i -= 1) {
    const idx = (nowIdx - i + 12) % 12;
    windowMonths.push(monthOrder[idx]);
  }
  return windowMonths;
};

const renderCashflowTooltip = ({ active, payload, label }: TooltipContentProps<number, string>) => {
  if (!active || !payload || payload.length === 0) return null;
  const items = payload.filter((p) => typeof p.value === 'number');
  if (items.length === 0) return null;
  const monthLabel = normalizeMonthLabel(String(label || ''));
  return (
    <div className="rounded-lg border border-[color:var(--color-info-border)] bg-white/90 px-3 py-2 shadow-sm text-sm text-[var(--color-ink)]">
      <div className="font-semibold mb-1">{monthLabel}</div>
      {items.map((item) => (
        <div key={item.name} className="flex items-center justify-between gap-3">
          <span className="text-[var(--color-ink-soft)]">{item.name}</span>
          <span className="font-semibold">{formatCurrency(Number(item.value))}</span>
        </div>
      ))}
    </div>
  );
};

const formatDateWithFullMonth = (raw?: string) => {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  const day = String(date.getDate()).padStart(2, '0');
  const monthName = FULL_MONTHS_GENITIVE[date.getMonth()] ?? '';
  const year = date.getFullYear();
  return `${day} ${monthName} ${year}`;
};

const formatDateWithShortMonth = (raw?: string) => {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const monthName = SHORT_MONTHS_GENITIVE[date.getMonth()] ?? '';
  const year = date.getFullYear();
  return `${day} ${monthName} ${year}`;
};

const formatDateTimeCompact = (raw?: string) => {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const baseCashflow = [
  { month: 'Июль', collected: 512000, debt: 82000 },
  { month: 'Август', collected: 498000, debt: 76000 },
  { month: 'Сентябрь', collected: 545000, debt: 68000 },
  { month: 'Октябрь', collected: 572000, debt: 64000 },
  { month: 'Ноябрь', collected: 558000, debt: 72000 },
  { month: 'Декабрь', collected: 0, debt: 0 },
];

const monthOrder = [...FULL_MONTHS];

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

const buildAssetUrl = (path?: string) => {
  if (!path || !path.trim()) return '';
  if (path.startsWith('http') || path.startsWith('//')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

const formatNewsDate = (raw?: string) => formatDateWithFullMonth(raw);
const formatNewsDateCompact = (raw?: string) => formatDateWithShortMonth(raw) || (typeof raw === 'string' ? raw : '');

const parseMoneyInput = (value: string) => {
  if (!value.trim()) return NaN;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : NaN;
};

const formatSuggestionInput = (suggestion: ContributionSuggestion) => {
  if (suggestion.apartment) return `Кв. ${suggestion.apartment} — ${suggestion.displayName}`;
  return suggestion.displayName;
};

const extractNewsCount = (payload: any): number | null => {
  const raw = payload?.count ?? payload?.total ?? payload?.totalCount ?? payload?.newsCount;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const ADMIN_NEWS_PAGE_SIZE = 4;

const mapApiNews = (item: any): NewsItem => {
  const created = item.createdAt || item.created_at || item.date;
  const imagePath =
    item.imageUrl ||
    item.image_url ||
    item.image ||
    (item.imageFilename && item.id ? `/api/news/${item.id}/image` : '') ||
    (item.image_filename && item.id ? `/api/news/${item.id}/image` : '');
  return {
    id: item.id ?? '',
    title: item.title || 'Без заголовка',
    summary: item.summary || item.description || '',
    tag: item.tag || 'Без тега',
    date: formatNewsDate(created) || '—',
    image: buildAssetUrl(imagePath) || defaultNewsImage,
    imageUrl: buildAssetUrl(imagePath) || undefined,
    createdAt: created,
  };
};

type NewsFormState = {
  title: string;
  summary: string;
  tag: string;
  imageFile: File | null;
  imagePreview: string;
  imageCleared: boolean;
};

type ContributionFormState = {
  personInput: string;
  amount: string;
  month: string;
  note: string;
};

type NewContributionDetails = {
  house: string;
  apartment: string;
};

type DebtorFormState = {
  houseId: string;
  name: string;
  unit: string;
  phone: string;
  debt: string;
  note: string;
};

type RegistrationFormState = {
  houseId: string;
  fullName: string;
  phone: string;
  apartment: string;
};

type RegistrationResult = {
  username: string;
  password: string;
  displayName?: string;
  house?: string;
  apartment?: string;
  phone?: string;
  existing?: boolean;
};

type PhoneResetFormState = {
  username: string;
  phone: string;
};

type PhoneResetResult = {
  username: string;
  phone: string;
  password?: string;
  passwordReset: boolean;
};

type AdminRequestComment = RequestComment;
type AdminRequest = RequestItem;

type AdminNavigationState = {
  editNewsId?: string;
  newsPrefill?: NewsItem;
  restoreFilter?: string;
  restorePage?: number;
  returnHash?: string;
  targetTab?: AdminTab;
};

type NewsReturnState = {
  highlightNewsId: string;
  restoreFilter?: string;
  restorePage?: number;
  returnHash?: string;
};

type AdminTab = 'overview' | 'accounts' | 'payments' | 'debtors' | 'meters' | 'requests' | 'news' | 'documents';

const ADMIN_TABS: { id: AdminTab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Обзор', icon: 'dashboard' },
  { id: 'accounts', label: 'Аккаунты', icon: 'link' },
  { id: 'payments', label: 'Взносы', icon: 'payments' },
  { id: 'debtors', label: 'Должники', icon: 'warning' },
  { id: 'meters', label: 'Показания', icon: 'water' },
  { id: 'requests', label: 'Заявки', icon: 'assignment' },
  { id: 'news', label: 'Новости', icon: 'campaign' },
  { id: 'documents', label: 'Документы', icon: 'folder_open' },
];

const normalizeAdminTab = (value?: string | null): AdminTab => {
  const tab = ADMIN_TABS.find((item) => item.id === value);
  return tab ? tab.id : 'overview';
};

const requestStatusMeta: Record<RequestStatus, { label: string; color: string; bg: string; icon: string }> = {
  new: { label: 'Новое', color: 'text-primary', bg: 'bg-primary/10', icon: 'fiber_new' },
  in_progress: { label: 'В работе', color: 'text-amber-900', bg: 'bg-amber-100', icon: 'build' },
  resolved: { label: 'Решено', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: 'task_alt' },
};
const adminCommentKindLabel: Record<AdminRequestComment['kind'], string> = {
  reopen: 'Возврат в работу',
  note: 'Комментарий администратора',
};

const mapApiAdminRequestComment = (raw: any): AdminRequestComment => ({
  id: raw?.id ?? `c-${Math.random().toString(36).slice(2)}`,
  text: raw?.text ?? '',
  createdAt: raw?.createdAt || raw?.created_at || raw?.date || '',
  kind: raw?.kind === 'reopen' ? 'reopen' : 'note',
});

const mapApiAdminRequest = (raw: any): AdminRequest => ({
  id: raw?.id ?? '',
  username: raw?.username || raw?.user || '',
  title: raw?.title ?? '',
  category: raw?.category || 'Общее',
  description: raw?.description ?? '',
  fullName: raw?.fullName || raw?.full_name || raw?.fio || '',
  status: raw?.status === 'resolved' ? 'resolved' : raw?.status === 'in_progress' ? 'in_progress' : 'new',
  createdAt: raw?.createdAt || raw?.created_at || '',
  updatedAt: raw?.updatedAt || raw?.updated_at || raw?.createdAt || '',
  comments: Array.isArray(raw?.comments) ? raw.comments.map(mapApiAdminRequestComment) : [],
});

const formatRequestDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const Admin: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>(() =>
    normalizeAdminTab(new URLSearchParams(location.search).get('tab'))
  );
  const [debtors, setDebtors] = useState<DebtorItem[]>([]);
  const [meterReadings, setMeterReadings] = useState<MeterRecord[]>([]);
  const [meterLoading, setMeterLoading] = useState(false);
  const [meterError, setMeterError] = useState<string | null>(null);
  const [meterUserFilter, setMeterUserFilter] = useState('');
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsPage, setNewsPage] = useState(0);
  const [newsTotalCount, setNewsTotalCount] = useState(0);
  const [newsForm, setNewsForm] = useState<NewsFormState>({
    title: '',
    summary: '',
    tag: 'Важно',
    imageFile: null,
    imagePreview: '',
    imageCleared: false,
  });
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsSaving, setNewsSaving] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [tagOpen, setTagOpen] = useState(false);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [pendingNewsEditId, setPendingNewsEditId] = useState<string | null>(null);
  const [prefillNewsItem, setPrefillNewsItem] = useState<NewsItem | null>(null);
  const [newsReturnState, setNewsReturnState] = useState<NewsReturnState | null>(null);
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
  const [debtorForm, setDebtorForm] = useState<DebtorFormState>({
    houseId: houses[0]?.id ?? 'main',
    name: '',
    unit: '',
    phone: '',
    debt: '',
    note: '',
  });
  const [debtorsLoading, setDebtorsLoading] = useState(false);
  const [debtorSaving, setDebtorSaving] = useState(false);
  const [debtorError, setDebtorError] = useState<string | null>(null);
  const [debtorDebtInputs, setDebtorDebtInputs] = useState<Record<string, string>>({});
  const [accountUsers, setAccountUsers] = useState<AccountUser[]>([]);
  const [accountLinks, setAccountLinks] = useState<AccountPersonLink[]>([]);
  const [accountLinksLoading, setAccountLinksLoading] = useState(false);
  const [accountLinkSaving, setAccountLinkSaving] = useState(false);
  const [accountLinkError, setAccountLinkError] = useState<string | null>(null);
  const [registrationForm, setRegistrationForm] = useState<RegistrationFormState>({
    houseId: houses[0]?.id ?? 'main',
    fullName: '',
    phone: '',
    apartment: '',
  });
  const [registrationSaving, setRegistrationSaving] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [registrationResult, setRegistrationResult] = useState<RegistrationResult | null>(null);
  const [phoneResetForm, setPhoneResetForm] = useState<PhoneResetFormState>({
    username: '',
    phone: '',
  });
  const [phoneResetSaving, setPhoneResetSaving] = useState(false);
  const [phoneResetError, setPhoneResetError] = useState<string | null>(null);
  const [phoneResetResult, setPhoneResetResult] = useState<PhoneResetResult | null>(null);
  const [knownPeople, setKnownPeople] = useState<ContributionSuggestion[]>([]);
  const [knownPeopleLoading, setKnownPeopleLoading] = useState(false);
  const [linkPersonQuery, setLinkPersonQuery] = useState('');
  const [linkSelectedPerson, setLinkSelectedPerson] = useState<ContributionSuggestion | null>(null);
  const [linkSelectedUser, setLinkSelectedUser] = useState('');
  const [linkSuggestionsOpen, setLinkSuggestionsOpen] = useState(false);
  const [contributions, setContributions] = useState<ContributionItem[]>([]);
  const [contributionSummary, setContributionSummary] = useState<ContributionSummary>({
    totalAmount: 0,
    contributionCount: 0,
    peopleCount: 0,
    byMonth: [],
  });
  const [contributionForm, setContributionForm] = useState<ContributionFormState>({
    personInput: '',
    amount: '',
    month: 'Ноябрь',
    note: '',
  });
  const [contributionSuggestions, setContributionSuggestions] = useState<ContributionSuggestion[]>([]);
  const [selectedContribution, setSelectedContribution] = useState<ContributionSuggestion | null>(null);
  const [newContributionDetails, setNewContributionDetails] = useState<NewContributionDetails>({
    house: '',
    apartment: '',
  });
  const [contributionError, setContributionError] = useState<string | null>(null);
  const [contributionLoading, setContributionLoading] = useState(false);
  const [parsingInput, setParsingInput] = useState(false);
  const [suppressSuggestions, setSuppressSuggestions] = useState(false);
  const lastSelectedInputRef = useRef<string | null>(null);
  const debtFormRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const newsImageInputRef = useRef<HTMLInputElement | null>(null);
  const newsSectionRef = useRef<HTMLDivElement | null>(null);
  const newsFormRef = useRef<HTMLFormElement | null>(null);
  const cashflowChartRef = useRef<HTMLDivElement | null>(null);
  const [cashflowChartSize, setCashflowChartSize] = useState({ width: 0, height: 0 });
  const debtUpdateTimers = useRef<Record<string, number>>({});
  const pendingDebtUpdates = useRef<Record<string, number>>({});
  const [adminRequests, setAdminRequests] = useState<AdminRequest[]>([]);
  const [adminRequestsLoading, setAdminRequestsLoading] = useState(true);
  const [adminRequestsError, setAdminRequestsError] = useState<string | null>(null);
  const [requestMutations, setRequestMutations] = useState<Record<string, boolean>>({});
  const [requestActionError, setRequestActionError] = useState<string | null>(null);
  const [adminRequestFilter, setAdminRequestFilter] = useState<'active' | 'resolved' | 'all'>('active');
  const [adminRequestSearch, setAdminRequestSearch] = useState('');
  const [adminReopenDrafts, setAdminReopenDrafts] = useState<Record<string, string>>({});
  const [adminCommentDrafts, setAdminCommentDrafts] = useState<Record<string, string>>({});
  const setTab = useCallback(
    (next: AdminTab, options?: { replace?: boolean }) => {
      setActiveTab(next);
      const params = new URLSearchParams(location.search);
      if (params.get('tab') !== next) {
        params.set('tab', next);
        navigate(
          { pathname: location.pathname, search: `?${params.toString()}`, hash: location.hash },
          { replace: options?.replace ?? true }
        );
      }
    },
    [location.hash, location.pathname, location.search, navigate]
  );
  const loadNewsCount = useCallback(async (fallbackCount?: number) => {
    const endpoints = ['/api/news/count', '/news/count'];
    for (const path of endpoints) {
      try {
        const response = await apiFetch(`${API_BASE_URL}${path}`);
        if (!response.ok) continue;
        const payload = await response.json();
        const parsed = extractNewsCount(payload);
        if (parsed !== null) {
          setNewsTotalCount(parsed);
          return parsed;
        }
      } catch (err) {
        console.error(err);
      }
    }
    if (typeof fallbackCount === 'number') {
      setNewsTotalCount((prev) => (prev > 0 ? prev : fallbackCount));
      return fallbackCount;
    }
    return null;
  }, []);

  useEffect(() => {
    const tabFromUrl = normalizeAdminTab(new URLSearchParams(location.search).get('tab'));
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [activeTab, location.search]);
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

  const mapApiContribution = (item: any): ContributionItem => ({
    id: item.id ?? '',
    input: item.input || item.person_input || '',
    displayName: item.displayName || item.name || 'Без имени',
    normalizedName: item.normalizedName || item.normalized_name || '',
    apartment: item.apartment || item.unit || undefined,
    houses: Array.isArray(item.houses) ? item.houses.map(String) : [],
    month: item.month ? normalizeMonthLabel(item.month) : '—',
    amount: typeof item.amount === 'number' ? item.amount : Number(item.amount) || 0,
    note: item.note || '',
    createdAt: item.createdAt || item.created_at || '',
  });

  const mapApiDebtor = (item: any): DebtorItem => ({
    id: item.id ?? '',
    displayName: item.displayName || item.name || '',
    normalizedName: item.normalizedName || item.normalized_name || '',
    apartment: item.apartment || item.unit || undefined,
    houses: Array.isArray(item.houses) ? item.houses.map((h: any) => String(h)) : [],
    phone: item.phone || '',
    debt: typeof item.debt === 'number' ? item.debt : Number(item.debt) || 0,
    note: item.note || '',
    updatedAt: item.updatedAt || item.updated_at || '',
  });

  const mapApiMeter = (item: any): MeterRecord => ({
    id: item.id ?? '',
    username: item.username || '',
    hotWater: typeof item.hotWater === 'number' ? item.hotWater : Number(item.hotWater) || 0,
    coldWater: typeof item.coldWater === 'number' ? item.coldWater : Number(item.coldWater) || 0,
    electricity: typeof item.electricity === 'number' ? item.electricity : Number(item.electricity) || 0,
    createdAt: item.createdAt || item.created_at || '',
  });

  const mapApiAccountUser = (item: any): AccountUser => ({
    username: item.username || '',
    role: typeof item.role === 'string' ? item.role : '',
  });

  const mapApiAccountLink = (item: any): AccountPersonLink => ({
    id: item.id ?? '',
    username: item.username || '',
    displayName: item.displayName || item.name || item.rawInput || '',
    normalizedName: item.normalizedName || item.normalized_name || '',
    apartment: item.apartment || item.unit || undefined,
    houses: Array.isArray(item.houses) ? item.houses.map((h: any) => String(h)) : [],
    phone: item.phone || '',
    createdAt: item.createdAt || item.created_at || undefined,
    updatedAt: item.updatedAt || item.updated_at || undefined,
  });

  const mapApiPerson = (item: any): ContributionSuggestion => ({
    rawInput: item.rawInput || '',
    displayName: item.displayName || item.name || '',
    normalizedName: item.normalizedName || item.normalized_name || '',
    apartment: item.apartment || item.unit || undefined,
    houses: Array.isArray(item.houses) ? item.houses.map((h: any) => String(h)) : [],
    source: item.source || '',
  });

  const normalizeContributionSummaryData = (summary: any): ContributionSummary => ({
    totalAmount: typeof summary?.totalAmount === 'number' ? summary.totalAmount : Number(summary?.totalAmount) || 0,
    contributionCount: typeof summary?.contributionCount === 'number' ? summary.contributionCount : Number(summary?.contributionCount) || 0,
    peopleCount: typeof summary?.peopleCount === 'number' ? summary.peopleCount : Number(summary?.peopleCount) || 0,
    byMonth: Array.isArray(summary?.byMonth)
      ? summary.byMonth.map((row: any) => ({
          month: normalizeMonthLabel(row.month || row.label || '—'),
          collected: typeof row.collected === 'number' ? row.collected : Number(row.collected) || 0,
        }))
      : [],
  });

  const upsertAdminRequest = useCallback((updated: AdminRequest) => {
    setAdminRequests((prev) => {
      const idx = prev.findIndex((r) => r.id === updated.id);
      if (idx === -1) return [updated, ...prev];
      const next = [...prev];
      next[idx] = updated;
      return next;
    });
  }, []);

  const loadAdminRequests = useCallback(async () => {
    setAdminRequestsLoading(true);
    setAdminRequestsError(null);
    setRequestActionError(null);
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/requests`);
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }
      const payload = await response.json();
      const list = Array.isArray(payload.requests) ? payload.requests : Array.isArray(payload) ? payload : [];
      setAdminRequests(list.map(mapApiAdminRequest));
    } catch (err) {
      console.error(err);
      setAdminRequestsError('Не удалось загрузить заявки');
    } finally {
      setAdminRequestsLoading(false);
    }
  }, []);

  const loadContributionSummary = async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/contributions/summary`);
      if (!response.ok) return;
      const payload = await response.json();
      setContributionSummary(normalizeContributionSummaryData(payload));
    } catch (err) {
      console.error(err);
    }
  };

  const loadMeters = useCallback(async () => {
    setMeterLoading(true);
    setMeterError(null);
    try {
      const query = meterUserFilter ? `?username=${encodeURIComponent(meterUserFilter)}` : '';
      const response = await apiFetch(`${API_BASE_URL}/api/meters${query}`);
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }
      const payload = await response.json();
      const list = Array.isArray(payload.readings) ? payload.readings : Array.isArray(payload) ? payload : [];
      setMeterReadings(list.map(mapApiMeter));
    } catch (err) {
      console.error(err);
      setMeterError('Не удалось загрузить показания');
    } finally {
      setMeterLoading(false);
    }
  }, [meterUserFilter]);

  const loadAccountUsers = useCallback(async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/auth/users`);
      if (!response.ok) return;
      const payload = await response.json();
      const list = Array.isArray(payload.users) ? payload.users.map(mapApiAccountUser) : [];
      setAccountUsers(list);
      setLinkSelectedUser((prev) => {
        if (prev) return prev;
        const candidate = list.find((u) => u.role === 'user') || list[0];
        return candidate?.username || '';
      });
      setPhoneResetForm((prev) => {
        if (prev.username) return prev;
        const candidate = list.find((u) => u.role === 'user');
        const username = candidate?.username || '';
        return { ...prev, username };
      });
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadAccountLinks = useCallback(async () => {
    setAccountLinksLoading(true);
    setAccountLinkError(null);
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/accounts/links`);
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }
      const payload = await response.json();
      const list = Array.isArray(payload.links) ? payload.links.map(mapApiAccountLink) : [];
      setAccountLinks(list);
    } catch (err) {
      console.error(err);
      setAccountLinkError('Не удалось загрузить привязки аккаунтов');
    } finally {
      setAccountLinksLoading(false);
    }
  }, []);

  const loadKnownPeople = useCallback(async () => {
    setKnownPeopleLoading(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/contributions/people`);
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }
      const payload = await response.json();
      const list = Array.isArray(payload.people) ? payload.people.map(mapApiPerson) : [];
      const unique = new Map<string, ContributionSuggestion>();
      list.forEach((item) => {
        const key = `${item.normalizedName}-${item.apartment ?? ''}`;
        if (!unique.has(key)) unique.set(key, item);
      });
      setKnownPeople(Array.from(unique.values()));
    } catch (err) {
      console.error(err);
    } finally {
      setKnownPeopleLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAdminRequests();
  }, [loadAdminRequests]);

  const adminRequestCounts = useMemo(() => {
    const resolved = adminRequests.filter((item) => item.status === 'resolved').length;
    const active = adminRequests.length - resolved;
    return { active, resolved, all: adminRequests.length };
  }, [adminRequests]);

  const adminRequestTabs: Array<{ key: typeof adminRequestFilter; label: string; count: number }> = [
    { key: 'active', label: 'Активные', count: adminRequestCounts.active },
    { key: 'resolved', label: 'Решенные', count: adminRequestCounts.resolved },
    { key: 'all', label: 'Все', count: adminRequestCounts.all },
  ];

  const adminFilteredRequests = useMemo(() => {
    const list = [...adminRequests].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    const query = adminRequestSearch.trim().toLowerCase();
    return list.filter((item) => {
      const matchesFilter =
        adminRequestFilter === 'all'
          ? true
          : adminRequestFilter === 'resolved'
          ? item.status === 'resolved'
          : item.status !== 'resolved';
      const matchesQuery = !query
        ? true
        : `${item.title} ${item.description} ${item.category} ${item.fullName ?? ''}`.toLowerCase().includes(query);
      return matchesFilter && matchesQuery;
    });
  }, [adminRequests, adminRequestFilter, adminRequestSearch]);

  const renderRequestStatusPill = (status: RequestStatus) => {
    const meta = requestStatusMeta[status];
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full ${meta.bg} ${meta.color}`}>
        <span className="material-symbols-outlined text-base leading-none">{meta.icon}</span>
        {meta.label}
      </span>
    );
  };

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
      window.requestAnimationFrame(() => {
        target.classList.add('soft-tab--pressed');
        window.setTimeout(() => target.classList.remove('soft-tab--pressed'), 420);
      });
    },
    [],
  );

  const updateAdminRequestStatus = async (id: string, status: RequestStatus) => {
    setRequestActionError(null);
    setRequestMutations((prev) => ({ ...prev, [id]: true }));
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/requests/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error(`API responded with ${response.status}`);
      const payload = await response.json();
      const updated = mapApiAdminRequest(payload.request ?? payload);
      upsertAdminRequest(updated);
    } catch (err) {
      console.error(err);
      setRequestActionError('Не удалось обновить заявку');
    } finally {
      setRequestMutations((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  };

  const handleAdminReopen = async (item: AdminRequest) => {
    const comment = (adminReopenDrafts[item.id] ?? '').trim();
    if (!comment) return;
    setRequestActionError(null);
    setRequestMutations((prev) => ({ ...prev, [item.id]: true }));
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/requests/${item.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: comment, kind: 'reopen' }),
      });
      if (!response.ok) throw new Error(`API responded with ${response.status}`);
      const payload = await response.json();
      const updated = mapApiAdminRequest(payload.request ?? payload);
      upsertAdminRequest(updated);
      setAdminReopenDrafts((prev) => ({ ...prev, [item.id]: '' }));
    } catch (err) {
      console.error(err);
      setRequestActionError('Не удалось вернуть заявку в работу');
    } finally {
      setRequestMutations((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
    }
  };

  const handleAdminAddComment = async (item: AdminRequest) => {
    const comment = (adminCommentDrafts[item.id] ?? '').trim();
    if (!comment) return;
    setRequestActionError(null);
    setRequestMutations((prev) => ({ ...prev, [item.id]: true }));
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/requests/${item.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: comment, kind: 'note' }),
      });
      if (!response.ok) throw new Error(`API responded with ${response.status}`);
      const payload = await response.json();
      const updated = mapApiAdminRequest(payload.request ?? payload);
      upsertAdminRequest(updated);
      setAdminCommentDrafts((prev) => ({ ...prev, [item.id]: '' }));
    } catch (err) {
      console.error(err);
      setRequestActionError('Не удалось добавить комментарий');
    } finally {
      setRequestMutations((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
    }
  };

  useEffect(() => {
    const loadNews = async () => {
      setNewsLoading(true);
      setNewsError(null);
      try {
        const endpoints = ['/api/news', '/news'];
        let payload: any | null = null;
        let lastError: unknown = null;

        for (const path of endpoints) {
          try {
            const response = await apiFetch(`${API_BASE_URL}${path}`);
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

        const news = Array.isArray(payload.news) ? payload.news : [];
        const countFromPayload = extractNewsCount(payload);
        setNewsItems(news.map(mapApiNews));
        if (countFromPayload !== null) {
          setNewsTotalCount(countFromPayload);
        } else {
          setNewsTotalCount((prev) => (prev > news.length ? prev : news.length));
        }
        await loadNewsCount(news.length);
      } catch (err) {
        console.error(err);
        setNewsError('Не удалось загрузить новости');
      } finally {
        setNewsLoading(false);
      }
    };
    loadNews();
  }, [loadNewsCount]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const pendingIds = Object.keys(pendingDebtUpdates.current);
      if (pendingIds.length === 0) return;
      pendingIds.forEach((id) => {
        const amount = pendingDebtUpdates.current[id];
        const body = new Blob([JSON.stringify({ debt: amount })], { type: 'application/json' });
        navigator.sendBeacon(`${API_BASE_URL}/api/debtors/${id}`, body);
      });
      delete event.returnValue;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    const state = location.state as AdminNavigationState | null;
    if (!state) return;

    if (state.targetTab) {
      setTab(normalizeAdminTab(state.targetTab), { replace: true });
    }

    if (state.editNewsId) {
      setTab('news', { replace: true });
      setPendingNewsEditId(state.editNewsId);
      setNewsReturnState({
        highlightNewsId: state.editNewsId,
        restoreFilter: state.restoreFilter,
        restorePage: state.restorePage,
        returnHash: state.returnHash,
      });
      if (state.newsPrefill) {
        setPrefillNewsItem(state.newsPrefill);
      }
    }

    navigate(
      { pathname: location.pathname, search: location.search, hash: location.hash },
      { replace: true }
    );
  }, [location.hash, location.pathname, location.search, location.state, navigate, setTab]);

  useEffect(() => {
    if (!pendingNewsEditId) return;
    if (activeTab !== 'news') {
      setTab('news', { replace: true });
      return;
    }
    const existing = newsItems.find((item) => item.id === pendingNewsEditId);
    const fallback = prefillNewsItem && prefillNewsItem.id === pendingNewsEditId ? prefillNewsItem : null;
    const candidate = existing || fallback;
    if (!candidate) return;
    handleNewsEdit(candidate, { preserveReturnState: Boolean(newsReturnState) });
    scrollToNewsSection();
    setPendingNewsEditId(null);
    setPrefillNewsItem(null);
  }, [activeTab, newsItems, newsReturnState, pendingNewsEditId, prefillNewsItem, setTab]);

  useEffect(() => {
    const totalPages = Math.ceil(newsItems.length / ADMIN_NEWS_PAGE_SIZE);
    setNewsPage((prev) => {
      if (totalPages === 0) return 0;
      return Math.min(prev, totalPages - 1);
    });
  }, [newsItems.length]);

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
            const response = await apiFetch(`${API_BASE_URL}${path}`);
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

  useEffect(() => {
    const loadContributions = async () => {
      setContributionLoading(true);
      setContributionError(null);
      try {
        const response = await apiFetch(`${API_BASE_URL}/api/contributions`);
        if (!response.ok) {
          throw new Error(`API responded with ${response.status}`);
        }
        const payload = await response.json();
        const list = Array.isArray(payload.contributions) ? payload.contributions : Array.isArray(payload) ? payload : [];
        setContributions(list.map(mapApiContribution));
        if (payload.summary) {
          setContributionSummary(normalizeContributionSummaryData(payload.summary));
        } else {
          await loadContributionSummary();
        }
      } catch (err) {
        console.error(err);
        setContributionError('Не удалось загрузить взносы');
      } finally {
        setContributionLoading(false);
      }
    };
    loadContributions();
  }, []);

  useEffect(() => {
    const loadDebtors = async () => {
      setDebtorsLoading(true);
      setDebtorError(null);
      try {
        const response = await apiFetch(`${API_BASE_URL}/api/debtors`);
        if (!response.ok) {
          throw new Error(`API responded with ${response.status}`);
        }
        const payload = await response.json();
        const list = Array.isArray(payload.debtors) ? payload.debtors : Array.isArray(payload) ? payload : [];
        setDebtors(list.map(mapApiDebtor));
        setDebtorDebtInputs({});
      } catch (err) {
        console.error(err);
        setDebtorError('Не удалось загрузить должников');
      } finally {
        setDebtorsLoading(false);
      }
    };
    loadDebtors();
  }, []);

  useEffect(() => {
    loadMeters();
  }, [loadMeters]);

  useEffect(() => {
    loadAccountUsers();
    loadAccountLinks();
    loadKnownPeople();
  }, [loadAccountUsers, loadAccountLinks, loadKnownPeople]);

  useEffect(() => {
    if (suppressSuggestions) {
      setContributionSuggestions([]);
      setParsingInput(false);
      setSuppressSuggestions(false);
      return;
    }

    const lockedInput = lastSelectedInputRef.current?.trim();
    if (lockedInput && contributionForm.personInput.trim() === lockedInput) {
      setContributionSuggestions([]);
      setParsingInput(false);
      return;
    }

    if (!contributionForm.personInput.trim()) {
      setContributionSuggestions([]);
      setSelectedContribution(null);
      return;
    }

    setParsingInput(true);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await apiFetch(`${API_BASE_URL}/api/contributions/parse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: contributionForm.personInput }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Parse failed');
        const payload = await response.json();
        const suggestions: ContributionSuggestion[] = Array.isArray(payload.suggestions) ? payload.suggestions : [];
        setContributionSuggestions(suggestions);
        if (suggestions.length > 0) {
          setSelectedContribution((prev) => {
            if (prev && suggestions.find((s) => s.normalizedName === prev.normalizedName && s.apartment === prev.apartment)) {
              return prev;
            }
            return suggestions[0];
          });
        } else if (payload.resolved) {
          setSelectedContribution(payload.resolved);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setParsingInput(false);
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
      setParsingInput(false);
    };
  }, [contributionForm.personInput, suppressSuggestions]);

  const isNewContribution = useMemo(() => {
    const hasInput = contributionForm.personInput.trim().length > 0;
    if (selectedContribution?.source === 'ввод') return true;
    if (!selectedContribution && contributionSuggestions.length === 0 && hasInput) return true;
    return false;
  }, [contributionForm.personInput, contributionSuggestions.length, selectedContribution]);

  useEffect(() => {
    if (!isNewContribution) {
      setNewContributionDetails({ house: '', apartment: '' });
    }
  }, [isNewContribution]);

  useEffect(() => {
    if (activeTab !== 'overview') return;
    const el = cashflowChartRef.current;
    if (!el) return;

    const updateSize = () => {
      const width = Math.max(Math.round(el.clientWidth), 0);
      const height = Math.max(Math.round(el.clientHeight), 0);
      setCashflowChartSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeTab]);

  const newsTagOptions = useMemo(() => {
    const unique = new Set<string>();
    baseNewsTags.forEach((tag) => unique.add(tag));
    newsItems.forEach((item) => {
      if (item.tag && item.tag.trim()) unique.add(item.tag.trim());
    });
    if (newsForm.tag.trim()) unique.add(newsForm.tag.trim());
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [newsItems, newsForm.tag]);

  const categoryOptions = useMemo(() => {
    const set = new Map<string, string>(); // canonical -> display
    documents.forEach((doc) => {
      const norm = normalizeCategoryDisplay(doc.category);
      set.set(canonicalCategory(norm), norm);
    });
    set.set(canonicalCategory(docCategory), normalizeCategoryDisplay(docCategory));
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [documents, docCategory]);

  const filteredKnownPeople = useMemo(() => {
    const query = linkPersonQuery.trim().toLowerCase();
    if (!query) return knownPeople.slice(0, 8);
    return knownPeople
      .filter((person) => {
        const name = (person.displayName || '').toLowerCase();
        const apt = (person.apartment || '').toLowerCase();
        return name.includes(query) || (apt && query && apt.includes(query));
      })
      .slice(0, 8);
  }, [knownPeople, linkPersonQuery]);

  const adminNewsPageCount = Math.ceil(newsItems.length / ADMIN_NEWS_PAGE_SIZE);
  const adminNewsPageItems = useMemo(() => {
    const start = newsPage * ADMIN_NEWS_PAGE_SIZE;
    return newsItems.slice(start, start + ADMIN_NEWS_PAGE_SIZE);
  }, [newsItems, newsPage]);
  const hasAdminPagination = adminNewsPageCount > 1;
  const canAdminPrev = newsPage > 0;
  const canAdminNext = newsPage + 1 < adminNewsPageCount;
  const adminPageLabel = adminNewsPageCount > 0 ? `${newsPage + 1}/${adminNewsPageCount}` : '—';

  const summary = useMemo(() => {
    const totalDebt = debtors.reduce((sum, r) => sum + Math.max(r.debt, 0), 0);
    const indebtedCount = debtors.filter((r) => r.debt > 0).length;
    const paidShare = debtors.length === 0
      ? 100
      : Math.round(((debtors.length - indebtedCount) / debtors.length) * 100);
    const contributionTotal = contributionSummary.totalAmount > 0
      ? contributionSummary.totalAmount
      : contributions.reduce((sum, item) => sum + Math.max(item.amount, 0), 0);
    const contributionCount = contributionSummary.contributionCount || contributions.length;
    const peopleCount = contributionSummary.peopleCount || new Set(contributions.map((c) => c.normalizedName)).size;
    return {
      totalDebt,
      indebtedCount,
      paidShare,
      newsCount: newsTotalCount || newsItems.length,
      docCount: documents.length,
      contributionTotal,
      contributionCount,
      peopleCount,
    };
  }, [debtors, newsItems, newsTotalCount, documents, contributions, contributionSummary]);

  const chartData = useMemo(() => {
    const totalDebt = debtors.reduce((sum, r) => sum + Math.max(r.debt, 0), 0);
    const normalizeMonthKey = (m: string) => normalizeMonthLabel(m);

    const collectMap = (rows: { month: string; collected: number }[]) => {
      const map = new Map<string, number>();
      rows.forEach((row) => {
        const key = normalizeMonthKey(row.month);
        const value = Number.isFinite(row.collected) ? row.collected : 0;
        map.set(key, (map.get(key) || 0) + value);
      });
      return map;
    };

    const summaryRows = contributionSummary.byMonth.map((row) => ({
      month: normalizeMonthKey(row.month),
      collected: row.collected,
    }));
    const baseRows = baseCashflow.map((row) => ({
      month: normalizeMonthKey(row.month),
      collected: row.collected,
    }));

    const hasSummary = contributionSummary.byMonth.length > 0;
    const currentMonthLabel = monthOrder[new Date().getMonth()] ?? '';
    const sourceRows = hasSummary ? summaryRows : baseRows;
    const sourceMap = collectMap(sourceRows);
    const windowMonths = buildRecentMonthsWindow(sourceRows.map((row) => row.month), 12);

    return windowMonths.map((month) => {
      const collected = sourceMap.get(month) ?? 0;
      return {
        month,
        collected,
        debt: month === currentMonthLabel ? totalDebt : null,
      };
    });
  }, [contributionSummary.byMonth, debtors]);

  const hasCashflowSpace = cashflowChartSize.width > 0 && cashflowChartSize.height > 0;

  const getHouseById = (id: string) => houses.find((h) => h.id === id || h.label === id);
  const formatHouseLabel = (housesList: string[]) => {
    if (!housesList || housesList.length === 0) return '';
    const first = housesList[0];
    const house = getHouseById(first);
    if (house) {
      const parts = house.label.split('корпус');
      if (parts.length > 1) return `корпус${parts[1]}`.trim();
      return house.label;
    }
    return first;
  };

  const resolvePhoneForUser = (username: string) => {
    if (!username) return '';
    const match = accountLinks.find((link) => link.username === username && link.phone);
    return match?.phone || '';
  };

  const phoneResetOptions = accountUsers.filter((user) => user.role === 'user');

  const flushDebtUpdate = useCallback(
    async (id: string) => {
      const amount = pendingDebtUpdates.current[id];
      if (amount === undefined) return;
      delete pendingDebtUpdates.current[id];
      try {
        await apiFetch(`${API_BASE_URL}/api/debtors/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ debt: amount }),
        });
      } catch (err) {
        console.error(err);
        setDebtorError('Не удалось обновить долг');
      }
    },
    []
  );

  const handleDebtChange = (id: string, rawAmount: string) => {
    setDebtorDebtInputs((prev) => ({ ...prev, [id]: rawAmount }));

    if (!rawAmount.trim()) return;

    const parsedAmount = parseMoneyInput(rawAmount);
    if (Number.isNaN(parsedAmount)) return;

    const normalizedAmount = Math.max(0, parsedAmount);

    setDebtors((prev) =>
      prev.map((r) => (r.id === id ? { ...r, debt: normalizedAmount } : r))
    );
    setDebtorDebtInputs((prev) => ({ ...prev, [id]: String(normalizedAmount) }));

    pendingDebtUpdates.current[id] = normalizedAmount;
    if (debtUpdateTimers.current[id]) {
      window.clearTimeout(debtUpdateTimers.current[id]);
    }
    debtUpdateTimers.current[id] = window.setTimeout(() => {
      delete debtUpdateTimers.current[id];
      flushDebtUpdate(id);
    }, 650);
  };

  const handleDebtorRemove = async (id: string) => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/debtors/${id}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 204) throw new Error('Failed to delete debtor');
      setDebtors((prev) => prev.filter((r) => r.id !== id));
      setDebtorDebtInputs((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      console.error(err);
      setDebtorError('Не удалось удалить должника');
    }
  };

  const handleDebtorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtorForm.name.trim() && debtorForm.unit.trim().length === 0 && debtorForm.houseId.trim().length === 0) {
      setDebtorError('Укажите хотя бы дом или квартиру');
      return;
    }
    setDebtorError(null);
    setDebtorSaving(true);

    const debtValue = parseMoneyInput(debtorForm.debt);
    const normalizedDebt = Number.isNaN(debtValue) ? 0 : Math.max(0, debtValue);
    const house = getHouseById(debtorForm.houseId);
    const payload = {
      input: `${debtorForm.unit} ${debtorForm.name}`.trim(),
      displayName: debtorForm.name.trim(),
      apartment: debtorForm.unit.trim(),
      houses: house ? [house.label] : debtorForm.houseId ? [debtorForm.houseId] : [],
      phone: debtorForm.phone.trim(),
      debt: normalizedDebt,
      note: debtorForm.note.trim(),
    };

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/debtors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }
      const payloadJson = await response.json();
      const mapped = mapApiDebtor(payloadJson);
      setDebtors((prev) => {
        const existingIndex = prev.findIndex((d) => d.id === mapped.id);
        if (existingIndex !== -1) {
          const next = [...prev];
          next[existingIndex] = mapped;
          // Remove any accidental duplicates of the same id.
          return next.filter((debtor, idx) => next.findIndex((d) => d.id === debtor.id) === idx);
        }
        return [mapped, ...prev];
      });
      setDebtorForm({
        houseId: houses[0]?.id ?? 'main',
        name: '',
        unit: '',
        phone: '',
        debt: '',
        note: '',
      });
    } catch (err) {
      console.error(err);
      setDebtorError('Не удалось сохранить должника');
    } finally {
      setDebtorSaving(false);
    }
  };

  const handleLinkPersonSelect = (person: ContributionSuggestion) => {
    setLinkSelectedPerson(person);
    const formatted = formatSuggestionInput(person) || person.displayName || person.normalizedName || '';
    setLinkPersonQuery(formatted);
    setLinkSuggestionsOpen(false);
  };

  const handleResidentRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = registrationForm.fullName.trim();
    const phone = registrationForm.phone.trim();
    const apartment = registrationForm.apartment.trim();
    const houseMeta = houses.find((house) => house.id === registrationForm.houseId);
    const houseLabel = houseMeta?.label || registrationForm.houseId;

    if (!houseLabel.trim()) {
      setRegistrationError('Укажите дом');
      return;
    }
    if (!fullName && !phone) {
      setRegistrationError('Укажите телефон или ФИО');
      return;
    }

    setRegistrationError(null);
    setRegistrationResult(null);
    setRegistrationSaving(true);

    const payload: Record<string, string> = { house: houseLabel };
    if (fullName) payload.fullName = fullName;
    if (phone) payload.phone = phone;
    if (apartment) payload.apartment = apartment;

    try {
      const response = await apiFetch(`${API_BASE_URL}/auth/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      let responseJson: any = null;
      try {
        responseJson = await response.json();
      } catch {
        // ignore parsing errors below
      }
      if (!response.ok) {
        const message = responseJson?.message || responseJson?.error || 'Не удалось создать пользователя';
        throw new Error(String(message));
      }

      const username = responseJson?.user?.username || '';
      const password = responseJson?.password || '';
      if (!username || !password) {
        throw new Error('Сервер не вернул логин и пароль');
      }

      setRegistrationResult({
        username,
        password,
        displayName: responseJson?.displayName || '',
        house: responseJson?.house || houseLabel,
        apartment: responseJson?.apartment || apartment || '',
        phone: responseJson?.phone || phone || '',
        existing: Boolean(responseJson?.existing),
      });
      setRegistrationForm((prev) => ({ ...prev, fullName: '', phone: '', apartment: '' }));
      loadAccountUsers();
      loadAccountLinks();
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Не удалось создать пользователя';
      setRegistrationError(message);
    } finally {
      setRegistrationSaving(false);
    }
  };

  const handlePhoneReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = phoneResetForm.username.trim();
    const phone = phoneResetForm.phone.trim();
    if (!username) {
      setPhoneResetError('Выберите пользователя');
      return;
    }

    setPhoneResetError(null);
    setPhoneResetResult(null);
    setPhoneResetSaving(true);

    try {
      const response = await apiFetch(`${API_BASE_URL}/auth/users/${encodeURIComponent(username)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      let responseJson: any = null;
      try {
        responseJson = await response.json();
      } catch {
        // ignore parsing errors below
      }
      if (!response.ok) {
        const message = responseJson?.message || responseJson?.error || 'Не удалось обновить телефон';
        throw new Error(String(message));
      }

      setPhoneResetResult({
        username,
        phone: responseJson?.phone ?? phone,
        password: typeof responseJson?.password === 'string' ? responseJson.password : undefined,
        passwordReset: Boolean(responseJson?.passwordReset),
      });
      loadAccountLinks();
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Не удалось обновить телефон';
      setPhoneResetError(message);
    } finally {
      setPhoneResetSaving(false);
    }
  };

  const handleAccountLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedUser = linkSelectedUser.trim();
    const personName = (linkSelectedPerson?.displayName || linkPersonQuery).trim();
    const normalizedName = (linkSelectedPerson?.normalizedName || '').trim();
    if (!personName && !normalizedName) {
      setAccountLinkError('Выберите жильца из списка');
      return;
    }
    if (!selectedUser) {
      setAccountLinkError('Выберите аккаунт пользователя');
      return;
    }

    setAccountLinkError(null);
    setAccountLinkSaving(true);
    const payload: Record<string, unknown> = {
      username: selectedUser,
      displayName: personName || normalizedName,
    };
    if (normalizedName) payload.normalizedName = normalizedName;
    if (linkSelectedPerson?.apartment) payload.apartment = linkSelectedPerson.apartment;
    if (linkSelectedPerson?.houses?.length) payload.houses = linkSelectedPerson.houses;

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/accounts/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `API responded with ${response.status}`);
      }
      const saved = mapApiAccountLink(await response.json());
      setAccountLinks((prev) => {
        const existingIdx = prev.findIndex((l) => l.id === saved.id || l.normalizedName === saved.normalizedName);
        if (existingIdx !== -1) {
          const next = [...prev];
          next[existingIdx] = saved;
          return next;
        }
        return [saved, ...prev];
      });
      setLinkPersonQuery('');
      setLinkSelectedPerson(null);
    } catch (err) {
      console.error(err);
      setAccountLinkError('Не удалось сохранить связь аккаунта и жильца');
    } finally {
      setAccountLinkSaving(false);
    }
  };

  const handleAccountLinkRemove = async (id: string) => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/accounts/links/${id}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 204) throw new Error('Failed to delete link');
      setAccountLinks((prev) => prev.filter((link) => link.id !== id));
    } catch (err) {
      console.error(err);
      setAccountLinkError('Не удалось удалить связь аккаунта');
    }
  };

  const handleContributionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseMoneyInput(contributionForm.amount);
    const manualHouse = newContributionDetails.house.trim();
    const manualApartment = newContributionDetails.apartment.trim();
    const hasManualHouse = manualHouse.length > 0;
    const hasManualApartment = manualApartment.length > 0;
    const trimmedInput = contributionForm.personInput.trim();

    if ((!trimmedInput && !selectedContribution) || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setContributionError('Заполните ФИО и сумму');
      return;
    }

    setContributionError(null);
    setContributionLoading(true);

    const payload: Record<string, unknown> = {
      input: trimmedInput,
      month: contributionForm.month,
      amount: parsedAmount,
      note: contributionForm.note.trim(),
    };

    if (selectedContribution) {
      payload.displayName = selectedContribution.displayName;
      if (isNewContribution) {
        payload.forceNew = true;
        const housesFromSelection = Array.isArray(selectedContribution.houses) ? selectedContribution.houses.filter((h) => h && h.trim()) : [];
        const resolvedHouses = hasManualHouse ? [manualHouse] : housesFromSelection;
        const resolvedApartment = hasManualApartment ? manualApartment : (selectedContribution.apartment ?? '');
        if (resolvedHouses.length) payload.houses = resolvedHouses;
        if (resolvedApartment) payload.apartment = resolvedApartment;
      } else {
        if (selectedContribution.apartment) payload.apartment = selectedContribution.apartment;
        if (selectedContribution.houses?.length) payload.houses = selectedContribution.houses;
      }
    } else if (isNewContribution) {
      payload.displayName = trimmedInput;
      payload.forceNew = true;
      if (hasManualHouse) payload.houses = [manualHouse];
      if (hasManualApartment) payload.apartment = manualApartment;
    } else if (trimmedInput) {
      payload.displayName = trimmedInput;
    }

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`API responded with ${response.status}`);
      const saved = await response.json();
      const mapped = mapApiContribution(saved);
      setContributions((prev) => [mapped, ...prev]);
      await loadContributionSummary();
      setContributionForm((prev) => ({ ...prev, amount: '', personInput: '', note: '' }));
      setContributionSuggestions([]);
      setSelectedContribution(null);
      setNewContributionDetails({ house: '', apartment: '' });
      setSuppressSuggestions(true);
    } catch (err) {
      console.error(err);
      setContributionError('Не удалось добавить взнос');
    } finally {
      setContributionLoading(false);
    }
  };

  const handleContributionRemove = async (id: string) => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/contributions/${id}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 204) throw new Error('Failed to delete');
      setContributions((prev) => prev.filter((c) => c.id !== id));
      await loadContributionSummary();
    } catch (err) {
      console.error(err);
      setContributionError('Не удалось удалить взнос');
    }
  };

  const getNewsImage = (src?: string) => (src && src.trim() ? src.trim() : defaultNewsImage);

  const handleNewsImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const target = event.currentTarget;
    if (target.dataset.fallbackApplied === 'true') return;
    target.dataset.fallbackApplied = 'true';
    target.src = defaultNewsImage;
  };

  const getTagTone = (tag: string) => {
    const normalized = (tag || '').toLowerCase();
    if (normalized.includes('важ')) return 'bg-accent';
    if (normalized.includes('собы')) return 'bg-primary';
    if (normalized.includes('ремонт')) return 'bg-[rgba(47,58,42,0.9)]';
    return 'bg-[var(--color-ink-soft)]';
  };

  const scrollToNewsSection = () => {
    const target = newsFormRef.current || newsSectionRef.current;
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const clearNewsReturnState = () => {
    setNewsReturnState(null);
    setPendingNewsEditId(null);
    setPrefillNewsItem(null);
  };

  const resetNewsForm = () => {
    setNewsForm({ title: '', summary: '', tag: 'Важно', imageFile: null, imagePreview: '', imageCleared: false });
    setEditingNewsId(null);
    if (newsImageInputRef.current) {
      newsImageInputRef.current.value = '';
    }
  };

  const handleNewsReset = () => {
    resetNewsForm();
    clearNewsReturnState();
  };

  const handleNewsImageChange = (file: File | null) => {
    setNewsForm((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: file ? URL.createObjectURL(file) : '',
      imageCleared: false,
    }));
  };

  const clearNewsImage = () => {
    setNewsForm((prev) => ({
      ...prev,
      imageFile: null,
      imagePreview: '',
      imageCleared: true,
    }));
    if (newsImageInputRef.current) {
      newsImageInputRef.current.value = '';
    }
  };

  useEffect(() => {
    return () => {
      if (newsForm.imagePreview && newsForm.imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(newsForm.imagePreview);
      }
    };
  }, [newsForm.imagePreview]);

  const handleNewsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsForm.title.trim() || !newsForm.summary.trim()) return;

    setNewsSaving(true);
    setNewsError(null);

    const formData = new FormData();
    formData.append('title', newsForm.title.trim());
    formData.append('summary', newsForm.summary.trim());
    formData.append('tag', newsForm.tag.trim() || 'Без тега');
    if (newsForm.imageFile) {
      formData.append('image', newsForm.imageFile);
    }
    if (editingNewsId && newsForm.imageCleared && !newsForm.imageFile) {
      formData.append('removeImage', 'true');
    }

    const isEdit = Boolean(editingNewsId);
    const endpoint = `${API_BASE_URL}/api/news${isEdit ? `/${editingNewsId}` : ''}`;
    // Use POST for both create and update to keep backend multipart parsing happy.
    const method: 'POST' = 'POST';

    try {
      const response = await apiFetch(endpoint, { method, body: formData });
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }
      const payload = await response.json();
      const mapped = mapApiNews(payload);
      const savedId = editingNewsId ?? mapped.id;
      const returnState = newsReturnState;
      setNewsItems((prev) =>
        editingNewsId ? prev.map((n) => (n.id === editingNewsId ? mapped : n)) : [mapped, ...prev]
      );
      const fallbackCount = editingNewsId ? newsTotalCount || newsItems.length : (newsTotalCount || newsItems.length) + 1;
      await loadNewsCount(fallbackCount);
      resetNewsForm();
      if (editingNewsId && returnState) {
        const hash = returnState.returnHash ? `#${returnState.returnHash}` : '';
        clearNewsReturnState();
        navigate(
          { pathname: '/news', hash },
          {
            state: {
              highlightNewsId: savedId,
              restoreFilter: returnState.restoreFilter,
              restorePage: returnState.restorePage,
            },
          }
        );
        return;
      }
      clearNewsReturnState();
    } catch (err) {
      console.error(err);
      setNewsError('Не удалось сохранить новость');
    } finally {
      setNewsSaving(false);
    }
  };

  const handleNewsEdit = (item: NewsItem, options?: { preserveReturnState?: boolean }) => {
    if (!options?.preserveReturnState) {
      clearNewsReturnState();
    }
    setEditingNewsId(item.id);
    setNewsForm({
      title: item.title ?? '',
      summary: item.summary ?? '',
      tag: item.tag ?? 'Важно',
      imageFile: null,
      imagePreview: item.image && item.image !== defaultNewsImage ? item.image : item.imageUrl || '',
      imageCleared: false,
    });
    if (newsImageInputRef.current) {
      newsImageInputRef.current.value = '';
    }
    requestAnimationFrame(scrollToNewsSection);
  };

  const handleNewsRemove = async (id: string) => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/news/${id}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 204) throw new Error('Failed to delete');
      setNewsItems((prev) => prev.filter((n) => n.id !== id));
      const fallbackCount = Math.max((newsTotalCount || newsItems.length) - 1, 0);
      await loadNewsCount(fallbackCount);
      if (editingNewsId === id) {
        handleNewsReset();
      }
    } catch (err) {
      console.error(err);
      setNewsError('Не удалось удалить новость');
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
      const response = await apiFetch(`${API_BASE_URL}/api/documents`, {
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
      const response = await apiFetch(`${API_BASE_URL}/api/documents/${id}/hide`, { method: 'POST' });
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
            Управляйте новостями, задолженностями и документами.
          </p>
        </div>
        <div className="hidden md:flex flex-wrap gap-2 md:justify-end md:ml-auto">
          <span className="px-3 py-2 rounded-lg bg-white border border-[color:var(--color-info-border)] text-sm text-[var(--color-ink-soft)] flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">verified</span>
            Данные синхронизированы
          </span>
          <span className="px-3 py-2 rounded-lg bg-primary text-primary-contrast text-sm flex items-center gap-2 shadow-sm">
            <span className="material-symbols-outlined text-white">admin_panel_settings</span>
            Режим администратора
          </span>
        </div>
      </header>

      <div className="flex gap-2 pb-2 overflow-x-auto hide-scrollbar pr-1">
        {ADMIN_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onMouseDown={triggerTabFeedback}
            onTouchStart={triggerTabFeedback}
            onClick={() => setTab(tab.id)}
            className={`soft-tab flex items-center justify-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap flex-none min-w-[120px] sm:min-w-[140px] ${
              activeTab === tab.id
                ? 'soft-tab--active bg-primary text-primary-contrast shadow-sm'
                : 'bg-white border border-[color:var(--color-info-border)] text-[var(--color-ink-soft)] hover:bg-[var(--color-info-surface)] hover:text-[var(--color-ink)]'
            }`}
          >
            <span className="material-symbols-outlined text-base soft-tab__icon">{tab.icon}</span>
            <span className="soft-tab__label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div key={activeTab} className="admin-tab-panel space-y-6">
      {activeTab === 'overview' && (
        <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
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
            <p className="text-sm text-[var(--color-ink-soft)]">Новости в ленте</p>
            <span className="material-symbols-outlined text-primary">campaign</span>
          </div>
          <h3 className="text-2xl font-bold text-[var(--color-ink)] mt-2">{summary.newsCount}</h3>
          <p className="text-xs text-[var(--color-ink-soft)] mt-1">Количество новостей</p>
        </div>

        <div className="bg-[var(--color-info-surface)] p-4 rounded-xl border border-[color:var(--color-info-border)] shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--color-ink-soft)]">Документы в архиве</p>
            <span className="material-symbols-outlined text-primary">folder_open</span>
          </div>
          <h3 className="text-2xl font-bold text-[var(--color-ink)] mt-2">{summary.docCount}</h3>
          <p className="text-xs text-[var(--color-ink-soft)] mt-1">Количество документов</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--color-ink)]">Динамика сборов</h3>
          </div>
          <div ref={cashflowChartRef} className="h-64 min-h-[200px]">
            {hasCashflowSpace ? (
              <AreaChart width={cashflowChartSize.width} height={cashflowChartSize.height} data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(175,194,215,0.45)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#3b4a3b', fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'rgba(175, 194, 215, 0.18)' }} content={renderCashflowTooltip} />
                <Area type="monotone" dataKey="collected" stroke="var(--color-forest)" fill="rgba(47,58,42,0.18)" strokeWidth={2.2} name="Собрано" />
                <Scatter dataKey="debt" name="Долг" data={chartData} fill="var(--color-brick)" stroke="var(--color-brick)" />
              </AreaChart>
            ) : (
              <div className="h-full grid place-items-center text-sm text-[var(--color-ink-soft)]">
                График готовится...
              </div>
            )}
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
              <span className="font-semibold text-[var(--color-ink)]">
                {newsTotalCount || newsItems.length} новости
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-ink-soft)]">Учтено взносов</span>
              <span className="font-semibold text-[var(--color-ink)]">
                {summary.contributionTotal > 0 ? formatCurrency(summary.contributionTotal) : 'Пока нет'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-ink-soft)]">Всего платежей</span>
              <span className="font-semibold text-[var(--color-ink)]">
                {(summary.contributionCount || contributions.length) || '—'}
              </span>
            </div>
            {/* <div className="flex items-center justify-between">
              <span className="text-[var(--color-ink-soft)]">Плательщиков</span>
              <span className="font-semibold text-[var(--color-ink)]">
                {summary.peopleCount || new Set(contributions.map((c) => c.normalizedName)).size}
              </span>
            </div> */}
          </div>
        </div>
      </div>

      </>
      )}

      {activeTab === 'accounts' && (
      <div className="space-y-6">
        <div className="bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-[var(--color-ink)]">Регистрация жильца</h3>
              <p className="text-sm text-[var(--color-ink-soft)]">
                Укажите дом и телефон или ФИО — выдадим логин и пароль.
              </p>
            </div>
            <span className="hidden md:inline-flex text-xs text-[var(--color-ink-soft)] px-3 py-1 rounded-full bg-white border border-[color:var(--color-info-border)]">
              Новый доступ
            </span>
          </div>

          {registrationError && (
            <div className="mb-3 text-sm text-accent bg-accent/10 border border-accent/30 rounded-lg px-3 py-2">
              {registrationError}
            </div>
          )}

          {registrationResult && (
            <div className="mb-4 rounded-lg border border-[color:var(--color-info-border)] bg-white px-3 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-2 py-1 rounded-md bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]">
                  Логин: <span className="font-mono font-semibold">{registrationResult.username}</span>
                </span>
                <span className="px-2 py-1 rounded-md bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]">
                  Пароль: <span className="font-mono font-semibold">{registrationResult.password}</span>
                </span>
                {registrationResult.existing && (
                  <span className="px-2 py-1 rounded-md bg-white border border-[color:var(--color-info-border)] text-[var(--color-ink-soft)]">
                    Пароль обновлен
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--color-ink-soft)]">
                {registrationResult.displayName && (
                  <span className="px-2 py-0.5 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]">
                    {registrationResult.displayName}
                  </span>
                )}
                {registrationResult.house && (
                  <span className="px-2 py-0.5 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]">
                    Дом: {registrationResult.house}
                  </span>
                )}
                {registrationResult.apartment && (
                  <span className="px-2 py-0.5 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]">
                    Кв. {registrationResult.apartment}
                  </span>
                )}
                {registrationResult.phone && (
                  <span className="px-2 py-0.5 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]">
                    {registrationResult.phone}
                  </span>
                )}
              </div>
            </div>
          )}

          <form
            onSubmit={handleResidentRegistration}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1.4fr,1fr,1fr,1fr,auto] gap-3 items-end"
          >
            <div className="space-y-2 min-w-0">
              <label className="text-sm text-[var(--color-ink-soft)]">Дом</label>
              <select
                value={registrationForm.houseId}
                onChange={(e) => setRegistrationForm((prev) => ({ ...prev, houseId: e.target.value }))}
                className="w-full h-11 border border-[color:var(--color-info-border)] rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
              >
                {houses.map((house) => (
                  <option key={house.id} value={house.id}>
                    {house.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 min-w-0">
              <label className="text-sm text-[var(--color-ink-soft)]">Телефон</label>
              <input
                type="text"
                value={registrationForm.phone}
                onChange={(e) => setRegistrationForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full h-11 border border-[color:var(--color-info-border)] rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
                placeholder="+7 ..."
              />
            </div>
            <div className="space-y-2 min-w-0">
              <label className="text-sm text-[var(--color-ink-soft)]">ФИО</label>
              <input
                type="text"
                value={registrationForm.fullName}
                onChange={(e) => setRegistrationForm((prev) => ({ ...prev, fullName: e.target.value }))}
                className="w-full h-11 border border-[color:var(--color-info-border)] rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
                placeholder="Иванов Иван Иванович"
              />
            </div>
            <div className="space-y-2 min-w-0">
              <label className="text-sm text-[var(--color-ink-soft)]">Квартира</label>
              <input
                type="text"
                value={registrationForm.apartment}
                onChange={(e) => setRegistrationForm((prev) => ({ ...prev, apartment: e.target.value }))}
                className="w-full h-11 border border-[color:var(--color-info-border)] rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
                placeholder="Опционально"
              />
            </div>
            <div className="flex items-end justify-start xl:justify-end">
              <button
                type="submit"
                disabled={registrationSaving}
                className="w-full xl:w-auto px-5 h-11 rounded-lg text-sm font-semibold bg-primary text-primary-contrast hover:bg-accent transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-base">person_add</span>
                {registrationSaving ? 'Создаем...' : 'Выдать логин'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-[var(--color-ink)]">Смена телефона и сброс пароля</h3>
              <p className="text-sm text-[var(--color-ink-soft)]">
                Обновите телефон жильца — при изменении пароль будет сброшен.
              </p>
            </div>
          </div>

          {phoneResetError && (
            <div className="mb-3 text-sm text-accent bg-accent/10 border border-accent/30 rounded-lg px-3 py-2">
              {phoneResetError}
            </div>
          )}

          {phoneResetResult && (
            <div className="mb-4 rounded-lg border border-[color:var(--color-info-border)] bg-white px-3 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-2 py-1 rounded-md bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]">
                  Логин: <span className="font-mono font-semibold">{phoneResetResult.username}</span>
                </span>
                <span className="px-2 py-1 rounded-md bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]">
                  Телефон: <span className="font-mono font-semibold">{phoneResetResult.phone || '—'}</span>
                </span>
                {phoneResetResult.passwordReset ? (
                  <span className="px-2 py-1 rounded-md bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]">
                    Пароль: <span className="font-mono font-semibold">{phoneResetResult.password ?? '—'}</span>
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-md bg-white border border-[color:var(--color-info-border)] text-[var(--color-ink-soft)]">
                    Пароль без изменений
                  </span>
                )}
              </div>
            </div>
          )}

          <form
            onSubmit={handlePhoneReset}
            className="grid grid-cols-1 md:grid-cols-[1.2fr,1fr,auto] gap-3 items-end"
          >
            <div className="space-y-2 min-w-0">
              <label className="text-sm text-[var(--color-ink-soft)]">Пользователь</label>
              <select
                value={phoneResetForm.username}
                onChange={(e) => {
                  const username = e.target.value;
                  setPhoneResetForm({ username, phone: resolvePhoneForUser(username) });
                }}
                className="w-full h-11 border border-[color:var(--color-info-border)] rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
              >
                {phoneResetOptions.length === 0 && <option value="">Нет пользователей</option>}
                {phoneResetOptions.map((user) => (
                  <option key={user.username} value={user.username}>
                    {user.username}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 min-w-0">
              <label className="text-sm text-[var(--color-ink-soft)]">Телефон</label>
              <input
                type="text"
                value={phoneResetForm.phone}
                onChange={(e) => setPhoneResetForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full h-11 border border-[color:var(--color-info-border)] rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
                placeholder="+7 ..."
              />
            </div>
            <div className="flex items-end justify-start md:justify-end">
              <button
                type="submit"
                disabled={phoneResetSaving || phoneResetOptions.length === 0}
                className="w-full md:w-auto px-5 h-11 rounded-lg text-sm font-semibold bg-primary text-primary-contrast hover:bg-accent transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                {phoneResetSaving ? 'Обновляем...' : 'Обновить телефон'}
              </button>
            </div>
          </form>
          <p className="text-xs text-[var(--color-ink-soft)] mt-2">
            Оставьте поле пустым, чтобы удалить телефон и выдать новый пароль.
          </p>
        </div>

        <div className="bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm p-6 backdrop-blur-sm relative overflow-visible z-40">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-[var(--color-ink)]">Привязка жильцов к аккаунтам</h3>
            <p className="text-sm text-[var(--color-ink-soft)]">Выберите жильца из истории и закрепите за учетной записью портала.</p>
          </div>
          <span className="hidden md:inline-flex text-xs text-[var(--color-ink-soft)] px-3 py-1 rounded-full bg-white border border-[color:var(--color-info-border)]">
            {accountLinks.length} связей
          </span>
        </div>

        {accountLinkError && (
          <div className="mb-3 text-sm text-accent bg-accent/10 border border-accent/30 rounded-lg px-3 py-2">
            {accountLinkError}
          </div>
        )}

        <form
          onSubmit={handleAccountLinkSubmit}
          className="grid grid-cols-1 lg:grid-cols-[2fr,1fr,auto] gap-3 items-start lg:items-end"
        >
          <div className="space-y-2 min-w-0">
            <label className="text-sm text-[var(--color-ink-soft)]">Жилец (поиск по истории взносов/долгов)</label>
            <div className="relative z-40">
              <input
                type="text"
                value={linkPersonQuery}
                onFocus={() => setLinkSuggestionsOpen(true)}
                onBlur={() => setTimeout(() => setLinkSuggestionsOpen(false), 120)}
                onChange={(e) => {
                  setLinkPersonQuery(e.target.value);
                  setLinkSelectedPerson(null);
                  setLinkSuggestionsOpen(true);
                }}
                className="w-full h-11 border border-[color:var(--color-info-border)] rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
                placeholder={knownPeopleLoading ? 'Загрузка списка...' : 'Например, Ковалёва или Кв. 14'}
              />
              {linkSuggestionsOpen && filteredKnownPeople.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-[color:var(--color-info-border)] rounded-lg shadow-lg max-h-64 overflow-y-auto divide-y divide-[color:var(--color-info-border)]">
                  {filteredKnownPeople.slice(0, 5).map((person) => (
                    <button
                      key={`${person.normalizedName}-${person.apartment ?? 'na'}`}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleLinkPersonSelect(person)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-info-surface)]"
                    >
                      <div className="font-medium text-[var(--color-ink)]">{person.displayName || 'Без имени'}</div>
                      <div className="flex flex-wrap gap-2 text-[11px] text-[var(--color-ink-soft)] mt-1">
                        <span className="px-2 py-0.5 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]">
                          {person.apartment ? `Кв. ${person.apartment}` : 'Без квартиры'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]">
                          {person.houses?.length ? `Дом: ${person.houses.join(', ')}` : 'Дом не указан'}
                        </span>
                        {person.source && (
                          <span className="px-2 py-0.5 rounded-full bg-white border border-[color:var(--color-info-border)]">
                            {person.source}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {linkSelectedPerson && (
                <div className="mt-2 px-1 py-2 rounded-lg flex flex-wrap items-center gap-2 text-xs text-[var(--color-ink-soft)] lg:absolute lg:left-0 lg:right-0 lg:top-full lg:mt-1 lg:px-1 lg:py-2">
                  <span className="px-2 py-0.5 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] text-[var(--color-ink)]">
                    {linkSelectedPerson.displayName || 'Без имени'}
                  </span>
                  {linkSelectedPerson.apartment && (
                    <span className="px-2 py-0.5 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]">
                      Кв. {linkSelectedPerson.apartment}
                    </span>
                  )}
                  {linkSelectedPerson.houses?.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]">
                      Дом: {linkSelectedPerson.houses.join(', ')}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2 min-w-0">
            <label className="text-sm text-[var(--color-ink-soft)]">Аккаунт</label>
            <select
              value={linkSelectedUser}
              onChange={(e) => setLinkSelectedUser(e.target.value)}
              className="w-full h-11 border border-[color:var(--color-info-border)] rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
            >
              {accountUsers.length === 0 && <option value="">Нет пользователей</option>}
              {accountUsers.map((user) => (
                <option key={user.username} value={user.username}>
                  {user.username} {user.role === 'admin' ? '(Администратор)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end justify-start lg:justify-end">
            <button
              type="submit"
              disabled={accountLinkSaving || accountUsers.length === 0}
              className="w-full lg:w-auto px-5 h-11 rounded-lg text-sm font-semibold bg-primary text-primary-contrast hover:bg-accent transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-base">link</span>
              {accountLinkSaving ? 'Сохраняем...' : 'Привязать аккаунт'}
            </button>
          </div>
        </form>

        <div className="mt-6 divide-y divide-[color:var(--color-info-border)]">
          {accountLinksLoading && (
            <div className="text-sm text-[var(--color-ink-soft)] bg-white border border-[color:var(--color-info-border)] rounded-lg px-3 py-3">
              Загрузка текущих связей...
            </div>
          )}
          {!accountLinksLoading && accountLinks.length === 0 && (
            <div className="text-sm text-[var(--color-ink-soft)] bg-white border border-[color:var(--color-info-border)] rounded-lg px-3 py-3">
              Пока нет привязанных аккаунтов.
            </div>
          )}
          {accountLinks.map((link) => {
            return (
              <div key={link.id} className="py-3 flex flex-wrap items-start md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--color-ink)]">
                    {link.displayName || link.normalizedName || 'Без имени'}
                  </p>
                  <p className="text-xs text-[var(--color-ink-soft)] flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 bg-white rounded border border-[color:var(--color-info-border)]">
                      {link.username}
                    </span>
                    {link.apartment && (
                      <span className="px-2 py-0.5 bg-[var(--color-info-surface)] rounded border border-[color:var(--color-info-border)]">
                        Кв. {link.apartment}
                      </span>
                    )}
                    {link.houses?.length > 0 && (
                      <span className="px-2 py-0.5 bg-[var(--color-info-surface)] rounded border border-[color:var(--color-info-border)]">
                        Дом: {link.houses.join(', ')}
                      </span>
                    )}
                    {link.phone && (
                      <span className="px-2 py-0.5 bg-[var(--color-info-surface)] rounded border border-[color:var(--color-info-border)]">
                        {link.phone}
                      </span>
                    )}
                    {link.updatedAt && (
                      <span className="text-[var(--color-ink-soft)]">
                        Обновлено {formatDateWithShortMonth(link.updatedAt)}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => handleAccountLinkRemove(link.id)}
                  className="px-3 py-2 rounded-lg text-sm text-accent border border-[color:var(--color-info-border)] bg-white hover:bg-accent/10 transition-colors ml-auto md:ml-0"
                >
                  Удалить
                </button>
              </div>
            );
          })}
        </div>
        </div>
      </div>

      )}

      {activeTab === 'payments' && (
      <div className="bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-[var(--color-ink)]">Взносы жильцов</h3>
            <p className="text-sm text-[var(--color-ink-soft)]">Добавьте оплату</p>
          </div>
          <span className="text-xs text-[var(--color-ink-soft)] px-3 py-1 rounded-full bg-white border border-[color:var(--color-info-border)]">
            {summary.contributionCount || contributions.length}
          </span>
        </div>

        {contributionError && (
          <div className="text-sm text-accent bg-accent/10 border border-accent/30 rounded-lg px-3 py-2 mb-3">
            {contributionError}
          </div>
        )}

        <form onSubmit={handleContributionSubmit} className="space-y-3 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2 space-y-1">
              <label className="text-sm text-[var(--color-ink-soft)]">ФИО / квартира</label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={contributionForm.personInput}
                  onChange={(e) => {
                    lastSelectedInputRef.current = null;
                    setSuppressSuggestions(false);
                    setContributionForm({ ...contributionForm, personInput: e.target.value });
                  }}
                  className="w-full h-11 border border-[color:var(--color-info-border)] rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
                  placeholder="Например, Кв. 14 — Ковалёва"
                />
                <div className="text-xs text-[var(--color-ink-soft)] flex items-center gap-2">
                  {parsingInput
                    ? 'Анализ ввода...'
                    : selectedContribution
                    ? (
                      <>
                        Распознано: {selectedContribution.displayName}
                        {isNewContribution && (
                          <span className="px-2 py-0.5 rounded-full bg-white border border-[color:var(--color-info-border)] text-[var(--color-ink)]">
                            Новый плательщик
                          </span>
                        )}
                        {selectedContribution.apartment && <span className="px-2 py-0.5 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]">Кв. {selectedContribution.apartment}</span>}
                        {selectedContribution.houses?.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]">
                            Дом: {selectedContribution.houses.join(', ')}
                          </span>
                        )}
                      </>
                    )
                    : ''}
                </div>
                {contributionSuggestions.length > 0 && (
                  <div className="border border-[color:var(--color-info-border)] rounded-lg bg-white shadow-sm divide-y divide-[color:var(--color-info-border)]">
                    {contributionSuggestions.map((s) => (
                      <button
                        key={`${s.normalizedName}-${s.apartment ?? 'na'}`}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelectedContribution(s);
                          const formatted = formatSuggestionInput(s);
                          lastSelectedInputRef.current = formatted.trim();
                          setContributionForm((prev) => ({ ...prev, personInput: formatted }));
                          setContributionSuggestions([]);
                          setSuppressSuggestions(true);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          selectedContribution?.normalizedName === s.normalizedName && selectedContribution?.apartment === s.apartment
                            ? 'bg-[var(--color-info-surface)]'
                            : 'hover:bg-[var(--color-info-surface)]/70'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-[var(--color-ink)]">{s.displayName}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-[11px] text-[var(--color-ink-soft)] mt-1">
                          <span className="px-2 py-0.5 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]">
                            {s.apartment ? `Кв. ${s.apartment}` : 'Без квартиры'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]">
                            {s.houses?.length ? `Дом: ${s.houses.join(', ')}` : 'Дом не указан'}
                          </span>
                          {s.source && (
                            <span className="px-2 py-0.5 rounded-full bg-white border border-[color:var(--color-info-border)]">{s.source}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
            <div className="space-y-1 lg:col-span-2">
              <label className="text-sm text-[var(--color-ink-soft)]">Сумма</label>
              <input
                type="number"
                min={0}
                value={contributionForm.amount}
                onChange={(e) => setContributionForm({ ...contributionForm, amount: e.target.value })}
                className="w-full h-11 border border-[color:var(--color-info-border)] rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
                placeholder="0"
              />
            </div>
            {isNewContribution && (
              <div className="lg:col-span-5 p-3 rounded-lg border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)] space-y-2">
                <div className="text-xs text-[var(--color-ink-soft)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">person_add</span>
                  Укажите дом и/или квартиру, чтобы сохранить нового плательщика (необязательно).
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newContributionDetails.house}
                    onChange={(e) => setNewContributionDetails((prev) => ({ ...prev, house: e.target.value }))}
                    className="w-full h-11 border border-[color:var(--color-info-border)] rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
                    placeholder="Дом или корпус (опционально)"
                  />
                  <input
                    type="text"
                    value={newContributionDetails.apartment}
                    onChange={(e) => setNewContributionDetails((prev) => ({ ...prev, apartment: e.target.value }))}
                    className="w-full h-11 border border-[color:var(--color-info-border)] rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
                    placeholder="Квартира (опционально)"
                  />
                </div>
              </div>
            )}
            <div className="space-y-1 lg:col-span-5">
              <label className="text-sm text-[var(--color-ink-soft)]">Комментарий</label>
              <input
                type="text"
                value={contributionForm.note}
                onChange={(e) => setContributionForm({ ...contributionForm, note: e.target.value })}
                className="w-full h-11 border border-[color:var(--color-info-border)] rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
                placeholder="Например, перечисление за воду"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 justify-end">
            <button
              type="submit"
              disabled={contributionLoading}
              className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-contrast hover:bg-accent transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              {contributionLoading ? 'Сохраняем...' : 'Добавить взнос'}
            </button>
          </div>
        </form>

        <div className="mt-6 space-y-3">
          {contributionLoading && contributions.length === 0 && (
            <div className="text-sm text-[var(--color-ink-soft)] bg-white border border-[color:var(--color-info-border)] rounded-lg px-3 py-3">
              Загрузка взносов...
            </div>
          )}
          {!contributionLoading && contributions.length === 0 && (
            <div className="text-sm text-[var(--color-ink-soft)] bg-white border border-[color:var(--color-info-border)] rounded-lg px-3 py-3">
              Пока нет добавленных оплат.
            </div>
          )}
          {contributions.map((item) => (
            <div key={item.id} className="flex flex-col md:flex-row md:items-center gap-3 bg-white/70 border border-[color:var(--color-info-border)] rounded-lg px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--color-ink)]">{item.displayName}</p>
                <p className="text-xs text-[var(--color-ink-soft)] flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]">{item.month}</span>
                  {item.apartment && (
                    <span className="px-2 py-0.5 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]">Кв. {item.apartment}</span>
                  )}
                  {item.houses?.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)]">
                      Дом: {item.houses.join(', ')}
                    </span>
                  )}
                  {item.note && <span className="line-clamp-1">{item.note}</span>}
                </p>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <span className="font-semibold text-[var(--color-ink)]">{formatCurrency(item.amount)}</span>
                <button
                  onClick={() => handleContributionRemove(item.id)}
                  className="ml-auto md:ml-0 px-2.5 py-1.5 rounded-lg text-sm text-accent border border-[color:var(--color-info-border)] bg-white hover:bg-accent/10 transition-colors"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {activeTab === 'debtors' && (
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

        {debtorError && (
          <div className="mb-3 text-sm text-accent bg-accent/10 border border-accent/30 rounded-lg px-3 py-2">
            {debtorError}
          </div>
        )}

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
                onChange={(e) => setDebtorForm({ ...debtorForm, debt: e.target.value })}
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
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-end gap-3 mt-3">
            <button
              onClick={handleDebtorSubmit}
              disabled={debtorSaving}
              className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-contrast hover:bg-accent transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              {debtorSaving ? 'Сохраняем...' : 'Добавить должника'}
            </button>
          </div>
        </div>

        <div className="divide-y divide-[color:var(--color-info-border)]">
          {debtorsLoading && (
            <div className="text-sm text-[var(--color-ink-soft)] bg-white border border-[color:var(--color-info-border)] rounded-lg px-3 py-3">
              Загрузка списка должников...
            </div>
          )}
          {!debtorsLoading && debtors.length === 0 && (
            <div className="text-sm text-[var(--color-ink-soft)] bg-white border border-[color:var(--color-info-border)] rounded-lg px-3 py-3">
              Пока нет должников. Добавьте запись с помощью формы выше.
            </div>
          )}
          {debtors.map((debtor) => {
            const primaryHouse = debtor.houses?.[0];
            const houseMeta = primaryHouse ? getHouseById(primaryHouse) : null;
            const displayHouse = formatHouseNameForDisplay(houseMeta?.label || primaryHouse);
            const rawName = debtor.displayName && debtor.displayName.trim()
              ? debtor.displayName.trim()
              : displayHouse || 'Без имени';
            const displayName = capitalizeFirst(rawName);
            const housesDisplay =
              debtor.houses && debtor.houses.length > 0
                ? debtor.houses
                    .map((h) => {
                      const meta = getHouseById(h);
                      return formatHouseNameForDisplay(meta?.label || h);
                    })
                    .filter(Boolean)
                    .join(', ')
                : '';
            const hasExtraDetails = Boolean(debtor.apartment || debtor.phone || debtor.note);
            return (
              <div key={debtor.id} className="py-3 flex flex-col lg:flex-row lg:items-center gap-3">
                <div
                  className={`flex ${hasExtraDetails ? 'items-start' : 'items-center'} gap-3 flex-1 min-w-0`}
                >
                  <div className="w-10 h-10 rounded-lg bg-white border border-[color:var(--color-info-border)] text-primary grid place-items-center shrink-0">
                    <span className="material-symbols-outlined">{houseMeta?.icon ?? 'home_pin'}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--color-ink)]">{displayName}</p>
                    {hasExtraDetails && (
                      <p className="text-xs text-[var(--color-ink-soft)] flex flex-wrap items-center gap-2">
                        {debtor.apartment && (
                          <span className="px-2 py-0.5 bg-white rounded border border-[color:var(--color-info-border)]">Кв. {debtor.apartment}</span>
                        )}
                        {hasExtraDetails && housesDisplay && (
                          <span className="px-2 py-0.5 bg-white rounded border border-[color:var(--color-info-border)]">{capitalizeFirst(housesDisplay)}</span>
                        )}
                        {debtor.phone && <span>{debtor.phone}</span>}
                        {debtor.note && <span className="text-[var(--color-ink-soft)]">{debtor.note}</span>}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={debtorDebtInputs[debtor.id] ?? String(debtor.debt)}
                    onChange={(e) => handleDebtChange(debtor.id, e.target.value)}
                    className="w-28 border border-[color:var(--color-info-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
                    placeholder="0"
                  />
                  <span className="text-sm text-[var(--color-ink-soft)]">₽</span>
                </div>

                <button
                  onClick={() => handleDebtorRemove(debtor.id)}
                  className="px-3 py-2 rounded-lg text-sm text-accent border border-[color:var(--color-info-border)] bg-white hover:bg-accent/10 transition-colors"
                >
                  Удалить
                </button>
              </div>
            );
          })}
        </div>
      </div>

      )}

      {activeTab === 'meters' && (
      <div className="bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-[var(--color-ink)]">Показания счетчиков</h3>
            <p className="text-sm text-[var(--color-ink-soft)]">Отправленные жильцами значения по аккаунтам.</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-[var(--color-ink-soft)] flex items-center gap-2">
              <span className="hidden sm:inline">Фильтр:</span>
              <select
                value={meterUserFilter}
                onChange={(e) => setMeterUserFilter(e.target.value)}
                className="text-sm border border-[color:var(--color-info-border)] rounded-md text-[var(--color-ink)] bg-white focus:border-primary focus:ring-primary/30 px-2 py-1"
              >
                <option value="">Все пользователи</option>
                {accountUsers.map((user) => (
                  <option key={user.username} value={user.username}>
                    {user.username}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={loadMeters}
              disabled={meterLoading}
              className="px-3 py-2 rounded-lg text-sm font-semibold border border-[color:var(--color-info-border)] bg-white hover:bg-[var(--color-info-surface)] transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              {meterLoading ? 'Обновляем...' : 'Обновить'}
            </button>
          </div>
        </div>

        {meterError && (
          <div className="mb-3 text-sm text-accent bg-accent/10 border border-accent/30 rounded-lg px-3 py-2">
            {meterError}
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-[color:var(--color-info-border)] bg-white">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-[var(--color-ink-soft)] bg-[var(--color-info-surface)]">
              <tr>
                <th className="px-4 py-2 text-left">Аккаунт</th>
                <th className="px-4 py-2 text-left">Горячая, м³</th>
                <th className="px-4 py-2 text-left">Холодная, м³</th>
                <th className="px-4 py-2 text-left">Электричество, кВт⋅ч</th>
                <th className="px-4 py-2 text-left">Когда</th>
              </tr>
            </thead>
            <tbody>
              {meterLoading && meterReadings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-[var(--color-ink-soft)] text-center">
                    Загружаем показания...
                  </td>
                </tr>
              )}
              {!meterLoading && meterReadings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-[var(--color-ink-soft)] text-center">
                    Пока нет отправленных показаний.
                  </td>
                </tr>
              )}
              {meterReadings.map((row) => (
                <tr key={row.id} className="border-t border-[color:var(--color-info-border)] hover:bg-[var(--color-info-surface)]/60">
                  <td className="px-4 py-2 font-semibold text-[var(--color-ink)]">{row.username || '—'}</td>
                  <td className="px-4 py-2 text-[var(--color-ink-soft)]">
                    {Math.max(0, row.hotWater).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-ink-soft)]">
                    {Math.max(0, row.coldWater).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-ink-soft)]">
                    {Math.max(0, row.electricity).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-ink-soft)]">{formatDateTimeCompact(row.createdAt) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-5">
          <div className="bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-semibold text-[var(--color-ink)]">Заявки жителей</h3>
                <p className="text-sm text-[var(--color-ink-soft)]">Обрабатывайте обращения, меняйте статус и фиксируйте комментарии.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  type="search"
                  value={adminRequestSearch}
                  onChange={(e) => setAdminRequestSearch(e.target.value)}
                  placeholder="Поиск по теме, категории или ФИО"
                  className="px-3 py-2 rounded-lg border border-[color:var(--color-info-border)] bg-white text-sm text-[var(--color-ink)] focus:ring-primary/30 focus:border-primary w-full md:w-72"
                />
                <button
                  onClick={() => void loadAdminRequests()}
                  disabled={adminRequestsLoading}
                  className="px-3 py-2 rounded-lg border border-[color:var(--color-info-border)] bg-white text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-info-surface)] disabled:opacity-60"
                >
                  {adminRequestsLoading ? 'Обновляем...' : 'Обновить'}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-between items-center">
              <div className="flex flex-wrap gap-2">
                {adminRequestTabs.map((tab) => {
                  const isActive = adminRequestFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onMouseDown={triggerTabFeedback}
                      onTouchStart={triggerTabFeedback}
                      onClick={() => setAdminRequestFilter(tab.key)}
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
            </div>
          </div>

          <div className="space-y-3">
            {adminRequestsError && (
              <div className="border border-[color:var(--color-info-border)] rounded-xl bg-red-50 px-6 py-4 text-sm text-[var(--color-ink)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-accent">error</span>
                  {adminRequestsError}
                </div>
                <button
                  onClick={() => void loadAdminRequests()}
                  className="text-primary font-semibold hover:text-accent"
                >
                  Повторить
                </button>
              </div>
            )}
            {requestActionError && !adminRequestsError && (
              <div className="border border-[color:var(--color-info-border)] rounded-xl bg-amber-50 px-6 py-3 text-sm text-[var(--color-ink)] flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-amber-600">warning</span>
                {requestActionError}
              </div>
            )}
            {adminRequestsLoading && (
              <div className="border border-[color:var(--color-info-border)] rounded-xl bg-[var(--color-info-surface)] px-6 py-5 text-[var(--color-ink-soft)]">
                Загружаем заявки...
              </div>
            )}
            {!adminRequestsLoading && adminFilteredRequests.length === 0 && (
              <div className="border border-[color:var(--color-info-border)] rounded-xl bg-[var(--color-info-surface)] px-6 py-5 text-[var(--color-ink-soft)]">
                Нет заявок под выбранные фильтры.
              </div>
            )}

            {adminFilteredRequests.map((item) => {
              const busy = requestMutations[item.id];
              return (
                <div
                  key={item.id}
                  className="bg-white border border-[color:var(--color-info-border)] rounded-xl p-5 shadow-[0_10px_40px_-24px_rgba(0,0,0,0.25)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {renderRequestStatusPill(item.status)}
                        <span className="text-xs text-[var(--color-ink-soft)]">обновлено {formatRequestDate(item.updatedAt)}</span>
                        {busy && (
                          <span className="text-xs text-primary inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">progress_activity</span>
                            Сохраняем...
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-[var(--color-ink)]">{item.title}</h3>
                      <div className="text-sm text-primary font-medium">{item.category || 'Общее'}</div>
                      <div className="text-sm text-[var(--color-ink-soft)]">ФИО: {item.fullName || '—'}</div>
                    </div>
                    <div className="text-xs text-[var(--color-ink-soft)]">Создано {formatRequestDate(item.createdAt)}</div>
                  </div>

                  <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed mb-4">{item.description}</p>

                  <div className="flex flex-wrap gap-2 items-start justify-between">
                    <div className="flex flex-wrap gap-2">
                      {item.status === 'new' && (
                        <button
                          onClick={() => void updateAdminRequestStatus(item.id, 'in_progress')}
                          disabled={busy}
                          className="px-3 py-2 rounded-lg border border-[color:var(--color-info-border)] text-sm font-medium hover:bg-[var(--color-info-surface)] disabled:opacity-60"
                        >
                          Взять в работу
                        </button>
                      )}
                      {item.status !== 'resolved' && (
                        <button
                          onClick={() => void updateAdminRequestStatus(item.id, 'resolved')}
                          disabled={busy}
                          className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-sm disabled:opacity-60"
                        >
                          Отметить решенной
                        </button>
                      )}
                      {item.status === 'resolved' && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                          <input
                            value={adminReopenDrafts[item.id] ?? ''}
                            onChange={(e) => setAdminReopenDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="Комментарий для возврата"
                            disabled={busy}
                            className="flex-1 min-w-[220px] px-3 py-2 rounded-lg border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)] text-[var(--color-ink)] focus:ring-primary/30 focus:border-primary disabled:opacity-60"
                          />
                          <button
                            onClick={() => void handleAdminReopen(item)}
                            disabled={busy || !(adminReopenDrafts[item.id] ?? '').trim()}
                            className="px-3 py-2 rounded-lg border border-[color:var(--color-info-border)] text-sm font-semibold hover:bg-[var(--color-info-surface)] disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            Вернуть в работу
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                    <input
                      value={adminCommentDrafts[item.id] ?? ''}
                      onChange={(e) => setAdminCommentDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="Комментарий администратора (необязательно)"
                      disabled={busy}
                      className="flex-1 min-w-[220px] px-3 py-2 rounded-lg border border-[color:var(--color-info-border)] bg-[var(--color-info-surface)] text-[var(--color-ink)] focus:ring-primary/30 focus:border-primary disabled:opacity-60"
                    />
                    <button
                      onClick={() => void handleAdminAddComment(item)}
                      disabled={busy || !(adminCommentDrafts[item.id] ?? '').trim()}
                      className="px-3 py-2 rounded-lg border border-[color:var(--color-info-border)] text-sm font-semibold hover:bg-[var(--color-info-surface)] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Добавить комментарий
                    </button>
                  </div>

                  {item.comments && item.comments.length > 0 && (
                    <div className="mt-4 border-t border-[color:var(--color-info-border)] pt-3">
                      <div className="text-xs font-semibold text-[var(--color-ink-soft)] mb-2">Комментарии</div>
                      <div className="space-y-2">
                        {item.comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="text-sm text-[var(--color-ink-soft)] bg-[var(--color-info-surface)] rounded-lg px-3 py-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-[var(--color-ink)]">{adminCommentKindLabel[comment.kind] ?? 'Комментарий'}</span>
                              <span className="text-xs">{formatRequestDate(comment.createdAt)}</span>
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
        </div>
      )}

      {activeTab === 'news' && (
      <div ref={newsSectionRef} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-[var(--color-ink)]">Новости</h3>
              <p className="text-sm text-[var(--color-ink-soft)]">Создайте или отредактируйте публикацию.</p>
            </div>
            {editingNewsId && (
              <button
                onClick={handleNewsReset}
                className="text-sm text-primary hover:text-accent flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">close</span>
                Сбросить
              </button>
            )}
          </div>

          {newsError && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-accent/10 text-sm text-accent border border-accent/30">
              {newsError}
            </div>
          )}

          <form ref={newsFormRef} onSubmit={handleNewsSubmit} className="space-y-3 scroll-mt-24 lg:scroll-mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm text-[var(--color-ink-soft)]">Заголовок</label>
                <input
                  type="text"
                  value={newsForm.title}
                  onChange={(e) => setNewsForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full border border-[color:var(--color-info-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
                  placeholder="Например, Работы по благоустройству"
                />
              </div>
            <div className="space-y-1">
              <label className="text-sm text-[var(--color-ink-soft)]">Тег</label>
              <div className="relative">
                <input
                  type="text"
                  value={newsForm.tag}
                  onChange={(e) => {
                    setNewsForm((prev) => ({ ...prev, tag: e.target.value }));
                    setTagOpen(true);
                  }}
                  onFocus={() => setTagOpen(true)}
                  onBlur={() => setTimeout(() => setTagOpen(false), 120)}
                  className="w-full border border-[color:var(--color-info-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)]"
                  placeholder="Например, Событие или Авария"
                />
                  {tagOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-[color:var(--color-info-border)] rounded-lg shadow-sm max-h-44 overflow-auto">
                      {newsTagOptions
                        .filter((tag) => tag.toLowerCase().includes(newsForm.tag.trim().toLowerCase()))
                        .map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setNewsForm({ ...newsForm, tag });
                              setTagOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-info-surface)]"
                          >
                            {tag}
                          </button>
                        ))}
                      {newsTagOptions.filter((tag) => tag.toLowerCase().includes(newsForm.tag.trim().toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-sm text-[var(--color-ink-soft)]">Нет совпадений</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {baseNewsTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setNewsForm((prev) => ({ ...prev, tag }))}
                      className={`px-3 py-1.5 rounded-lg text-xs border ${
                        newsForm.tag === tag
                          ? 'bg-primary text-primary-contrast border-primary'
                          : 'bg-[var(--color-info-surface)] text-[var(--color-ink)] border-[color:var(--color-info-border)] hover:bg-white'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-[var(--color-ink-soft)]">Краткое описание</label>
              <textarea
                value={newsForm.summary}
                onChange={(e) => setNewsForm((prev) => ({ ...prev, summary: e.target.value }))}
                className="w-full border border-[color:var(--color-info-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[var(--color-ink)] min-h-[96px]"
                placeholder="Коротко опишите новость"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-[var(--color-ink-soft)]">Обложка (изображение)</label>
              <label
                htmlFor="news-image"
                className="w-full inline-flex items-center gap-3 px-3 py-2 rounded-lg border border-[color:var(--color-info-border)] bg-white text-sm cursor-pointer hover:bg-[var(--color-info-surface)] transition-colors"
              >
                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] shrink-0">
                  {(newsForm.imageFile || newsForm.imagePreview) && (
                    <button
                      type="button"
                      onClick={(evt) => {
                        evt.preventDefault();
                        evt.stopPropagation();
                        clearNewsImage();
                      }}
                      className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border border-[color:var(--color-info-border)] text-[var(--color-ink-soft)] shadow-sm grid place-items-center hover:bg-accent/10"
                      title="Сбросить изображение"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  )}
                  <img
                    src={newsForm.imagePreview || defaultNewsImage}
                    alt="Превью"
                    className="w-full h-full object-cover"
                    onError={handleNewsImageError}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-ink)] truncate">
                    {newsForm.imageFile ? newsForm.imageFile.name : 'Выбрать изображение'}
                  </p>
                  <p className="text-xs text-[var(--color-ink-soft)] truncate">PNG или JPG, можно оставить пустым</p>
                </div>
                <span className="material-symbols-outlined text-primary">upload</span>
              </label>
              <input
                id="news-image"
                ref={newsImageInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleNewsImageChange(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end">
              <button
                type="submit"
                disabled={newsSaving}
                className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-contrast hover:bg-accent transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
              >
                <span className="material-symbols-outlined text-base">{editingNewsId ? 'save' : 'add_circle'}</span>
                {newsSaving ? 'Сохранение...' : editingNewsId ? 'Сохранить изменения' : 'Опубликовать новость'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--color-ink)]">Лента публикаций</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-ink-soft)]">
                {newsLoading ? 'Загрузка...' : `${newsTotalCount || newsItems.length} шт.`}
              </span>
              {hasAdminPagination && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setNewsPage((prev) => Math.max(prev - 1, 0))}
                    disabled={!canAdminPrev}
                    className="p-1.5 rounded-md border border-[color:var(--color-info-border)] bg-white text-[var(--color-ink-soft)] hover:text-primary hover:bg-[var(--color-info-surface)] disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Предыдущие публикации"
                  >
                    <span className="material-symbols-outlined text-base">chevron_left</span>
                  </button>
                  <span className="text-xs text-[var(--color-ink-soft)] px-2">{adminPageLabel}</span>
                  <button
                    type="button"
                    onClick={() => setNewsPage((prev) => prev + 1)}
                    disabled={!canAdminNext}
                    className="p-1.5 rounded-md border border-[color:var(--color-info-border)] bg-white text-[var(--color-ink-soft)] hover:text-primary hover:bg-[var(--color-info-surface)] disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Следующие публикации"
                  >
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            {newsLoading && (
              <div className="text-sm text-[var(--color-ink-soft)] bg-white border border-[color:var(--color-info-border)] rounded-lg px-3 py-3">
                Загрузка новостей...
              </div>
            )}
            {!newsLoading && newsError && (
              <div className="text-sm text-accent bg-accent/10 border border-accent/30 rounded-lg px-3 py-3">
                Не удалось загрузить новости
              </div>
            )}
            {!newsLoading && !newsError && newsItems.length === 0 && (
              <div className="text-sm text-[var(--color-ink-soft)] bg-white border border-[color:var(--color-info-border)] rounded-lg px-3 py-3">
                Новости не найдены
              </div>
            )}
            {!newsLoading && !newsError && adminNewsPageItems.map((item) => {
              const img = getNewsImage(item.image || item.imageUrl);
              const badgeTone = getTagTone(item.tag);
              const publishedAt = formatNewsDateCompact(item.createdAt || item.date) || item.date || '—';
              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row gap-3 bg-white/80 border border-[color:var(--color-info-border)] rounded-xl p-4 shadow-[0_6px_16px_rgba(0,0,0,0.05)]"
                >
                  <div className="w-full h-40 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] shrink-0">
                    <img
                      src={img}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={handleNewsImageError}
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold text-white ${badgeTone}`}>
                          {item.tag || 'Без тега'}
                        </span>
                        <span className="text-xs text-[var(--color-ink-soft)] whitespace-nowrap leading-tight">
                          {publishedAt}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 ml-auto">
                        <button
                          onClick={() => handleNewsEdit(item)}
                          className="p-2 rounded-full border border-[color:var(--color-info-border)] bg-white text-[var(--color-ink-soft)] hover:text-primary hover:border-primary hover:bg-[var(--color-info-surface)] transition"
                          title="Редактировать"
                        >
                          <span className="material-symbols-outlined text-base leading-none">edit_square</span>
                        </button>
                        <button
                          onClick={() => handleNewsRemove(item.id)}
                          className="p-2 rounded-full border border-[color:var(--color-info-border)] bg-white text-[var(--color-ink-soft)] hover:text-accent hover:border-accent hover:bg-accent/10 transition"
                          title="Удалить"
                        >
                          <span className="material-symbols-outlined text-base leading-none">delete</span>
                        </button>
                      </div>
                    </div>
                    <p className="font-semibold text-[var(--color-ink)] leading-snug line-clamp-2">{item.title}</p>
                    <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed line-clamp-3">{item.summary}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      )}

      {activeTab === 'documents' && (
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
          <div className="md:col-span-4 flex flex-col md:flex-row items-stretch md:items-center gap-3 mt-2 w-full justify-end">
            <button
              type="submit"
              disabled={docSaving}
              className="w-full md:w-auto px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-contrast hover:bg-accent transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 self-stretch md:self-auto"
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
                className="px-3 py-2 rounded-lg text-sm text-accent border border-[color:var(--color-info-border)] bg-white hover:bg-accent/10 transition-colors self-end md:self-auto ml-auto md:ml-0"
              >
                Удалить
              </button>
            </div>
          ))}
        </div>
      </div>
      )}
      </div>
    </div>
  );
};

export default Admin;
