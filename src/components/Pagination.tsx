import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (newPage: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  pageSize,
  total,
  onPageChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200 rounded-b text-xs text-slate-600">
      <div className="font-mono">
        Showing{' '}
        <span className="font-semibold text-slate-900">
          {start}–{end}
        </span>{' '}
        of{' '}
        <span className="font-semibold text-slate-900">
          {new Intl.NumberFormat('en-IN').format(total)}
        </span>{' '}
        cases
      </div>

      <div className="flex items-center gap-2">
        <span className="font-mono text-slate-500 mr-2">
          Page <span className="font-semibold text-slate-900">{page}</span> of{' '}
          <span className="font-semibold text-slate-900">{totalPages}</span>
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
            canPrev
              ? 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 cursor-pointer'
              : 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
          }`}
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Prev</span>
        </button>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
            canNext
              ? 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 cursor-pointer'
              : 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
          }`}
          aria-label="Next Page"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
