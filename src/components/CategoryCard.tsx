import React from 'react';
import { CrimeCategoryType } from '../types/crime';

interface CategoryCardProps {
  category: CrimeCategoryType;
  count: number;
  selected: boolean;
  onClick: () => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  count,
  selected,
  onClick,
}) => {
  const formattedCount = new Intl.NumberFormat('en-IN').format(count);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-4 rounded border transition-colors cursor-pointer w-full focus:outline-none ${
        selected
          ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
          : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50/50'
      }`}
    >
      <div className="text-xs font-medium text-slate-800 line-clamp-2 h-8 leading-snug">
        {category}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-mono text-xl font-bold tracking-tight text-slate-900">
          {formattedCount}
        </span>
        <span className="font-mono text-[11px] text-slate-500 font-normal">
          Cases (1Y)
        </span>
      </div>
    </button>
  );
};
