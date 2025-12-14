export interface DocumentItem {
  id: string;
  title: string;
  category: string;
  description?: string;
  year?: number;
  type: 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | string;
  sizeBytes: number;
  fileName: string;
  downloadUrl: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  tag: string;
  date: string;
  image?: string;
  imageUrl?: string;
  createdAt?: string;
}

export interface ContributionItem {
  id: string;
  input?: string;
  displayName: string;
  normalizedName: string;
  apartment?: string;
  houses: string[];
  month: string;
  amount: number;
  note?: string;
  createdAt?: string;
}

export interface ContributionSummaryRow {
  month: string;
  collected: number;
}

export interface ContributionSummary {
  totalAmount: number;
  contributionCount: number;
  peopleCount: number;
  byMonth: ContributionSummaryRow[];
}

export interface ContributionSuggestion {
  rawInput?: string;
  displayName: string;
  normalizedName: string;
  apartment?: string;
  houses: string[];
  confidence?: number;
  source?: string;
}

export interface DebtorItem {
  id: string;
  displayName: string;
  normalizedName: string;
  apartment?: string;
  houses: string[];
  phone?: string;
  debt: number;
  note?: string;
  updatedAt?: string;
}

export interface MeterRecord {
  id: string;
  username: string;
  hotWater: number;
  coldWater: number;
  electricity: number;
  createdAt?: string;
}

export type MeterReading = MeterRecord;

export interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

export interface AccountUser {
  username: string;
  role: string;
}

export interface AccountPersonLink {
  id: string;
  username: string;
  displayName: string;
  normalizedName: string;
  apartment?: string;
  houses: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AccountDebtEntry extends AccountPersonLink {
  debt: number;
  debtorId?: string;
  note?: string;
  phone?: string;
}

export interface AccountDebtSummary {
  username: string;
  totalDebt: number;
  links: AccountDebtEntry[];
}
