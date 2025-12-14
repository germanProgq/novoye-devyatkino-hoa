import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MeterRecord } from '../types';

const API_BASE_URL = (
  import.meta.env.VITE_BACKEND_URL
    ? String(import.meta.env.VITE_BACKEND_URL)
    : 'http://localhost:8080'
).replace(/\/$/, '');

const apiFetch = (input: string, init: RequestInit = {}) => fetch(input, { credentials: 'include', ...init });

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

const MeterReadings: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });
  const [form, setForm] = useState({
    hotWater: '',
    coldWater: '',
    electricity: '',
  });
  const [meterReadings, setMeterReadings] = useState<MeterRecord[]>([]);
  const [meterLoading, setMeterLoading] = useState(false);
  const [meterLoadError, setMeterLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useLayoutEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return undefined;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setSize({
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height)),
      });
    };

    updateSize();

    if (typeof ResizeObserver === 'undefined') {
      const id = window.setTimeout(updateSize, 0);
      return () => window.clearTimeout(id);
    }

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
  }, []);

  const loadMeters = useCallback(async () => {
    setMeterLoading(true);
    setMeterLoadError(null);
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/meters`);
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }
      const payload = await response.json();
      const list = Array.isArray(payload.readings) ? payload.readings : Array.isArray(payload) ? payload : [];
      setMeterReadings(list.map(mapApiMeterRecord));
    } catch (err) {
      console.error(err);
      setMeterLoadError('Не удалось загрузить историю показаний');
    } finally {
      setMeterLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeters();
  }, [loadMeters]);

  const meterHistorySorted = useMemo(() => {
    const toTs = (value?: string) => {
      if (!value) return 0;
      const ts = new Date(value).getTime();
      return Number.isNaN(ts) ? 0 : ts;
    };
    return [...meterReadings].sort((a, b) => toTs(b.createdAt) - toTs(a.createdAt));
  }, [meterReadings]);

  const chartData = useMemo(
    () =>
      [...meterHistorySorted].reverse().map((row, idx) => ({
        month: formatMeterLabel(row.createdAt) || `Запись ${idx + 1}`,
        electricity: row.electricity,
      })),
    [meterHistorySorted],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitStatus(null);

    const hot = Number.parseFloat(form.hotWater);
    const cold = Number.parseFloat(form.coldWater);
    const elec = Number.parseFloat(form.electricity);

    if (!Number.isFinite(hot) || !Number.isFinite(cold) || !Number.isFinite(elec)) {
      setSubmitError('Укажите корректные значения счётчиков');
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/meters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotWater: hot, coldWater: cold, electricity: elec }),
      });
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }
      setSubmitStatus('Показания успешно отправлены');
      setForm({ hotWater: '', coldWater: '', electricity: '' });
      await loadMeters();
    } catch (err) {
      console.error(err);
      setSubmitError('Не удалось отправить показания. Попробуйте позже.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasChartSpace = width > 0 && height > 0;
  const hasChartData = hasChartSpace && chartData.length > 0;
  const currentPeriodLabel = useMemo(() => {
    const month = new Date().toLocaleDateString('ru-RU', { month: 'long' });
    if (!month) return 'Текущий период';
    return month.charAt(0).toUpperCase() + month.slice(1);
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[var(--color-ink)]">Показания счетчиков</h1>
        <p className="text-[var(--color-ink-soft)]">Передавайте показания с 20 по 25 число каждого месяца.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm p-6 lg:col-span-1 backdrop-blur-sm">
          <h2 className="text-lg font-bold text-[var(--color-ink)] mb-4">Текущий период: {currentPeriodLabel}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-soft)] mb-1">Горячая вода (м³)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  className="w-full pl-10 pr-4 py-2 border border-[color:var(--color-info-border)] rounded-lg focus:ring-primary/40 focus:border-primary bg-white text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)] placeholder:opacity-60 placeholder:italic"
                  placeholder="Пред.: 6.1"
                  value={form.hotWater}
                  onChange={(e) => setForm({ ...form, hotWater: e.target.value })}
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
                  value={form.coldWater}
                  onChange={(e) => setForm({ ...form, coldWater: e.target.value })}
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
                  value={form.electricity}
                  onChange={(e) => setForm({ ...form, electricity: e.target.value })}
                  required
                />
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-primary">bolt</span>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary hover:bg-accent text-primary-contrast font-medium py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-70"
              >
                {submitting ? 'Отправляем...' : 'Отправить показания'}
              </button>
            </div>
            {submitStatus && <p className="text-sm text-[var(--color-ink)] text-center">{submitStatus}</p>}
            {submitError && <p className="text-sm text-accent text-center">{submitError}</p>}
            <p className="text-xs text-center text-[var(--color-ink-soft)] mt-2">
              Следующая передача: через 20 дней
            </p>
          </form>
        </div>

        {/* Chart */}
        <div className="bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm p-4 sm:p-6 lg:col-span-2 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-[var(--color-ink)]">Динамика потребления (Электричество)</h3>
          </div>
          <div className="-mx-5 sm:-mx-8">
            <div ref={chartContainerRef} className="h-64 sm:h-72 w-full min-w-0">
              {!hasChartSpace ? (
                <div className="flex h-full items-center justify-center text-sm text-[var(--color-ink-soft)]">
                  Загружаем график...
                </div>
              ) : hasChartData ? (
                <ResponsiveContainer width={width} height={height}>
                  <AreaChart data={chartData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorElec" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-forest)" stopOpacity={0.16}/>
                        <stop offset="95%" stopColor="var(--color-forest)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{fill: '#3b4a3b', fontSize: 12}}
                      padding={{ left: 0, right: 0 }}
                    />
                    <YAxis width={32} tickMargin={6} axisLine={false} tickLine={false} tick={{fill: '#3b4a3b', fontSize: 12}} />
                    <CartesianGrid vertical={false} stroke="rgba(175, 194, 215, 0.6)" strokeDasharray="3 3"/>
                    <Tooltip 
                       contentStyle={{ borderRadius: '10px', border: '1px solid rgba(175, 194, 215, 0.45)', boxShadow: '0 10px 30px rgba(47, 58, 42, 0.12)' }}
                    />
                    <Area type="monotone" dataKey="electricity" stroke="var(--color-forest)" strokeWidth={2} fillOpacity={1} fill="url(#colorElec)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[var(--color-ink-soft)]">
                  {meterLoading ? 'Загружаем данные...' : meterLoadError || 'Пока нет данных по показаниям'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm overflow-hidden backdrop-blur-sm">
        <div className="px-6 py-4 border-b border-[color:var(--color-info-border)]">
          <h3 className="font-bold text-[var(--color-ink)]">История показаний</h3>
        </div>
        <div className="overflow-x-auto hide-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[var(--color-ink)] uppercase bg-[var(--color-info-surface)]">
              <tr>
                <th className="px-6 py-3">Месяц</th>
                <th className="px-6 py-3">Горячая вода</th>
                <th className="px-6 py-3">Холодная вода</th>
                <th className="px-6 py-3">Электричество</th>
                <th className="px-6 py-3">Статус</th>
              </tr>
            </thead>
            <tbody>
              {meterLoading ? (
                <tr>
                  <td className="px-6 py-4 text-[var(--color-ink-soft)]" colSpan={5}>
                    Загружаем историю показаний...
                  </td>
                </tr>
              ) : meterLoadError ? (
                <tr>
                  <td className="px-6 py-4 text-accent" colSpan={5}>
                    {meterLoadError}
                  </td>
                </tr>
              ) : meterHistorySorted.length === 0 ? (
                <tr>
                  <td className="px-6 py-4 text-[var(--color-ink-soft)]" colSpan={5}>
                    Пока нет переданных показаний
                  </td>
                </tr>
              ) : (
                meterHistorySorted.map((row) => (
                  <tr key={row.id} className="border-b border-[color:var(--color-info-border)] hover:bg-white/70">
                    <td className="px-6 py-4 font-medium text-[var(--color-ink)]">{formatMeterDate(row.createdAt)}</td>
                    <td className="px-6 py-4 text-[var(--color-ink-soft)]">{row.hotWater} м³</td>
                    <td className="px-6 py-4 text-[var(--color-ink-soft)]">{row.coldWater} м³</td>
                    <td className="px-6 py-4 text-[var(--color-ink-soft)]">{row.electricity} кВт⋅ч</td>
                    <td className="px-6 py-4">
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium">
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
  );
};

export default MeterReadings;
