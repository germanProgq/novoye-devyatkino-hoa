export type InfoLink = {
  slug: string;
  label: string;
  icon: string;
};

export const INFO_LINKS: InfoLink[] = [
  { slug: 'poryadok-uslug', label: 'Порядок оказания услуг', icon: 'rule' },
  { slug: 'tarify', label: 'Тарифы на коммунальные услуги', icon: 'receipt' },
  { slug: 'poleznye-telefony', label: 'Полезные телефоны', icon: 'call' },
  { slug: 'poleznye-sayty', label: 'Полезные сайты', icon: 'public' },
  { slug: 'kontakty-tszh', label: 'Контакты ТСЖ', icon: 'apartment' },
  { slug: 'vopros-pravleniyu', label: 'Задать вопрос правлению', icon: 'forum' },
];

export type PhoneEntry = {
  title: string;
  icon: string;
  phones: string[];
  description?: string;
  person?: string;
  address?: string;
  schedule?: string;
  note?: string;
};

export type PhoneCategory = {
  title: string;
  icon: string;
  highlight?: string;
  items: PhoneEntry[];
};

export const PHONE_CATEGORIES: PhoneCategory[] = [
  {
    title: 'Безопасность и экстренные службы',
    icon: 'shield_person',
    highlight: 'Круглосуточные номера и дежурные службы',
    items: [
      {
        title: 'Полиция — 87 отделение',
        icon: 'local_police',
        phones: ['8 (81370) 93-202'],
        person: 'Участковый полиции: Суворин Николай Алексеевич (87 отдел полиции УМВД)',
        address: 'Опорный пункт: Девяткино, дом 93 (домофон 02); фактический адрес: пос. Кузьмоловский, ул. Школьная, 13',
        schedule: 'Ежедневно 9:00–18:00, приемные дни вторник–четверг 18:00–20:00',
      },
      {
        title: 'МЧС',
        icon: 'emergency',
        phones: ['01', '112'],
        description: 'Единый номер для вызова спасателей и пожарных',
      },
      {
        title: 'Группа быстрого реагирования (охрана ТСЖ)',
        icon: 'security',
        phones: ['640-08-42', '+7 (964) 361-87-48'],
        schedule: 'Круглосуточно',
        note: 'Вызов группы быстрого реагирования в случае конфликта.',
      },
      {
        title: 'Скорая помощь',
        icon: 'medical_services',
        phones: ['8 (813) 705-66-03', '296-99-61'],
      },
      {
        title: 'Пожарная часть №94 (Токсово)',
        icon: 'fire_hydrant',
        phones: ['8 (81370) 57-601'],
      },
    ],
  },
  {
    title: 'Муниципальные услуги и приём',
    icon: 'apartment',
    highlight: 'МО «Новодевяткинское сельское поселение»',
    items: [
      {
        title: 'Администрация МО «Новодевяткинское сельское поселение»',
        icon: 'domain',
        phones: ['8 (812) 595-74-44', '8 (81370) 65-560'],
        address: '188661, Ленинградская обл., Всеволожский р-н, дер. Новое Девяткино, д. 57, офис 83–84',
        description: 'Приёмная администрация, общие вопросы',
        note: 'email: info@novoedevyatkino.ru',
      },
      {
        title: 'Глава муниципального образования',
        icon: 'person',
        person: 'Майоров Дмитрий Анатольевич (каб. №1)',
        phones: ['8 (812) 595-74-44'],
        schedule: 'Понедельник 14:00–17:00, в другие дни по записи',
      },
      {
        title: 'Заместитель главы по развитию ЖКХ, ГО и ЧС',
        icon: 'engineering',
        person: 'Поспелов Анатолий Леонидович (каб. №3)',
        phones: ['8 (812) 595-74-44'],
        schedule: 'Пн–Пт 9:00–17:00, обед 13:00–14:00, кроме сб/вс',
      },
      {
        title: 'Заместитель по общим и орг. вопросам',
        icon: 'group',
        person: 'Купина Ирина Вениаминовна (каб. №7)',
        phones: ['8 (812) 595-74-44'],
        schedule: 'Пн–Пт 9:00–17:00, обед 13:00–14:00, кроме сб/вс',
      },
      {
        title: 'Отдел архитектуры, градостроительства и землеустройства',
        icon: 'architecture',
        person: 'Главный архитектор: Буник Ольга Александровна; главный специалист: Горбина Наталья Алексеевна (каб. №6)',
        phones: ['8 (812) 595-74-44'],
        schedule: 'Пн–Пт 9:00–17:00, обед 13:00–14:00, кроме сб/вс',
      },
      {
        title: 'Отдел культуры, образования, спорта и СМИ',
        icon: 'emoji_events',
        person: 'Костина Людмила Викторовна (каб. №6)',
        phones: ['8 (812) 595-74-44'],
        schedule: 'Пн–Пт 9:00–17:00, обед 13:00–14:00, кроме сб/вс',
      },
      {
        title: 'Главный специалист по жилищным вопросам',
        icon: 'home',
        person: 'Кривошеева Татьяна Анатольевна (дом №57а, каб. №3)',
        phones: ['8 (812) 595-74-44'],
        schedule: 'Пн 9:00–17:00, Ср 14:00–17:00, Чт 9:00–17:00; обед 13:00–14:00',
      },
      {
        title: 'Инспектор военно-учётного стола',
        icon: 'badge',
        person: 'Рухлевич Татьяна Михайловна (дом №57а)',
        phones: ['8 (812) 595-53-13'],
        schedule: 'Пн 9:00–17:00, обед 13:00–14:00; другие дни по согласованию',
      },
      {
        title: 'Паспортный стол',
        icon: 'passkey',
        address: 'Ленинградская обл., Всеволожский р-н, д. Новое Девяткино, дом 57-А (за домом №57)',
        phones: ['8 (812) 595-53-13'],
        schedule: 'Пн 9:00–13:00; Ср 16:00–19:00; Чт 14:00–17:00',
      },
      {
        title: 'Отделение почтовой связи',
        icon: 'local_post_office',
        address: 'ул. Озерная, дом 5, д. Новое Девяткино',
        phones: ['8 (81370) 65-722'],
      },
      {
        title: 'Нотариальная контора — нотариус Быстров Н.С.',
        icon: 'gavel',
        address: 'Новое Девяткино, 112Б (рядом с «Дикси»)',
        phones: ['465-50-99', '456-50-98'],
        description: 'Полный спектр нотариальных услуг',
      },
    ],
  },
  {
    title: 'Техническое обслуживание и ресурсы',
    icon: 'build',
    items: [
      {
        title: 'Техник ТСЖ (электрик, сантехник)',
        icon: 'home_repair_service',
        phones: ['+7 (812) 640-36-20', '+7 (921) 371-05-39'],
        description: 'Неисправности общедомового имущества, аварийные заявки на посту охраны.',
        schedule: 'Пн–Пт 10:00–18:00, кроме сб/вс и праздничных дней',
      },
      {
        title: 'Диспетчер компании «Сигма» (вода, канализация)',
        icon: 'water_drop',
        phones: ['8 (921) 389-10-20'],
        description: 'Поставка холодной воды, водоотведение и очистка канализации.',
        note: 'Email: sigmafirma@mail.ru',
      },
    ],
  },
];

export type UsefulLink = {
  title: string;
  url: string;
  description?: string;
  icon: string;
};

export type UsefulLinkCategory = {
  title: string;
  icon: string;
  items: UsefulLink[];
};

export const USEFUL_LINK_CATEGORIES: UsefulLinkCategory[] = [
  {
    title: 'Муниципальная информация',
    icon: 'domain',
    items: [
      {
        title: 'Официальный сайт Всеволожского муниципального района',
        url: 'http://www.vsevreg.ru',
        icon: 'public',
      },
      {
        title: 'Сайт Ленинградской области',
        url: 'http://www.lenobl.ru',
        icon: 'map',
      },
      {
        title: 'Информационный сайт Нового Девяткино',
        url: 'http://www.novoedevyatkino.ru',
        icon: 'info',
      },
      {
        title: 'Сайт о ТСЖ — материалы и практика',
        url: 'http://www.tsj.ru',
        icon: 'apartment',
      },
    ],
  },
  {
    title: 'Транспорт и безопасность',
    icon: 'local_shipping',
    items: [
      {
        title: 'Камеры Нового Девяткино и состояние Токсовского шоссе',
        url: 'http://cactus.tv/cam7',
        icon: 'videocam',
      },
    ],
  },
];
