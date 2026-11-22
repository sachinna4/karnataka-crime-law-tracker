// ─── Crime Categories ──────────────────────────────────────────────────────────
export const CRIME_CATEGORIES = [
  'Murder & Murder for Gain',
  'Rape & Sexual Assault',
  'POCSO Cases',
  'Robbery & Chain Snatching',
  'Dacoity',
  'Burglary',
  'Theft & Motor Vehicle Theft',
  'Rioting & Unlawful Assembly',
  'Grievous Hurt & Violent Assault',
  'Dowry Deaths & Domestic Cruelty',
] as const;

export type CrimeCategoryType = typeof CRIME_CATEGORIES[number];

// ─── Case Status ───────────────────────────────────────────────────────────────
export const CASE_STATUSES = [
  'FIR Registered',
  'Charge Sheet Filed',
  'Under Investigation',
  'Convicted',
  'Reported – Not Verified',
] as const;

export type CaseStatusType = typeof CASE_STATUSES[number];

// ─── Districts ─────────────────────────────────────────────────────────────────
export const KARNATAKA_DISTRICTS = [
  'All Districts',
  'Bengaluru Urban',
  'Mysuru',
  'Mangaluru',
  'Hubballi-Dharwad',
  'Belagavi',
  'Kalaburagi',
  'Tumakuru',
  'Shivamogga',
  'Ballari',
  'Vijayapura',
  'Raichur',
  'Davangere',
  'Chitradurga',
  'Hassan',
  'Chikkamagaluru',
  'Bagalkot',
  'Gadag',
  'Koppal',
  'Haveri',
  'Dharwad',
  'Uttara Kannada',
  'Udupi',
  'Dakshina Kannada',
  'Kodagu',
  'Chamarajanagar',
  'Mandya',
  'Ramanagara',
  'Bengaluru Rural',
  'Chikkaballapura',
  'Kolar',
  'Yadgir',
  'Bidar',
  'Yadagiri',
] as const;

export type DistrictType = typeof KARNATAKA_DISTRICTS[number];

// ─── Core Record Type ──────────────────────────────────────────────────────────
export interface CaseRecord {
  id: string;
  category: CrimeCategoryType;
  case_number: string;
  case_name: string;
  district: string;
  case_date: string;           // ISO date string YYYY-MM-DD
  case_status: CaseStatusType;
  detail_link: string;
  source_name: string | null;
  source_type: 'news' | 'police' | 'court';
  published_at: string | null;
  official_fir_number: string | null;
  cnr_number?: string | null;
  verification_status: 'unverified' | 'source_confirmed' | 'officially_verified';
  is_generated_reference: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Category Count ────────────────────────────────────────────────────────────
export interface CategoryCount {
  category: CrimeCategoryType;
  count: number;
}

// ─── Service Response ─────────────────────────────────────────────────────────
export interface CasesResponse {
  cases: CaseRecord[];
  total: number;
}

export type DataMode = 'live' | 'sample';

// ─── Query Options ─────────────────────────────────────────────────────────────
export interface CaseQueryOptions {
  category: CrimeCategoryType;
  search?: string;
  district?: string;
  page?: number;
  pageSize?: number;
}
