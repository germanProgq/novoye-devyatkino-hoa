export type Feature = {
  title: string;
  description: string;
  icon: string;
};

export type ContactDetail = {
  label: string;
  value: string;
};

export type Contact = {
  title: string;
  icon: string;
  details: ContactDetail[];
};

export type BillingItem = {
  title: string;
  amount: string;
  status: string;
  icon: string;
};

export const HERO_IMAGES = [
  '/images/hero/hero-1.png',
  '/images/hero/hero-3.jpg',
  '/images/hero/hero-4.png',
];

export const FEATURES: Feature[] = [
  {
    title: 'Прозрачные платежи',
    description: 'Понимайте, за что вы платите: история начислений, статусы оплат и квитанции всегда под рукой.',
    icon: 'receipt_long',
  },
  {
    title: 'Передача показаний',
    description: 'Передавайте показания счётчиков без звонков и визитов, получайте уведомления о сроках.',
    icon: 'speed',
  },
  {
    title: 'Документы и новости',
    description: 'Важные объявления, протоколы собраний и договоры хранятся в одном месте.',
    icon: 'article',
  },
];

export const HOW_IT_WORKS_STEPS = [
  'Создайте аккаунт и подтвердите квартиру',
  'Передавайте показания и получайте квитанции онлайн',
  'Отслеживайте заявки и новости дома в одном месте',
];

export const BILLING_ITEMS: BillingItem[] = [
  { title: 'Квитанция за Октябрь', amount: '5 200 ₽', status: 'Оплачено', icon: 'payments' },
  { title: 'Содержание жилья', amount: '1 800 ₽', status: 'Готово к оплате', icon: 'home' },
  { title: 'Электроэнергия', amount: '950 ₽', status: 'Ждёт показания', icon: 'bolt' },
];

export const CONTACTS: Contact[] = [
  {
    title: 'Председатель ТСЖ',
    icon: 'badge',
    details: [
      { label: 'Телефон', value: '+7 (921) 939-55-70' },
      { label: 'Время', value: 'вт. 20:00–21:00' },
    ],
  },
  {
    title: 'Главный бухгалтер',
    icon: 'account_balance',
    details: [
      { label: 'Телефон', value: '+7 (812) 640-36-20' },
      { label: 'Email', value: 'devytkino75@yandex.ru' },
      { label: 'Время', value: 'вт. 18:00–20:00, чт. 11:00–13:00' },
    ],
  },
  {
    title: 'Охрана',
    icon: 'shield_person',
    details: [
      { label: 'Оперативная связь', value: '+7 (964) 361-87-486' },
      { label: 'Телефон', value: '+7 (812) 640-08-42' },
    ],
  },
  {
    title: 'Электрик',
    icon: 'bolt',
    details: [{ label: 'Телефон', value: '+7 (911) 259-08-68' }],
  },
  {
    title: 'Сантехник',
    icon: 'build',
    details: [{ label: 'Телефон', value: '+7 (921) 371-05-39' }],
  },
  {
    title: 'Дворник',
    icon: 'yard',
    details: [{ label: 'Телефон', value: '+7 (950) 028-81-20' }],
  },
];
