import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { CrimeCategoryType, KARNATAKA_DISTRICTS } from '../types/crime';

interface SearchFilterProps {
  selectedCategory: CrimeCategoryType;
  totalCount: number;
  search: string;
  district: string;
  onSearchChange: (value: string) => void;
  onDistrictChange: (district: string) => void;
}

export const SearchFilter: React.FC<SearchFilterProps> = ({
  selectedCategory,
  totalCount,
  search,
  district,
  onSearchChange,
  onDistrictChange,
}) => {
  const [localSearch, setLocalSearch] = useState(search);

  // Sync internal state if parent search changes externally
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  // Debounce search update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange(localSearch);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, search, onSearchChange]);

  return (
    <div className="bg-white border border-slate-200 rounded p-4 mb-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Title & Count */}
        <div>
          <h2 className="text-base font-semibold text-slate-900 tracking-tight">
            {selectedCategory}
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Total Records:{' '}
            <span className="font-semibold text-slate-800">
              {new Intl.NumberFormat('en-IN').format(totalCount)}
            </span>
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search case # or title..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* District Dropdown */}
          <div className="min-w-[170px]">
            <select
              value={district}
              onChange={(e) => onDistrictChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 text-slate-800 font-medium cursor-pointer"
            >
              {KARNATAKA_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
