import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const data = [
  { name: 'Май', amount: 4500 },
  { name: 'Июнь', amount: 3200 },
  { name: 'Июль', amount: 2800 },
  { name: 'Август', amount: 2900 },
  { name: 'Сентябрь', amount: 4100 },
  { name: 'Октябрь', amount: 5200 },
];

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[var(--color-ink)]">Обзор</h1>
        <p className="text-[var(--color-ink-soft)]">Добро пожаловать, Александр. У вас нет задолженностей.</p>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--color-info-surface)] p-6 rounded-xl border border-[color:var(--color-info-border)] shadow-sm flex items-start justify-between backdrop-blur-sm">
          <div>
            <p className="text-sm font-medium text-[var(--color-ink-soft)]">Баланс счета</p>
            <h3 className="text-2xl font-bold text-[var(--color-ink)] mt-1">0.00 ₽</h3>
            <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full mt-2 inline-block">Оплачено</span>
          </div>
          <div className="p-3 bg-white text-primary rounded-lg border border-[color:var(--color-info-border)]">
            <span className="material-symbols-outlined">account_balance_wallet</span>
          </div>
        </div>

        <div className="bg-[var(--color-info-surface)] p-6 rounded-xl border border-[color:var(--color-info-border)] shadow-sm flex items-start justify-between backdrop-blur-sm">
          <div>
            <p className="text-sm font-medium text-[var(--color-ink-soft)]">След. платеж</p>
            <h3 className="text-2xl font-bold text-[var(--color-ink)] mt-1">25 ноября</h3>
            <span className="text-xs text-[var(--color-ink-soft)] mt-2 inline-block">Ожидается квитанция</span>
          </div>
          <div className="p-3 bg-accent/20 text-accent rounded-lg border border-[color:var(--color-info-border)]">
            <span className="material-symbols-outlined">calendar_month</span>
          </div>
        </div>

        <div className="bg-[var(--color-info-surface)] p-6 rounded-xl border border-[color:var(--color-info-border)] shadow-sm flex items-start justify-between backdrop-blur-sm">
          <div>
            <p className="text-sm font-medium text-[var(--color-ink-soft)]">Активные заявки</p>
            <h3 className="text-2xl font-bold text-[var(--color-ink)] mt-1">1</h3>
            <span className="text-xs text-primary mt-2 inline-block cursor-pointer hover:underline">Посмотреть статус</span>
          </div>
          <div className="p-3 bg-primary/10 text-primary rounded-lg border border-[color:var(--color-info-border)]">
            <span className="material-symbols-outlined">build</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="bg-[var(--color-info-surface)] p-6 rounded-xl border border-[color:var(--color-info-border)] shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-[var(--color-ink)]">Расходы за 6 месяцев</h3>
            <select className="text-sm border-[color:var(--color-info-border)] rounded-md text-[var(--color-ink)] bg-white focus:border-primary focus:ring-primary/30">
              <option>Все услуги</option>
              <option>Вода</option>
              <option>Свет</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(175, 194, 215, 0.6)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#3b4a3b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#3b4a3b', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: 'rgba(175, 194, 215, 0.12)'}}
                  contentStyle={{ borderRadius: '10px', border: '1px solid rgba(175, 194, 215, 0.45)', boxShadow: '0 10px 30px rgba(47, 58, 42, 0.12)' }}
                />
                <Bar dataKey="amount" fill="var(--color-forest)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-[var(--color-info-surface)] p-6 rounded-xl border border-[color:var(--color-info-border)] shadow-sm backdrop-blur-sm">
          <h3 className="font-semibold text-[var(--color-ink)] mb-4">Последние события</h3>
          <div className="space-y-4">
            {[
              { title: 'Оплата квитанции за Октябрь', date: '28 октября, 10:42', amount: '-5,200 ₽', icon: 'payments', color: 'text-primary', bg: 'bg-primary/10' },
              { title: 'Передача показаний (Вода)', date: '24 октября, 18:30', icon: 'water_drop', color: 'text-accent', bg: 'bg-accent/20' },
              { title: 'Создана заявка #124', date: '15 октября, 09:15', icon: 'confirmation_number', color: 'text-primary', bg: 'bg-primary/10' },
              { title: 'Собрание жильцов', date: '10 октября, 19:00', icon: 'groups', color: 'text-primary', bg: 'bg-primary/10' },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.bg} ${item.color}`}>
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--color-ink)]">{item.title}</p>
                  <p className="text-xs text-[var(--color-ink-soft)]">{item.date}</p>
                </div>
                {item.amount && <span className="text-sm font-bold text-[var(--color-ink)]">{item.amount}</span>}
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2 text-sm text-primary font-medium hover:bg-accent/10 rounded-lg transition-colors">
            Показать всю историю
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
