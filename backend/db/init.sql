CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  year INT
);

INSERT INTO documents (id, filename, title, category, description, year) VALUES
('tariffs-electricity-2012', '183.doc', 'Постановление №26 по тарифам на электроэнергию (31.05.2012)', 'Тарифы', 'Изменения в тарифах на электроэнергию Республики Марий Эл, постановление комитета по тарифам и ценам №26.', 2012),
('tariffs-waste-removal-2012', '288.doc', 'Тарифы на вывоз ТБО и КГМ (МУП «Эко-Сервис», 2012)', 'Тарифы', 'Расценки на сбор, вывоз твердых бытовых и крупногабаритных отходов на 2012 год для МУП «Эко-Сервис».', 2012),
('financial-report-2011-ilyinsky-2', '31e.xls', 'Финансовый отчет УК «Павшино» за 2011 (Ильинский б-р, д. 2)', 'Отчеты', 'Отчет о результатах деятельности управляющей организации по ст.162 ЖК РФ за 2011 год для дома Ильинский б-р, д. 2.', 2011),
('maintenance-services-list', '34c.docx', 'Перечень услуг по содержанию общего имущества', 'Обслуживание', 'Список работ и услуг по содержанию общего имущества в многоквартирном доме с указанием периодичности.', NULL),
('management-duties', '3fd.docx', 'Обязанности управляющей организации', 'Договор управления', 'Перечень обязанностей управляющей организации по управлению общим имуществом.', NULL),
('maintenance-fee-decision-2011', '534.doc', 'Решение №557-4-РД по плате за содержание и ремонт жилья', 'Тарифы', 'Изменения в размерах платы за содержание и ремонт жилья, решение Йошкар-Олинской городской Думы от 27.12.2011.', 2011),
('owners-rights', '5a2.docx', 'Права собственников жилых помещений', 'Договор управления', 'Права собственников при исполнении договора управления многоквартирным домом.', NULL),
('service-characteristics-zhilkom', '5dc.docx', 'Потребительские характеристики ЖКУ (ООО «ЖилКом»)', 'ЖКУ', 'Сводные характеристики предоставляемых жилищно-коммунальных услуг управляющей организацией ООО «ЖилКом».', NULL),
('hot-water-tariffs-2012', '678.doc', 'Тарифы на горячую воду (МУП «Гортеплосеть», 2012)', 'Тарифы', 'Постановление о тарифах на горячую воду, поставляемую МУП «Гортеплосеть» г. Йошкар-Олы на 2012 год.', 2012),
('work-summary-zhilkom', '6d5.docx', 'Информация о выполняемых работах', 'Отчеты', 'Перечень услуг и работ управляющей организации ООО «ЖилКом» по общему имуществу.', NULL),
('disclosure-standard-731', '731.doc', 'Постановление Правительства РФ №731 (раскрытие информации)', 'Нормативные документы', 'Стандарт раскрытия информации организациями, управляющими многоквартирными домами, от 23.09.2010 №731.', 2010),
('owners-obligations', '732.docx', 'Обязанности собственников жилых помещений', 'Договор управления', 'Обязанности собственников по договору управления многоквартирным домом.', NULL),
('management-rights', '7b1.docx', 'Права управляющей организации', 'Договор управления', 'Перечень прав управляющей организации при исполнении договора управления.', NULL),
('management-contract-draft', '867.docx', 'Проект договора управления с собственниками', 'Договор управления', 'Шаблон договора управления многоквартирным домом с собственниками помещений (ООО «УК «ЖилКом»).', NULL),
('responsibility-clauses', '892.docx', 'Ответственность сторон по договору управления', 'Договор управления', 'Раздел о распределении ответственности сторон в рамках договора управления.', NULL),
('common-property-description', '8cf.docx', 'Общее имущество многоквартирного дома', 'Информация', 'Состав и описание общего имущества многоквартирного дома.', NULL),
('profit-and-loss-2011', '90c.xlsx', 'Отчет о прибылях и убытках за 2011 (УК «Павшино»)', 'Отчеты', 'Форма отчета о прибылях и убытках за 2011 год управляющей компании «Павшино».', 2011),
('routine-repair-list', 'a0f.docx', 'Перечень работ по текущему ремонту', 'Ремонт', 'Список работ по текущему ремонту общего имущества в многоквартирном доме.', NULL),
('cold-water-tariffs-2012', 'a62.doc', 'Тарифы на холодную воду и водоотведение (Горводоканал, 2012)', 'Тарифы', 'Постановление о тарифах на холодную воду и водоотведение для МУП «Горводоканал» г. Йошкар-Олы на 2012 год.', 2012),
('service-terms', 'a7a.docx', 'Порядок оказания услуг по содержанию и ремонту', 'Обслуживание', 'Условия оказания услуг по содержанию и ремонту общего имущества многоквартирного дома.', NULL),
('defect-remediation-deadlines', 'af9.docx', 'Сроки устранения недостатков содержания общего имущества', 'Обслуживание', 'Предельные сроки устранения неисправностей общего имущества.', NULL),
('violation-protocol', 'b79.docx', 'Оформление нарушений условий договора', 'Договор управления', 'Порядок фиксации нарушений условий договора управления и качества услуг.', NULL),
('balance-sheet-2011-zhilkom', 'be1.xls', 'Бухгалтерский баланс на 31.12.2011 (ООО «УК «ЖилКом»)', 'Отчеты', 'Баланс управляющей компании «ЖилКом» на 31 декабря 2011 года.', 2011),
('management-contract-template', 'c50.doc', 'Договор управления многоквартирным домом (шаблон)', 'Договор управления', 'Шаблон договора управления многоквартирным домом для ООО «УК «ЖилКом».', NULL),
('paid-services-price-2011', 'd26.xls', 'Перечень и стоимость платных услуг (2011)', 'Цены', 'Прайс-лист на платные услуги для населения, утвержденный ООО «Управляющая компания «ЖилКом» в 2011 году.', 2011)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS news (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  tag TEXT NOT NULL,
  image_filename TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO news (id, title, summary, tag, image_filename, created_at) VALUES
('news-sample-1', 'Плановое отключение горячей воды', 'Подача горячей воды будет приостановлена с 15 по 17 ноября из-за профилактических работ на теплотрассе.', 'Важно', NULL, NOW() - INTERVAL '5 days'),
('news-sample-2', 'Субботник во дворе', 'Приглашаем жильцов принять участие в субботнике. Инвентарь выдадим на месте, после работы — чай и выпечка.', 'Событие', NULL, NOW() - INTERVAL '3 days'),
('news-sample-3', 'Ремонт лифта в 3 подъезде', 'Заменили тросы и панель управления. Лифт работает в штатном режиме.', 'Ремонт', NULL, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS contributions (
  id TEXT PRIMARY KEY,
  person_input TEXT,
  display_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  apartment TEXT,
  houses TEXT[],
  month TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contributions_normalized_idx ON contributions (normalized_name);

CREATE TABLE IF NOT EXISTS debtors (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  normalized_name TEXT NOT NULL,
  apartment TEXT,
  houses TEXT[],
  phone TEXT,
  debt NUMERIC(12, 2) NOT NULL DEFAULT 0,
  note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS debtors_normalized_idx ON debtors (normalized_name);

INSERT INTO contributions (id, person_input, display_name, normalized_name, apartment, houses, month, amount, note, created_at) VALUES
('contrib-sample-1', 'кв 14 ковалева 15/16', 'Ковалёва', 'ковалёва', '14', ARRAY['15','16'], 'Ноя', 4200.00, 'Безналичный перевод', NOW() - INTERVAL '2 days'),
('contrib-sample-2', 'иванов кв8', 'Иванов', 'иванов', '8', ARRAY['75А'], 'Окт', 3800.50, 'Оплата содержания жилья', NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO debtors (id, display_name, normalized_name, apartment, houses, phone, debt, note, updated_at) VALUES
('debtor-sample-1', 'Петрова', 'петрова', '22', ARRAY['75А'], '+7 900 000-00-00', 5200.00, 'Планирует оплатить до конца месяца', NOW() - INTERVAL '1 day'),
('debtor-sample-2', 'Ковалёва', 'ковалёва', '14', ARRAY['15','16'], '+7 911 111-11-11', 3100.00, 'Частичная оплата', NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS account_people (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  display_name TEXT,
  normalized_name TEXT NOT NULL,
  apartment TEXT,
  houses TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS account_people_normalized_idx ON account_people (normalized_name);
CREATE INDEX IF NOT EXISTS account_people_username_idx ON account_people (username);
