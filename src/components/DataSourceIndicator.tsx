import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { DataMode } from '../types/crime';

interface DataSourceIndicatorProps {
  mode: DataMode;
  error?: string | null;
}

export const DataSourceIndicator: React.FC<DataSourceIndicatorProps> = ({ mode, error }) => {
  if (mode === 'live' && !error) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono rounded">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
        <span>Connected to Live Supabase Data Store</span>
      </div>
    );
  }

  return (
    <div className="w-full bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2.5 rounded text-xs leading-relaxed flex items-start gap-2.5">
      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
      <div>
        <span className="font-semibold uppercase tracking-wider text-[11px] block text-amber-900 mb-0.5">
          Illustrative Sample Data
        </span>
        <p className="text-amber-800">
          This dashboard is currently operating on demonstration records. Figures and case
          identifiers are illustrative and do not reflect real persons, official FIR numbers, or verified court outcomes.
          {error && <span className="block mt-1 font-mono text-[11px] text-amber-950">Notice: {error}</span>}
        </p>
      </div>
    </div>
  );
};
