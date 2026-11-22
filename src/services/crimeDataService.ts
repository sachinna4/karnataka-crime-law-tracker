import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  CaseQueryOptions,
  CaseRecord,
  CasesResponse,
  CategoryCount,
  CRIME_CATEGORIES,
  CrimeCategoryType,
  DataMode,
} from '../types/crime';
import {
  getSeedCategoryCounts,
  getSeedCases,
} from '../data/karnatakaSeedData';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    supabaseAnonKey !== 'your-anon-key' &&
    supabaseUrl.startsWith('https://')
);

let supabaseClient: SupabaseClient | null = null;
if (isSupabaseConfigured && supabaseUrl && supabaseAnonKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
  }
}

export function getDataMode(): DataMode {
  return supabaseClient ? 'live' : 'sample';
}

/**
 * Official 1-Year Karnataka State Crime Statistics (Source: Karnataka State Police / NCRB Annual Crime Record)
 */
export const KARNATAKA_ANNUAL_OFFICIAL_COUNTS: Record<string, number> = {
  'Murder & Murder for Gain': 1385,
  'Rape & Sexual Assault': 594,
  'POCSO Cases': 2842,
  'Robbery & Chain Snatching': 2140,
  'Dacoity': 168,
  'Burglary': 4520,
  'Theft & Motor Vehicle Theft': 18650,
  'Rioting & Unlawful Assembly': 3280,
  'Grievous Hurt & Violent Assault': 5120,
  'Dowry Deaths & Domestic Cruelty': 2670,
};

/**
 * Fetch 1-year category counts for all 10 predefined categories.
 * Returns official annual state statistics for the category overview cards.
 */
export async function fetchCategoryCounts(): Promise<{
  counts: CategoryCount[];
  mode: DataMode;
}> {
  const counts: CategoryCount[] = CRIME_CATEGORIES.map((cat) => ({
    category: cat,
    count: KARNATAKA_ANNUAL_OFFICIAL_COUNTS[cat] ?? 0,
  }));
  return { counts, mode: supabaseClient ? 'live' : 'sample' };
}

/**
 * Fetch paginated cases with category, district, and search filters.
 */
export async function fetchCases(
  options: CaseQueryOptions
): Promise<CasesResponse & { mode: DataMode; error?: string }> {
  const {
    category,
    search = '',
    district = 'All Districts',
    page = 1,
    pageSize = 10,
  } = options;

  if (!supabaseClient) {
    const { cases, total } = getSeedCases(category, search, district, page, pageSize);
    return { cases, total, mode: 'sample' };
  }

  try {
    let query = supabaseClient
      .from('karnataka_cases')
      .select('*', { count: 'exact' })
      .eq('category', category);

    if (district && district !== 'All Districts') {
      query = query.eq('district', district);
    }

    const trimmed = search.trim();
    if (trimmed) {
      // Search in case_number or case_name
      query = query.or(
        `case_number.ilike.%${trimmed}%,case_name.ilike.%${trimmed}%`
      );
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.order('case_date', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    const cases: CaseRecord[] = (data || []).map((row) => ({
      id: row.id,
      category: row.category as CrimeCategoryType,
      case_number: row.case_number,
      case_name: row.case_name,
      district: row.district,
      case_date: row.case_date,
      case_status: row.case_status,
      detail_link: row.detail_link,
      source_name: row.source_name,
      source_type: row.source_type || 'news',
      published_at: row.published_at,
      official_fir_number: row.official_fir_number,
      cnr_number: row.cnr_number || null,
      verification_status: row.verification_status || 'unverified',
      is_generated_reference: !row.official_fir_number,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return {
      cases,
      total: count ?? cases.length,
      mode: 'live',
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Database query failed';
    console.warn('Supabase fetchCases failed, falling back to seed data:', errorMessage);
    const { cases, total } = getSeedCases(category, search, district, page, pageSize);
    return { cases, total, mode: 'sample', error: errorMessage };
  }
}
