import React from 'react';
import { CaseStatusType } from '../types/crime';

interface StatusBadgeProps {
  status: CaseStatusType;
}

const STATUS_STYLES: Record<CaseStatusType, { bg: string; text: string; border: string }> = {
  'FIR Registered': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
  },
  'Charge Sheet Filed': {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-300',
  },
  'Under Investigation': {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
  },
  'Convicted': {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-300',
  },
  'Reported – Not Verified': {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const style = STATUS_STYLES[status] || STATUS_STYLES['Reported – Not Verified'];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${style.bg} ${style.text} ${style.border}`}
    >
      {status}
    </span>
  );
};
