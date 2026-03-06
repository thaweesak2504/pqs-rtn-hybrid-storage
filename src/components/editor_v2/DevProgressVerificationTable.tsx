import { invoke } from '@tauri-apps/api/tauri';
import { Database, RefreshCw } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface DevProgressVerificationTableProps {
  documentId: string;
  sectionId: number;
  refreshTrigger?: number;
}

interface DevSectionMetrics {
  total_questions_raw: number;
  total_leaf_questions: number;
  total_exempted: number;
  total_with_answer_keys: number;
  total_sub_questions: number;
  total_answers: number;
  answers_passed: number;
  answers_pending: number;
  answers_needs_improvement: number;
}

const DevProgressVerificationTable: React.FC<DevProgressVerificationTableProps> = ({
  documentId,
  sectionId,
  refreshTrigger = 0
}) => {
  const [metrics, setMetrics] = useState<DevSectionMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [localRefresh, setLocalRefresh] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false); // Collapsible

  useEffect(() => {
    let isMounted = true;
    const fetchMetrics = async () => {
      if (!sectionId || !documentId) return;
      try {
        setLoading(true);
        const data = await invoke<DevSectionMetrics>('get_section_dev_metrics', {
          documentId,
          sectionId
        });
        if (isMounted) {
          setMetrics(data);
        }
      } catch (err) {
        console.error("Failed to fetch dev metrics:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchMetrics();
    return () => { isMounted = false; };
  }, [documentId, sectionId, refreshTrigger, localRefresh]);

  const handleManualRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalRefresh(prev => prev + 1);
  };

  // Only show in development or when explicitly opened.
  // Using a discreet UI structure.
  return (
    <div className="mt-12 mb-8 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900/50">
      <div
        className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Database className="w-3.5 h-3.5" />
          <span>Developer Verification Metrics (Raw DB Counts)</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <span className="text-[10px] text-slate-400">{isExpanded ? '▼' : '▶'}</span>
        </div>
      </div>

      {isExpanded && metrics && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
            <thead className="text-xs uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2 rounded-tl">Metric</th>
                <th className="px-4 py-2 rounded-tr text-right">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              <tr className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-2 font-medium">Total Questions (Raw from DB)</td>
                <td className="px-4 py-2 text-right font-mono">{metrics.total_questions_raw}</td>
              </tr>
              <tr className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-2 font-medium">Total Leaf Questions (No Children)</td>
                <td className="px-4 py-2 text-right font-mono text-blue-600 dark:text-blue-400">{metrics.total_leaf_questions}</td>
              </tr>
              <tr className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-2 font-medium text-amber-600 dark:text-amber-500">Total Exempted Questions</td>
                <td className="px-4 py-2 text-right font-mono text-amber-600 dark:text-amber-500">{metrics.total_exempted}</td>
              </tr>
              <tr className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-2 font-medium">Total Questions with Answer Key(s)</td>
                <td className="px-4 py-2 text-right font-mono">{metrics.total_with_answer_keys}</td>
              </tr>
              <tr className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-2 font-medium">Total Sub-Questions (Answer Boxes)</td>
                <td className="px-4 py-2 text-right font-mono text-purple-600 dark:text-purple-400">{metrics.total_sub_questions}</td>
              </tr>
              <tr className="bg-slate-100 dark:bg-slate-800"><td colSpan={2} className="h-0.5 p-0"></td></tr>
              <tr className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-2 font-medium">Total Answers in DB</td>
                <td className="px-4 py-2 text-right font-mono">{metrics.total_answers}</td>
              </tr>
              <tr className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-2 font-medium text-emerald-600 dark:text-emerald-400">Answers 'Passed' (Calculated Score)</td>
                <td className="px-4 py-2 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">{metrics.answers_passed}</td>
              </tr>
              <tr className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-2 font-medium text-amber-600 dark:text-amber-400">Answers 'Pending'</td>
                <td className="px-4 py-2 text-right font-mono text-amber-600 dark:text-amber-400">{metrics.answers_pending}</td>
              </tr>
              <tr className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-2 font-medium text-red-500 dark:text-red-400">Answers 'Needs Improvement'</td>
                <td className="px-4 py-2 text-right font-mono text-red-500 dark:text-red-400">{metrics.answers_needs_improvement}</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-3 text-xs text-slate-400 text-center">
            Note: Progress Banner calculates <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">Score / Max Score</span>
            or <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">Passed / (Leaf - Exempted)</span> depending on score configuration.
          </div>
        </div>
      )}
    </div>
  );
};

export default DevProgressVerificationTable;
