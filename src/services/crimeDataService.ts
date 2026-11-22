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
 * Fetch 1-year category counts for all 10 predefined categories.
 * Tries Supabase RPC `get_category_counts` or aggregate query, falling back to seed data.
 */
export async function fetchCategoryCounts(): Promise<{
  counts: CategoryCount[];
  mode: DataMode;
}> {
  if (!supabaseClient) {
    return { counts: getSeedCategoryCounts(), mode: 'sample' };
  }

  try {
    // Attempt RPC first
    const { data, error } = await supabaseClient.rpc('get_category_counts');
    if (!error && Array.isArray(data) && data.length > 0) {
      const countsMap = new Map<string, number>();
      for (const row of data) {
        countsMap.set(row.category, Number(row.count) || 0);
      }
      const counts: CategoryCount[] = CRIME_CATEGORIES.map((cat) => ({
        category: cat,
        count: countsMap.get(cat) ?? 0,
      }));
      return { counts, mode: 'live' };
    }

    // Direct aggregation query fallback on Supabase
    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);
    const dateThreshold = oneYearAgo.toISOString().split('T')[0];

    const { data: records, error: queryError } = await supabaseClient
      .from('karnataka_cases')
      .select('category')
      .gte('case_date', dateThreshold);

    if (queryError) throw queryError;

    const tally: Record<string, number> = {};
    for (const r of records || []) {
      tally[r.category] = (tally[r.category] || 0) + 1;
    }

    const counts: CategoryCount[] = CRIME_CATEGORIES.map((cat) => ({
      category: cat,
      count: tally[cat] ?? 0,
    }));

    return { counts, mode: 'live' };
  } catch (err) {
    console.warn('Supabase fetchCategoryCounts failed, falling back to seed data:', err);
    return { counts: getSeedCategoryCounts(), mode: 'sample' };
  }
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
