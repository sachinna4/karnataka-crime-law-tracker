import React from 'react';

export const CategoryCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded p-4 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
      <div className="h-7 bg-slate-200 rounded w-1/2 mb-1" />
      <div className="h-3 bg-slate-100 rounded w-1/3" />
    </div>
  );
};

export const CategoryGridSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <CategoryCardSkeleton key={i} />
      ))}
    </div>
  );
};

export const TableRowSkeleton: React.FC = () => {
  return (
    <tr className="border-b border-slate-100 animate-pulse">
      <td className="py-3 px-4">
        <div className="h-4 bg-slate-200 rounded w-28 mb-1" />
        <div className="h-3 bg-slate-100 rounded w-16" />
      </td>
      <td className="py-3 px-3">
        <div className="h-4 bg-indigo-100 rounded w-32 mb-1" />
        <div className="h-3 bg-indigo-50 rounded w-20 mb-1" />
        <div className="h-5 bg-indigo-100 rounded w-28" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-slate-200 rounded w-4/5 mb-1" />
        <div className="h-3 bg-slate-100 rounded w-20" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-slate-200 rounded w-24" />
      </td>
      <td className="py-3 px-4">
        <div className="h-5 bg-slate-200 rounded w-28" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-slate-200 rounded w-20" />
      </td>
    </tr>
  );
};

export const TableSkeleton: React.FC = () => {
  return (
    <tbody className="divide-y divide-slate-100">
      {Array.from({ length: 10 }).map((_, i) => (
        <TableRowSkeleton key={i} />
      ))}
    </tbody>
  );
};
