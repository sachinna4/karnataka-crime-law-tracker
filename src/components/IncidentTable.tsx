import React, { useState } from 'react';
import { ExternalLink, AlertTriangle, RefreshCw, Inbox, Copy, Check, Scale, Hash } from 'lucide-react';
import { CaseRecord } from '../types/crime';
import { StatusBadge } from './StatusBadge';
import { TableSkeleton } from './LoadingSkeleton';

interface IncidentTableProps {
  cases: CaseRecord[];
  loading: boolean;
  error?: string | null;
  onRetry: () => void;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export const IncidentTable: React.FC<IncidentTableProps> = ({
  cases,
  loading,
  error,
  onRetry,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cnrCopiedId, setCnrCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleCopy = (text: string | null | undefined, id: string, setCopied: (id: string | null) => void) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleVerifyECourts = (cnrNumber: string | null | undefined) => {
    if (!cnrNumber) {
      setToastMessage('No CNR number available. Use the FIR reference manually on eCourts.');
      setTimeout(() => setToastMessage(null), 3500);
      window.open('https://services.ecourts.gov.in/ecourtindia_v6/', '_blank', 'noopener,noreferrer');
      return;
    }
    navigator.clipboard.writeText(cnrNumber);
    setToastMessage(`✓ CNR "${cnrNumber}" copied! Paste it into the eCourts "Search by CNR Number" box.`);
    setTimeout(() => setToastMessage(null), 5000);
    window.open('https://services.ecourts.gov.in/ecourtindia_v6/', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-t overflow-hidden relative">
      {/* Toast notification for eCourts clipboard action */}
      {toastMessage && (
        <div className="absolute top-3 right-4 z-30 bg-slate-900 text-white px-3.5 py-2.5 rounded shadow-xl text-xs font-mono flex items-center gap-2 border border-slate-700 max-w-sm">
          <Scale className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-mono uppercase tracking-wider text-slate-500">
              <th className="py-3 px-4 font-semibold w-44">FIR / Case Ref</th>
              <th className="py-3 px-3 font-semibold w-52">
                <div className="flex items-center gap-1">
                  <Hash className="w-3 h-3 text-indigo-500" />
                  <span>CNR Number</span>
                </div>
                <div className="text-[9px] normal-case tracking-normal text-slate-400 font-normal mt-0.5">
                  Copy &rarr; Paste on eCourts portal
                </div>
              </th>
              <th className="py-3 px-4 font-semibold">Incident Details &amp; Origin</th>
              <th className="py-3 px-4 font-semibold w-32">Date</th>
              <th className="py-3 px-4 font-semibold w-36">Status</th>
              <th className="py-3 px-4 font-semibold w-36 text-right">Source</th>
            </tr>
          </thead>

          {loading ? (
            <TableSkeleton />
          ) : error ? (
            <tbody>
              <tr>
                <td colSpan={6} className="py-12 px-4 text-center">
                  <div className="inline-flex flex-col items-center max-w-md mx-auto">
                    <AlertTriangle className="w-8 h-8 text-amber-600 mb-2" />
                    <p className="text-sm font-semibold text-slate-900 mb-1">
                      Data Fetch Issue
                    </p>
                    <p className="text-xs text-slate-500 mb-4">{error}</p>
                    <button
                      type="button"
                      onClick={onRetry}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Request</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          ) : cases.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={6} className="py-12 px-4 text-center">
                  <div className="inline-flex flex-col items-center max-w-sm mx-auto text-slate-400">
                    <Inbox className="w-8 h-8 mb-2 stroke-[1.5]" />
                    <p className="text-sm font-medium text-slate-700 mb-0.5">
                      No Records Found
                    </p>
                    <p className="text-xs text-slate-500">
                      No incidents match the active category and filter criteria.
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
              {cases.map((record) => {
                const firRef = record.official_fir_number || record.case_number;
                const cnr = record.cnr_number;
                const isGenerated =
                  record.is_generated_reference && !record.official_fir_number && !record.cnr_number;
                const isPoliceSource = record.source_type === 'police';
                const hasCnr = !!(cnr && cnr.trim().length >= 10);

                return (
                  <tr
                    key={record.id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    {/* 1. FIR / Case Reference */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-slate-900 break-all leading-snug">
                          {firRef}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(firRef, record.id, setCopiedId)}
                          title="Copy FIR / case reference"
                          className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer transition-colors flex-shrink-0"
                        >
                          {copiedId === record.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {isGenerated ? (
                          <span className="font-mono text-[10px] text-slate-400 inline-block uppercase">
                            Auto Ref
                          </span>
                        ) : record.official_fir_number ? (
                          <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded font-medium inline-block uppercase">
                            Official FIR
                          </span>
                        ) : null}
                        {isPoliceSource && (
                          <span className="font-mono text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1 py-0.5 rounded font-medium inline-block">
                            Police
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 2. CNR Number — dedicated column for eCourts lookup */}
                    <td className="py-3.5 px-3 align-top">
                      {hasCnr ? (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-indigo-900 tracking-wider break-all leading-snug">
                              {cnr}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(cnr, `cnr-${record.id}`, setCnrCopiedId)}
                              title="Copy CNR number"
                              className="text-indigo-400 hover:text-indigo-700 p-0.5 rounded cursor-pointer transition-colors flex-shrink-0"
                            >
                              {cnrCopiedId === `cnr-${record.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <span className="mt-0.5 font-mono text-[9px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.5 rounded font-medium inline-block uppercase tracking-wide">
                            CNR · eCourts
                          </span>
                          <button
                            type="button"
                            onClick={() => handleVerifyECourts(cnr)}
                            title="Copy CNR and open eCourts India — paste in Search by CNR Number box"
                            className="mt-1.5 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-400 cursor-pointer transition-colors"
                          >
                            <Scale className="w-2.5 h-2.5 flex-shrink-0" />
                            <span>Verify on eCourts ↗</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-300 text-[11px] font-mono">—</span>
                          <span className="text-[9px] text-slate-400 leading-snug">
                            Not available.
                          </span>
                          <button
                            type="button"
                            onClick={() => handleVerifyECourts(null)}
                            title="Open eCourts India portal"
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium text-slate-500 bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors"
                          >
                            <Scale className="w-2 h-2 flex-shrink-0" />
                            <span>Open eCourts ↗</span>
                          </button>
                        </div>
                      )}
                    </td>

                    {/* 3. Case Name / Incident Details */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-medium text-slate-900 leading-snug">
                        {record.case_name}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-sans border border-slate-200">
                          {record.district}
                        </span>
                        {record.source_name && (
                          <span className="text-[11px] text-slate-400">
                            via {record.source_name}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 4. Case Date */}
                    <td className="py-3.5 px-4 align-top font-mono text-slate-700">
                      <div>{formatDate(record.case_date)}</div>
                      {!record.official_fir_number && record.published_at && (
                        <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
                          Pub. Date
                        </div>
                      )}
                    </td>

                    {/* 5. Case Status */}
                    <td className="py-3.5 px-4 align-top">
                      <StatusBadge status={record.case_status} />
                    </td>

                    {/* 6. Source Link */}
                    <td className="py-3.5 px-4 align-top text-right">
                      {record.detail_link && record.detail_link.startsWith('http') ? (
                        <a
                          href={record.detail_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs font-medium text-slate-900 hover:text-slate-600 hover:underline"
                        >
                          <span>View Source</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs italic">N/A</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>
      </div>
    </div>
  );
};
