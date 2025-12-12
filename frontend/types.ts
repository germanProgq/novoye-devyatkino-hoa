export interface DocumentItem {
  id: string;
  title: string;
  date: string;
  size: string;
  type: 'pdf' | 'doc' | 'xls';
  category: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  date: string;
  image: string;
  tag: 'Важно' | 'Событие' | 'Ремонт';
}

export interface MeterReading {
  id: number;
  month: string;
  hotWater: number;
  coldWater: number;
  electricity: number;
  status: 'Принято' | 'Обработка';
}

export interface FaqItem {
  question: string;
  answer: string;
  category: string;
}