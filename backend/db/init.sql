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

-- Каталог для саморегистрации: упрощенный справочник ФИО + дом.
CREATE TABLE IF NOT EXISTS registration_residents (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  house TEXT NOT NULL,
  apartment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS registration_residents_norm_idx ON registration_residents (normalized_name);
CREATE INDEX IF NOT EXISTS registration_residents_house_idx ON registration_residents (house);
CREATE UNIQUE INDEX IF NOT EXISTS registration_residents_norm_house_idx ON registration_residents (normalized_name, house);

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
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS account_people_normalized_idx ON account_people (normalized_name);
CREATE INDEX IF NOT EXISTS account_people_username_idx ON account_people (username);

CREATE TABLE IF NOT EXISTS meter_readings (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  hot_water NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cold_water NUMERIC(12, 2) NOT NULL DEFAULT 0,
  electricity NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS meter_readings_username_idx ON meter_readings (username);
CREATE INDEX IF NOT EXISTS meter_readings_created_idx ON meter_readings (created_at DESC);

CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Общее',
  description TEXT NOT NULL,
  full_name TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS requests_status_idx ON requests (status);
CREATE INDEX IF NOT EXISTS requests_username_idx ON requests (username);
CREATE INDEX IF NOT EXISTS requests_updated_idx ON requests (updated_at DESC);

CREATE TABLE IF NOT EXISTS request_comments (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'note',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS request_comments_request_idx ON request_comments (request_id, created_at);
