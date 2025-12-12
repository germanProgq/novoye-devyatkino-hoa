export type AboutLink = {
  slug: string;
  label: string;
  icon: string;
};

export const ABOUT_LINKS: AboutLink[] = [
  { slug: 'svedeniya', label: 'Сведения о ТСЖ', icon: 'description' },
  { slug: 'pravlenie', label: 'Правление ТСЖ', icon: 'groups' },
  { slug: 'sotrudniki', label: 'Сотрудники ТСЖ', icon: 'badge' },
  { slug: 'rekvizity', label: 'Реквизиты и контакты', icon: 'receipt_long' },
  { slug: 'istoriya', label: 'Историческая справка', icon: 'history' },
  // { slug: 'fotogalereya', label: 'Фотогалерея', icon: 'collections' },
];

export type House = {
  name: string;
  area: number;
  note?: string;
};

export const HOUSES: House[] = [
  { name: 'Дом 75 корпус 1', area: 1342.9 },
  { name: 'Дом 75 корпус 2', area: 1348.3 },
  { name: 'Дом 75 корпус 3', area: 1180.2 },
  { name: 'Дом 75 корпус 4', area: 503.6 },
  { name: 'Дом 75 корпус 5', area: 1817.7 },
  { name: 'Дом 75 корпус 6', area: 1525.4 },
  { name: 'Дом 75 корпус 7', area: 1341.8 },
  { name: 'Дом 75 корпус 8', area: 1346.4 },
  { name: 'Дом 75 корпус 9', area: 1181.0 },
  { name: 'Дом 75 корпус 10', area: 1341.2 },
  { name: 'Дом 75 корпус 11', area: 831.5 },
  { name: 'Дом 75 корпус 12', area: 842.0 },
  { name: 'Дом 75 корпус 13', area: 444.3 },
  { name: 'Дом 75 корпус 14', area: 441.4 },
  { name: 'Дом 75 корпус 15', area: 406.4, note: 'одноквартирный дом' },
];

export const TOTAL_HOUSE_AREA = HOUSES.reduce((sum, house) => sum + house.area, 0);

export type BoardMember = {
  name: string;
  phone: string;
  email?: string;
  note?: string;
};

export type BoardChair = BoardMember & {
  role: string;
  schedule: string;
};

export const BOARD_CHAIR: BoardChair = {
  role: 'Председатель правления',
  name: 'Васильев Илья Анатольевич',
  phone: '8 (921) 939 55 70',
  email: 'v_ilya@inbox.ru',
  schedule: 'Вторник, 20:00–21:00',
};

export const BOARD_MEMBERS: BoardMember[] = [
  { name: 'Базаров Владимир Борисович', phone: '8 (921) 965 59 95' },
  { name: 'Брайцев Алексей Валерьевич', phone: '+7 (905) 223 05 05', email: 'braicev@mail.ru' },
  { name: 'Галимов Тимур Ильич', phone: '+7 (921) 306 06 06' },
  { name: 'Ершов Денис Викторович', phone: '+7 (911) 911 94 37' },
  { name: 'Куликов Дмитрий Александрович', phone: '+7 (911) 990 50 47' },
  { name: 'Мельников Максим Андреевич', phone: '+7 (965) 777 80 00' },
];

export type StaffMember = {
  role: string;
  name?: string;
  phone: string;
  icon: string;
  email?: string;
  schedule?: string;
  secondaryPhone?: string;
  note?: string;
  category?: 'management' | 'security' | 'service';
};

export const STAFF_MEMBERS: StaffMember[] = [
  {
    role: 'Председатель ТСЖ',
    name: 'Васильев Илья Анатольевич',
    phone: '+7 (921) 939-55-70',
    email: 'v_ilya@inbox.ru',
    schedule: 'Вторник с 20:00 до 21:00',
    icon: 'workspace_premium',
    category: 'management',
  },
  {
    role: 'Главный бухгалтер ТСЖ',
    name: 'Баруздина Алевтина Юрьевна',
    phone: '640-36-20',
    email: 'devytkino75@yandex.ru',
    schedule: 'Вторник 18:00–20:00, четверг 11:00–13:00',
    icon: 'account_balance_wallet',
    category: 'management',
  },
  {
    role: 'Охрана',
    name: 'Пост охраны',
    phone: '640-08-42',
    secondaryPhone: '+7 (964) 361-87-48',
    schedule: 'Круглосуточно',
    note: 'Оперативная связь и вызов группы быстрого реагирования при необходимости.',
    icon: 'shield_person',
    category: 'security',
  },
  {
    role: 'Электрик',
    name: 'Полозов Игорь Валентинович',
    phone: '8 (911) 259-08-68',
    icon: 'bolt',
    category: 'service',
  },
  {
    role: 'Сантехник',
    name: 'Шумилов Игорь Игоревич',
    phone: '8 (921) 371-05-39',
    icon: 'water_drop',
    category: 'service',
  },
  {
    role: 'Дворник',
    name: 'Щербак Олег Владимирович',
    phone: '8 (950) 028-81-20',
    icon: 'cleaning_services',
    category: 'service',
  },
];

export type ContactChannel = {
  label: string;
  value: string;
  icon: string;
  href?: string;
};

export type WorkingHour = {
  label: string;
  time: string;
  note?: string;
  icon?: string;
};

export const ABOUT_CONTACTS = {
  name: 'ТСЖ «Новое Девяткино 75»',
  address: 'Ленинградская обл., Всеволожский р-н, деревня Новое Девяткино, дом 75-А',
  phones: [
    { label: 'Офис', value: '+7 (812) 640-36-20', icon: 'call' },
    { label: 'Бухгалтерия', value: '+7 (812) 640-36-20', icon: 'call' },
    { label: 'Бухгалтерия (моб.)', value: '+7 (921) 939-55-70', icon: 'smartphone' },
  ] as ContactChannel[],
  email: { label: 'E-mail', value: 'devytkino75@yandex.ru', icon: 'mail' } as ContactChannel,
};

export const ABOUT_SCHEDULE: WorkingHour[] = [
  { label: 'Вт', time: '20:00–21:00', note: 'Председатель правления', icon: 'workspace_premium' },
  { label: 'Вт', time: '18:00–20:00', note: 'Бухгалтерия', icon: 'account_balance_wallet' },
  { label: 'Чт', time: '11:00–13:00', note: 'Бухгалтерия', icon: 'account_balance_wallet' },
  { label: 'Пн–Вс', time: '00:00–24:00', note: 'Охрана', icon: 'shield_person' },
];

export const ABOUT_REQUISITES = {
  inn: '4703112280',
  kpp: '470301001',
  account: '40703810555410000078',
  bank: 'Северо-Западный банк ПАО Сбербанк г. Санкт-Петербург',
  bic: '044030653',
  correspondentAccount: '30101810500000000653',
  legalAddress: 'Ленинградская обл., Всеволожский р-н, деревня Новое Девяткино, дом 75-А',
  director: 'Васильев Илья Анатольевич',
};

export type HistorySection = {
  title: string;
  icon: string;
  badge?: string;
  paragraphs: string[];
  list?: string[];
};

export const HISTORY_SECTIONS: HistorySection[] = [
  {
    title: 'Перенос деревни и новое название',
    icon: 'history',
    badge: '1888 год',
    paragraphs: [
      'Деревня Девяткина находилась в Токсовской волости Шлиссельбургского уезда, но в 1887–1888 годах на месте прежнего поселения был устроен военный полигон, и земля передана под артиллерийское опытное поле.',
      'По предписанию от 10 февраля 1888 года деревню перенесли в Петербургский уезд, на территорию нынешнего Нового Девяткино. После переселения к названию добавилось слово «Новое».',
    ],
  },
  {
    title: 'Присоединение к Муринской волости',
    icon: 'map',
    badge: 'Постановление 10.02.1888',
    paragraphs: [
      'Губернское присутствие постановило присоединить Новое Девяткино к Муринской волости Санкт-Петербургского уезда, исходя из территориального положения деревни.',
      'На момент переселения числилось 60 душ мужского пола и 58 женского, всего 27 дворов. Каждому хозяйству выделили по 10 десятин земли, территория под новое поселение составила 1024 кв. сажени.',
    ],
  },
  {
    title: 'Наследие и герб поселения',
    icon: 'flag',
    paragraphs: [
      'Герб МО «Новодевяткинское сельское поселение» зарегистрирован Российским Геральдическим советом и отражает ингерманландскую историю деревни и сельское прошлое.',
    ],
    list: [
      'Серебряные вырубные кресты — память об ингерманландских финнах, живших здесь с 1888 по 1942 гг.',
      'Золотая дева с колосьями — символ сельскохозяйственного прошлого (колхоз «Новая Уртая», 1930 г.).',
      'Лазоревое поле — река Охта и Капральев ручей, напоминание о болотистых землях до мелиорации.',
      'Червленая мурованная стена — символ новостроек и активного строительства 1970–1980-х.',
    ],
  },
  {
    title: 'Цвета герба и их значение',
    icon: 'palette',
    paragraphs: ['Цвета герба соответствуют геральдическим цветам Ленинградской области и Всеволожского района.'],
    list: [
      'Лазоревый — истина, чистое небо, верность, искренность.',
      'Червлёный — мужество, труд, солнце и тепло.',
      'Серебро — чистота помыслов, откровенность, надежда.',
      'Золото — прочность, справедливость, благодать и свет.',
    ],
  },
  {
    title: 'Развитие и современность',
    icon: 'apartment',
    paragraphs: [
      'После Великой Отечественной войны проведены мелиоративные работы, превратившие болота в сельхозугодья. В 1970–1980-х годах построены новые кварталы многоэтажных домов.',
      'Сегодня Новое Девяткино — административный центр муниципалитета во Всеволожском районе. Площадь — 577 га; на 31.12.2007 зарегистрировано 10 207 жителей, из них 137 — частный сектор и 10 070 — многоквартирные дома. В посёлке 25 многоэтажных домов общей площадью 222,4 тыс. кв. м и 42 частных дома.',
    ],
  },
];
