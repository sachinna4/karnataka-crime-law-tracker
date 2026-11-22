import React, { useState, useEffect, useCallback } from 'react';
import {
  CRIME_CATEGORIES,
  CrimeCategoryType,
  CategoryCount,
  CaseRecord,
  DataMode,
} from './types/crime';
import {
  fetchCategoryCounts,
  fetchCases,
  getDataMode,
} from './services/crimeDataService';
import { DataSourceIndicator } from './components/DataSourceIndicator';
import { CategoryGrid } from './components/CategoryGrid';
import { SearchFilter } from './components/SearchFilter';
import { IncidentTable } from './components/IncidentTable';
import { Pagination } from './components/Pagination';
import { ShieldCheck } from 'lucide-react';

const PAGE_SIZE = 10;

export const App: React.FC = () => {
  // Category counts and selection
  const [selectedCategory, setSelectedCategory] = useState<CrimeCategoryType>(
    CRIME_CATEGORIES[0]
  );
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([]);
  const [loadingCounts, setLoadingCounts] = useState<boolean>(true);

  // Cases table state
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [totalCases, setTotalCases] = useState<number>(0);
  const [loadingCases, setLoadingCases] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters and pagination
  const [search, setSearch] = useState<string>('');
  const [district, setDistrict] = useState<string>('All Districts');
  const [page, setPage] = useState<number>(1);

  // Mode (live vs sample)
  const [dataMode, setDataMode] = useState<DataMode>(getDataMode());

  // Load category counts on mount
  const loadCounts = useCallback(async () => {
    setLoadingCounts(true);
    try {
      const res = await fetchCategoryCounts();
      setCategoryCounts(res.counts);
      setDataMode(res.mode);
    } catch (err: unknown) {
      console.error('Error loading counts:', err);
    } finally {
      setLoadingCounts(false);
    }
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  // Load cases when category, page, search or district changes
  const loadCases = useCallback(async () => {
    setLoadingCases(true);
    setFetchError(null);
    try {
      const res = await fetchCases({
        category: selectedCategory,
        search,
        district,
        page,
        pageSize: PAGE_SIZE,
      });

      setCases(res.cases);
      setTotalCases(res.total);
      setDataMode(res.mode);
      if (res.error) {
        setFetchError(res.error);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown query failure';
      setFetchError(msg);
    } finally {
      setLoadingCases(false);
    }
  }, [selectedCategory, search, district, page]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  // Handlers with pagination reset
  const handleSelectCategory = (cat: CrimeCategoryType) => {
    if (cat === selectedCategory) return;
    setSelectedCategory(cat);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleDistrictChange = (dist: string) => {
    setDistrict(dist);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col">
      {/* Top Government/Institutional Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-slate-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-slate-900">
                  Karnataka Crime &amp; Law Tracker
                </h1>
                <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  Institutional Dossier
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal">
                Statewide Law Enforcement &amp; Public Order Monitoring Platform
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <DataSourceIndicator mode={dataMode} error={fetchError} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Level 1: Crime Category Dashboard Grid */}
        <section aria-labelledby="categories-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="categories-heading" className="text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Category Overview • 1-Year Incident Tally
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              10 Monitored Classes
            </span>
          </div>

          <CategoryGrid
            categories={categoryCounts}
            selectedCategory={selectedCategory}
            onSelectCategory={handleSelectCategory}
            loading={loadingCounts}
          />
        </section>

        {/* Level 2: Incident Dossier Table & Search Filters */}
        <section aria-labelledby="dossier-heading">
          <h2 id="dossier-heading" className="sr-only">
            Incident Records Dossier
          </h2>

          <SearchFilter
            selectedCategory={selectedCategory}
            totalCount={totalCases}
            search={search}
            district={district}
            onSearchChange={handleSearchChange}
            onDistrictChange={handleDistrictChange}
          />

          <IncidentTable
            cases={cases}
            loading={loadingCases}
            error={fetchError}
            onRetry={loadCases}
          />

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={totalCases}
            onPageChange={handlePageChange}
          />
        </section>
      </main>

      {/* Institutional Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-slate-700">
              Karnataka Crime &amp; Law Tracker — Data Governance Protocol
            </p>
            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed max-w-2xl">
              Strict demarcation maintained between news-reported incidents, verified police FIRs,
              and judicial outcomes. Media reports are catalogued with generated references and unverified status
              until formally correlated with official station logs.
            </p>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            <span>Standard: KA-POL-MON-2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
