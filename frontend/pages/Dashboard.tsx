import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { AccountDebtEntry, AccountDebtSummary, MeterReading } from '../types';

const API_BASE_URL = (
  import.meta.env.VITE_BACKEND_URL
    ? String(import.meta.env.VITE_BACKEND_URL)
    : 'http://localhost:8080'
).replace(/\/$/, '');
const apiFetch = (input: string, init: RequestInit = {}) => fetch(input, { credentials: 'include', ...init });
const formatCurrency = (value: number) => `${value.toLocaleString('ru-RU')} ₽`;

const data = [
  { name: 'Май', amount: 4500 },
  { name: 'Июнь', amount: 3200 },
  { name: 'Июль', amount: 2800 },
  { name: 'Август', amount: 2900 },
  { name: 'Сентябрь', amount: 4100 },
  { name: 'Октябрь', amount: 5200 },
];

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

const historyData: MeterReading[] = [
  { id: 1, month: 'Май', hotWater: 5.2, coldWater: 8.1, electricity: 120, status: 'Принято' },
  { id: 2, month: 'Июнь', hotWater: 4.8, coldWater: 7.9, electricity: 115, status: 'Принято' },
  { id: 3, month: 'Июль', hotWater: 3.5, coldWater: 6.5, electricity: 90, status: 'Принято' },
  { id: 4, month: 'Август', hotWater: 4.0, coldWater: 7.0, electricity: 95, status: 'Принято' },
  { id: 5, month: 'Сентябрь', hotWater: 5.5, coldWater: 8.5, electricity: 130, status: 'Принято' },
  { id: 6, month: 'Октябрь', hotWater: 6.1, coldWater: 9.0, electricity: 145, status: 'Принято' },
];

const Dashboard: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });
  const [debtSummary, setDebtSummary] = useState<AccountDebtSummary | null>(null);
  const [debtLoading, setDebtLoading] = useState(true);
  const [debtError, setDebtError] = useState<string | null>(null);
  const [meterForm, setMeterForm] = useState({ hotWater: '', coldWater: '', electricity: '' });
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
  }, []);

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
  }, []);

  const linkedDebts = debtSummary?.links ?? [];
  const totalDebt = debtSummary?.totalDebt ?? 0;
  const hasLinks = linkedDebts.length > 0;
  const latestUpdate = linkedDebts.find((entry) => entry.updatedAt)?.updatedAt || '';
  const hasMeterChart = meterW > 0 && meterH > 0;

  const handleMeterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Показания успешно отправлены!');
    setMeterForm({ hotWater: '', coldWater: '', electricity: '' });
  };

  return (
    <div className="space-y-6">
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

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[var(--color-info-surface)] p-6 rounded-xl border border-[color:var(--color-info-border)] shadow-sm flex items-start justify-between backdrop-blur-sm">
          <div>
            <p className="text-sm font-medium text-[var(--color-ink-soft)]">Текущая задолженность</p>
            <h3 className="text-2xl font-bold text-[var(--color-ink)] mt-1">{debtLoading ? '—' : formatCurrency(totalDebt)}</h3>
            <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full mt-2 inline-block">
              {hasLinks ? 'По вашим привязкам' : 'Нет привязок'}
            </span>
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
            <span className="text-xs text-[var(--color-ink-soft)] mt-2 inline-block">{debtLoading ? 'Обновляем' : 'Данные синхронизированы'}</span>
          </div>
          <div className="p-3 bg-primary/10 text-primary rounded-lg border border-[color:var(--color-info-border)]">
            <span className="material-symbols-outlined">update</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cashflow chart */}
        <div className="bg-[var(--color-info-surface)] p-6 rounded-xl border border-[color:var(--color-info-border)] shadow-sm backdrop-blur-sm min-w-0">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-[var(--color-ink)]">Расходы за 6 месяцев</h3>
            <select className="text-sm border-[color:var(--color-info-border)] rounded-md text-[var(--color-ink)] bg-white focus:border-primary focus:ring-primary/30">
              <option>Все услуги</option>
              <option>Вода</option>
              <option>Свет</option>
            </select>
          </div>
          <div ref={chartContainerRef} className="h-72 w-full min-w-0">
            {width > 0 && height > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  barCategoryGap="8%"
                  barGap={6}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(175, 194, 215, 0.6)" />
                  <XAxis
                    dataKey="name"
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
                    contentStyle={{ borderRadius: '10px', border: '1px solid rgba(175, 194, 215, 0.45)', boxShadow: '0 10px 30px rgba(47, 58, 42, 0.12)' }}
                  />
                  <Bar dataKey="amount" fill="var(--color-forest)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[var(--color-ink-soft)]">
                Загружаем график...
              </div>
            )}
          </div>
        </div>

        {/* Meter chart */}
        <div className="bg-[var(--color-info-surface)] rounded-xl border border-[color:var(--color-info-border)] shadow-sm p-4 sm:p-6 backdrop-blur-sm min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[var(--color-ink)]">Динамика потребления (Электричество)</h3>
          </div>
          <div ref={meterChartRef} className="h-64 sm:h-72 w-full min-w-0">
            {hasMeterChart ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorElec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-forest)" stopOpacity={0.16} />
                      <stop offset="95%" stopColor="var(--color-forest)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#3b4a3b', fontSize: 12 }} />
                  <YAxis width={32} tickMargin={6} axisLine={false} tickLine={false} tick={{ fill: '#3b4a3b', fontSize: 12 }} />
                  <CartesianGrid vertical={false} stroke="rgba(175, 194, 215, 0.6)" strokeDasharray="3 3" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid rgba(175, 194, 215, 0.45)',
                      boxShadow: '0 10px 30px rgba(47, 58, 42, 0.12)',
                    }}
                  />
                  <Area type="monotone" dataKey="electricity" stroke="var(--color-forest)" strokeWidth={2} fillOpacity={1} fill="url(#colorElec)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[var(--color-ink-soft)]">
                Загружаем график...
              </div>
            )}
          </div>
        </div>
      </div>

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
                  className="w-full pl-10 pr-4 py-2 border border-[color:var(--color-info-border)] rounded-lg focus:ring-primary/40 focus:border-primary bg-white text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)]"
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
                  className="w-full pl-10 pr-4 py-2 border border-[color:var(--color-info-border)] rounded-lg focus:ring-primary/40 focus:border-primary bg-white text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)]"
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
                  className="w-full pl-10 pr-4 py-2 border border-[color:var(--color-info-border)] rounded-lg focus:ring-primary/40 focus:border-primary bg-white text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)]"
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
              className="w-full bg-primary hover:bg-accent text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm"
            >
              Отправить показания
            </button>
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
                {[...historyData].reverse().map((row) => (
                  <tr key={row.id} className="border-b border-[color:var(--color-info-border)] hover:bg-white/70">
                    <td className="px-4 sm:px-5 py-2 font-medium text-[var(--color-ink)]">{row.month}</td>
                    <td className="px-4 sm:px-5 py-2 text-[var(--color-ink-soft)]">{row.hotWater} м³</td>
                    <td className="px-4 sm:px-5 py-2 text-[var(--color-ink-soft)]">{row.coldWater} м³</td>
                    <td className="px-4 sm:px-5 py-2 text-[var(--color-ink-soft)]">{row.electricity} кВт⋅ч</td>
                    <td className="px-4 sm:px-5 py-2">
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-[11px] sm:text-xs font-medium">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
