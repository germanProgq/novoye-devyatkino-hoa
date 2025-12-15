import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, Legend } from 'recharts';
import { AccountDebtEntry, AccountDebtSummary, MeterRecord } from '../types';

const API_BASE_URL = (
  import.meta.env.VITE_BACKEND_URL
    ? String(import.meta.env.VITE_BACKEND_URL)
    : 'http://localhost:8080'
).replace(/\/$/, '');
const apiFetch = (input: string, init: RequestInit = {}) => fetch(input, { credentials: 'include', ...init });
const formatCurrency = (value: number) => `${value.toLocaleString('ru-RU')} ₽`;

const mapApiDebtEntry = (item: any): AccountDebtEntry => ({
  id: item.id ?? '',
  username: item.username || '',
  displayName: item.displayName || item.name || '',
  normalizedName: item.normalizedName || item.normalized_name || '',
  apartment: item.apartment || item.unit || undefined,
  houses: Array.isArray(item.houses) ? item.houses.map((h: any) => String(h)) : [],
  createdAt: item.createdAt || item.created_at || undefined,
  updatedAt: item.updatedAt || item.updated_at || undefined,
  debt: typeof item.debt === 'number' ? item.debt : Number(item.debt) || 0,
  debtorId: item.debtorId || item.debtor_id || undefined,
  note: item.note || '',
  phone: item.phone || '',
});

const formatDateShort = (raw?: string) => {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('ru-RU');
};

const mapApiMeterRecord = (item: any): MeterRecord => ({
  id: item.id ?? '',
  username: item.username || '',
  hotWater: typeof item.hotWater === 'number' ? item.hotWater : Number(item.hotWater) || 0,
  coldWater: typeof item.coldWater === 'number' ? item.coldWater : Number(item.coldWater) || 0,
  electricity: typeof item.electricity === 'number' ? item.electricity : Number(item.electricity) || 0,
  createdAt: item.createdAt || item.created_at || '',
});

const formatMeterLabel = (raw?: string) => {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
};

const formatMeterDate = (raw?: string) => {
  if (!raw) return '—';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatMonthKey = (raw?: string) => {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonthLabel = (raw?: string) => {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', { month: 'long' });
};

const resourceLabels: Record<keyof Pick<MeterRecord, 'hotWater' | 'coldWater' | 'electricity'>, string> = {
  hotWater: 'Горячая вода',
  coldWater: 'Холодная вода',
  electricity: 'Электричество',
};

const Dashboard: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });
  const [debtSummary, setDebtSummary] = useState<AccountDebtSummary | null>(null);
  const [debtLoading, setDebtLoading] = useState(true);
  const [debtError, setDebtError] = useState<string | null>(null);
  const [meterForm, setMeterForm] = useState({ hotWater: '', coldWater: '', electricity: '' });
  const [meterSubmitting, setMeterSubmitting] = useState(false);
  const [meterStatus, setMeterStatus] = useState<string | null>(null);
  const [meterError, setMeterError] = useState<string | null>(null);
  const [meterHistory, setMeterHistory] = useState<MeterRecord[]>([]);
  const [meterHistoryLoading, setMeterHistoryLoading] = useState(false);
  const [meterHistoryError, setMeterHistoryError] = useState<string | null>(null);
  const meterChartRef = useRef<HTMLDivElement>(null);
  const [{ width: meterW, height: meterH }, setMeterSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const loadDebt = async () => {
      setDebtLoading(true);
      setDebtError(null);
      try {
        const response = await apiFetch(`${API_BASE_URL}/api/accounts/me/debts`);
        if (!response.ok) {
          throw new Error(`API responded with ${response.status}`);
        }
        const payload = await response.json();
        const links = Array.isArray(payload.links) ? payload.links.map(mapApiDebtEntry) : [];
        setDebtSummary({
          username: payload.username || '',
          totalDebt: typeof payload.totalDebt === 'number' ? payload.totalDebt : Number(payload.totalDebt) || 0,
          links,
        });
      } catch (err) {
        console.error(err);
        setDebtError('Не удалось загрузить задолженность');
      } finally {
        setDebtLoading(false);
      }
    };
    loadDebt();
  }, []);

  const loadMeterHistory = useCallback(async () => {
    setMeterHistoryLoading(true);
    setMeterHistoryError(null);
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/meters`);
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }
      const payload = await response.json();
      const list = Array.isArray(payload.readings) ? payload.readings : Array.isArray(payload) ? payload : [];
      setMeterHistory(list.map(mapApiMeterRecord));
    } catch (err) {
      console.error(err);
      setMeterHistoryError('Не удалось загрузить историю показаний');
    } finally {
      setMeterHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeterHistory();
  }, [loadMeterHistory]);

  useLayoutEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return undefined;

    const updateChartReady = () => {
      const rect = el.getBoundingClientRect();
      setSize({
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height)),
      });
    };

    updateChartReady();

    const resizeObserver = new ResizeObserver(updateChartReady);
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
  }, [meterHistoryLoading, meterHistoryError, meterHistory.length]);

  useLayoutEffect(() => {
    const el = meterChartRef.current;
    if (!el) return undefined;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setMeterSize({
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height)),
      });
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, [meterHistoryLoading, meterHistoryError, meterHistory.length]);

  const linkedDebts = debtSummary?.links ?? [];
  const totalDebt = debtSummary?.totalDebt ?? 0;
  const hasLinks = linkedDebts.length > 0;
  const latestUpdate = linkedDebts.find((entry) => entry.updatedAt)?.updatedAt || '';
  const meterHistorySorted = useMemo(() => {
    const toTs = (value?: string) => {
      if (!value) return 0;
      const ts = new Date(value).getTime();
      return Number.isNaN(ts) ? 0 : ts;
    };
    return [...meterHistory].sort((a, b) => toTs(b.createdAt) - toTs(a.createdAt));
  }, [meterHistory]);
  const meterChartData = useMemo(
    () =>
      [...meterHistorySorted].reverse().map((row, idx) => ({
        label: formatMeterLabel(row.createdAt) || `Запись ${idx + 1}`,
        hotWater: row.hotWater,
        coldWater: row.coldWater,
        electricity: row.electricity,
      })),
    [meterHistorySorted],
  );
  const hasMeterData = meterChartData.length > 0;
  const hasMeterChart = meterW > 0 && meterH > 0 && hasMeterData;

  const monthlyStackedData = useMemo(() => {
    const buckets = new Map<
      string,
      { label: string; order: number; hotWater: number; coldWater: number; electricity: number }
    >();
    meterHistorySorted.forEach((row) => {
      const key = formatMonthKey(row.createdAt);
      const label = formatMonthLabel(row.createdAt) || key || '—';
      if (!key) return;
      const monthOrder = new Date(row.createdAt || '').getTime();
      const current = buckets.get(key) || { label, order: monthOrder, hotWater: 0, coldWater: 0, electricity: 0 };
      current.hotWater += row.hotWater || 0;
      current.coldWater += row.coldWater || 0;
      current.electricity += row.electricity || 0;
      buckets.set(key, current);
    });
    const aggregated = Array.from(buckets.values()).sort((a, b) => a.order - b.order);
    return aggregated.slice(-6);
  }, [meterHistorySorted]);

  const hasAnyData = hasLinks || hasMeterData;
  const showEmptyState = !debtLoading && !meterHistoryLoading && !hasAnyData && !debtError && !meterHistoryError;
  const showMeterVisuals = meterHistoryLoading || Boolean(meterHistoryError) || hasMeterData;

  const handleMeterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMeterError(null);
    setMeterStatus(null);

    const hot = Number.parseFloat(meterForm.hotWater);
    const cold = Number.parseFloat(meterForm.coldWater);
    const elec = Number.parseFloat(meterForm.electricity);

    if (!Number.isFinite(hot) || !Number.isFinite(cold) || !Number.isFinite(elec)) {
      setMeterError('Укажите корректные значения счётчиков');
      return;
    }

    setMeterSubmitting(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/meters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotWater: hot, coldWater: cold, electricity: elec }),
      });
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }
      setMeterStatus('Показания успешно отправлены');
      setMeterForm({ hotWater: '', coldWater: '', electricity: '' });
      await loadMeterHistory();
    } catch (err) {
      console.error(err);
      setMeterError('Не удалось отправить показания. Попробуйте позже.');
    } finally {
      setMeterSubmitting(false);
    }
  };

  const headerSection = (
    <header className="space-y-1">
      <h1 className="text-2xl font-bold text-[var(--color-ink)]">Личный кабинет</h1>
      <p className="text-[var(--color-ink-soft)]">
        {debtLoading
          ? 'Загружаем данные по вашему счету...'
          : hasLinks
          ? `Текущая задолженность: ${formatCurrency(totalDebt)}`
          : 'Попросите администратора привязать ваш аккаунт к квартире, чтобы видеть задолженность.'}
      </p>
      {debtError && <p className="text-sm text-accent">{debtError}</p>}
    </header>
  );

  if (showEmptyState) {
    return (
      <div className="space-y-6">
        {headerSection}
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-info-surface)] border border-[color:var(--color-info-border)] flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-3xl">home</span>
            </div>
            <p className="text-lg font-semibold text-[var(--color-ink)]">Нет данных</p>
            <p className="text-sm text-[var(--color-ink-soft)] max-w-md">
              Как только появится информация по вашему дому, мы покажем её на этой странице.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {headerSection}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[var(--color-info-surface)] p-6 rounded-xl border border-[color:var(--color-info-border)] shadow-sm flex items-start justify-between backdrop-blur-sm">
          <div>
            <p className="text-sm font-medium text-[var(--color-ink-soft)]">Текущая задолженность</p>
            <h3 className="text-2xl font-bold text-[var(--color-ink)] mt-1">
              {debtLoading ? '—' : hasLinks ? formatCurrency(totalDebt) : 'Нет данных'}
            </h3>
          </div>
          <div className="p-3 bg-white text-primary rounded-lg border border-[color:var(--color-info-border)]">
            <span className="material-symbols-outlined">payments</span>
          </div>
        </div>
{/* 
        <div className="bg-[var(--color-info-surface)] p-6 rounded-xl border border-[color:var(--color-info-border)] shadow-sm flex items-start justify-between backdrop-blur-sm">
          <div>
            <p className="text-sm font-medium text-[var(--color-ink-soft)]">Привязанные жильцы</p>
            <h3 className="text-2xl font-bold text-[var(--color-ink)] mt-1">{debtLoading ? '—' : linkedDebts.length}</h3>
            <span className="text-xs text-[var(--color-ink-soft)] mt-2 inline-block">
              {hasLinks ? 'Связанные квартиры/люди' : 'Попросите администратора связать аккаунт'}
            </span>
          </div>
          <div className="p-3 bg-accent/20 text-accent rounded-lg border border-[color:var(--color-info-border)]">
            <span className="material-symbols-outlined">diversity_2</span>
          </div>
        </div> */}

        <div className="bg-[var(--color-info-surface)] p-6 rounded-xl border border-[color:var(--color-info-border)] shadow-sm flex items-start justify-between backdrop-blur-sm">
          <div>
            <p className="text-sm font-medium text-[var(--color-ink-soft)]">Последнее обновление</p>
            <h3 className="text-2xl font-bold text-[var(--color-ink)] mt-1">
              {debtLoading ? '—' : latestUpdate ? formatDateShort(latestUpdate) : 'Нет данных'}
            </h3>
          </div>
          <div className="p-3 bg-primary/10 text-primary rounded-lg border border-[color:var(--color-info-border)]">
            <span className="material-symbols-outlined">update</span>
          </div>
        </div>
      </div>

      {showMeterVisuals && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cashflow chart */}
          <div className="bg-[var(--color-info-surface)] p-6 rounded-xl border border-[color:var(--color-info-border)] shadow-sm backdrop-blur-sm min-w-0">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-[var(--color-ink)]">Потребление за 6 месяцев</h3>
              <span className="text-xs text-[var(--color-ink-soft)]">Гор/Хол вода и электричество</span>
            </div>
            <div ref={chartContainerRef} className="h-72 w-full min-w-0">
              {meterHistoryLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-[var(--color-ink-soft)]">Загружаем данные...</div>
              ) : meterHistoryError ? (
                <div className="flex h-full items-center justify-center text-sm text-accent text-center">{meterHistoryError}</div>
              ) : hasMeterData && width > 0 && height > 0 ? (
                <ResponsiveContainer width={width} height={height}>
                  <BarChart data={monthlyStackedData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="8%" barGap={6}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(175, 194, 215, 0.6)" />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#3b4a3b', fontSize: 12 }}
                      dy={10}
                      padding={{ left: 0, right: 0 }}
                    />
                    <YAxis
                      width={44}
                      tickMargin={6}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#3b4a3b', fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(175, 194, 215, 0.12)' }}
                      formatter={(value: number, key) => {
                        const label = resourceLabels[key as keyof typeof resourceLabels] ?? key;
                        return [value, label];
                      }}
                      contentStyle={{ borderRadius: '10px', border: '1px solid rgba(175, 194, 215, 0.45)', boxShadow: '0 10px 30px rgba(47, 58, 42, 0.12)' }}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12, paddingLeft: 8 }} />
                    <Bar dataKey="hotWater" name={resourceLabels.hotWater} stackId="consumption" fill="#b4633b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="coldWater" name={resourceLabels.coldWater} stackId="consumption" fill="#5aa7a7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="electricity" name={resourceLabels.electricity} stackId="consumption" fill="var(--color-forest)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : hasMeterData ? (
                <div className="flex h-full items-center justify-center text-sm text-[var(--color-ink-soft)]">Готовим график...</div>
              ) : null}
            </div>
          </div>

          {/* Meter chart */}
          <div className="bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm p-4 sm:p-6 backdrop-blur-sm min-w-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[var(--color-ink)]">Динамика потребления</h3>
            </div>
            <div ref={meterChartRef} className="h-64 sm:h-72 w-full min-w-0">
              {meterHistoryLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-[var(--color-ink-soft)]">Загружаем данные...</div>
              ) : meterHistoryError ? (
                <div className="flex h-full items-center justify-center text-sm text-accent text-center">{meterHistoryError}</div>
              ) : hasMeterChart ? (
                <ResponsiveContainer width={meterW} height={meterH}>
                  <AreaChart data={meterChartData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHot" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#b4633b" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#b4633b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCold" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5aa7a7" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#5aa7a7" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorElec" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-forest)" stopOpacity={0.16} />
                        <stop offset="95%" stopColor="var(--color-forest)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#3b4a3b', fontSize: 12 }} />
                    <YAxis width={32} tickMargin={6} axisLine={false} tickLine={false} tick={{ fill: '#3b4a3b', fontSize: 12 }} />
                    <CartesianGrid vertical={false} stroke="rgba(175, 194, 215, 0.6)" strokeDasharray="3 3" />
                    <Tooltip
                      formatter={(value: number, key) => {
                        const label = resourceLabels[key as keyof typeof resourceLabels] ?? key;
                        return [value, label];
                      }}
                      contentStyle={{
                        borderRadius: '10px',
                        border: '1px solid rgba(175, 194, 215, 0.45)',
                        boxShadow: '0 10px 30px rgba(47, 58, 42, 0.12)',
                      }}
                    />
                    <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="hotWater" name={resourceLabels.hotWater} stroke="#b4633b" strokeWidth={2} fillOpacity={1} fill="url(#colorHot)" />
                    <Area type="monotone" dataKey="coldWater" name={resourceLabels.coldWater} stroke="#5aa7a7" strokeWidth={2} fillOpacity={1} fill="url(#colorCold)" />
                    <Area type="monotone" dataKey="electricity" name={resourceLabels.electricity} stroke="var(--color-forest)" strokeWidth={2} fillOpacity={1} fill="url(#colorElec)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : hasMeterData ? (
                <div className="flex h-full items-center justify-center text-sm text-[var(--color-ink-soft)]">Готовим график...</div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meter form */}
        <div className="bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm p-6 space-y-4 backdrop-blur-sm">
          <div>
            <h3 className="text-lg font-bold text-[var(--color-ink)]">Показания счетчиков</h3>
            <p className="text-sm text-[var(--color-ink-soft)]">Передавайте показания с 20 по 25 число месяца.</p>
          </div>
          <form onSubmit={handleMeterSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-soft)] mb-1">Горячая вода (м³)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  className="w-full pl-10 pr-4 py-2 border border-[color:var(--color-info-border)] rounded-lg focus:ring-primary/40 focus:border-primary bg-white text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)] placeholder:opacity-60 placeholder:italic"
                  placeholder="Пред.: 6.1"
                  value={meterForm.hotWater}
                  onChange={(e) => setMeterForm({ ...meterForm, hotWater: e.target.value })}
                  required
                />
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-accent">water_drop</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-soft)] mb-1">Холодная вода (м³)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  className="w-full pl-10 pr-4 py-2 border border-[color:var(--color-info-border)] rounded-lg focus:ring-primary/40 focus:border-primary bg-white text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)] placeholder:opacity-60 placeholder:italic"
                  placeholder="Пред.: 9.0"
                  value={meterForm.coldWater}
                  onChange={(e) => setMeterForm({ ...meterForm, coldWater: e.target.value })}
                  required
                />
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-primary">water_drop</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-soft)] mb-1">Электричество (кВт⋅ч)</label>
              <div className="relative">
                <input
                  type="number"
                  className="w-full pl-10 pr-4 py-2 border border-[color:var(--color-info-border)] rounded-lg focus:ring-primary/40 focus:border-primary bg-white text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)] placeholder:opacity-60 placeholder:italic"
                  placeholder="Пред.: 145"
                  value={meterForm.electricity}
                  onChange={(e) => setMeterForm({ ...meterForm, electricity: e.target.value })}
                  required
                />
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-primary">bolt</span>
              </div>
            </div>
            <button
              type="submit"
              disabled={meterSubmitting}
              className="w-full bg-primary hover:bg-accent text-primary-contrast font-medium py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-70"
            >
              {meterSubmitting ? 'Отправляем...' : 'Отправить показания'}
            </button>
            {meterStatus && <p className="text-sm text-[var(--color-ink)] text-center">{meterStatus}</p>}
            {meterError && <p className="text-sm text-accent text-center">{meterError}</p>}
            <p className="text-xs text-center text-[var(--color-ink-soft)]">Следующая передача: через 20 дней</p>
          </form>
        </div>

        {/* Meter history (compact) */}
        <div className="bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm overflow-hidden backdrop-blur-sm">
          <div className="px-4 sm:px-5 py-3 border-b border-[color:var(--color-info-border)]">
            <h3 className="font-semibold text-[var(--color-ink)] text-base">История показаний</h3>
          </div>
          <div className="max-h-[360px] overflow-auto hide-scrollbar">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead className="text-[11px] sm:text-xs text-[var(--color-ink)] uppercase bg-[var(--color-info-surface)]">
                <tr>
                  <th className="px-4 sm:px-5 py-2">Месяц</th>
                  <th className="px-4 sm:px-5 py-2">Горячая</th>
                  <th className="px-4 sm:px-5 py-2">Холодная</th>
                  <th className="px-4 sm:px-5 py-2">Электричество</th>
                  <th className="px-4 sm:px-5 py-2">Статус</th>
                </tr>
              </thead>
              <tbody>
                {meterHistoryLoading ? (
                  <tr>
                    <td className="px-4 sm:px-5 py-3 text-[var(--color-ink-soft)]" colSpan={5}>
                      Загружаем историю показаний...
                    </td>
                  </tr>
                ) : meterHistoryError ? (
                  <tr>
                    <td className="px-4 sm:px-5 py-3 text-accent" colSpan={5}>
                      {meterHistoryError}
                    </td>
                  </tr>
                ) : meterHistorySorted.length === 0 ? (
                  <tr>
                    <td className="px-4 sm:px-5 py-3 text-[var(--color-ink-soft)]" colSpan={5}>
                      Пока нет переданных показаний
                    </td>
                  </tr>
                ) : (
                  meterHistorySorted.map((row) => (
                    <tr key={row.id} className="border-b border-[color:var(--color-info-border)] hover:bg-[var(--color-info-surface)]">
                      <td className="px-4 sm:px-5 py-2 font-medium text-[var(--color-ink)]">
                        {formatMeterDate(row.createdAt)}
                      </td>
                      <td className="px-4 sm:px-5 py-2 text-[var(--color-ink-soft)]">{row.hotWater} м³</td>
                      <td className="px-4 sm:px-5 py-2 text-[var(--color-ink-soft)]">{row.coldWater} м³</td>
                      <td className="px-4 sm:px-5 py-2 text-[var(--color-ink-soft)]">{row.electricity} кВт⋅ч</td>
                      <td className="px-4 sm:px-5 py-2">
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-[11px] sm:text-xs font-medium">
                          Принято
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
