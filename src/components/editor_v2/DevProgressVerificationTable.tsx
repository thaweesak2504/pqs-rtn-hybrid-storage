import { invoke } from '@tauri-apps/api/tauri';
import { BarChart3, CheckCircle2, Database, RefreshCw } from 'lucide-react';
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
  total_required_questions: number;
  total_with_answer_keys: number;
  total_sub_questions: number;
  total_answer_targets: number;
  total_answers: number;
  answers_assessed: number;
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

  const structureCompletion = metrics && metrics.total_answer_targets > 0
    ? Math.min(100, Math.round((metrics.total_answer_targets / metrics.total_answer_targets) * 100))
    : 0;

  const assessmentCompletion = metrics && metrics.total_answer_targets > 0
    ? Math.min(100, Math.round(((metrics.answers_passed + metrics.answers_pending) / metrics.total_answer_targets) * 100))
    : 0;

  const rows = metrics ? [
    {
      label: 'คำถามทั้งหมดใน Section',
      helper: 'นับทุก record ในตาราง Questions',
      value: metrics.total_questions_raw,
      accent: 'text-slate-700 dark:text-slate-200'
    },
    {
      label: 'คำถามปลายทาง (Leaf Questions)',
      helper: 'คำถามที่ไม่มีลูก ใช้เป็นฐานก่อนหักข้อยกเว้น',
      value: metrics.total_leaf_questions,
      accent: 'text-blue-600 dark:text-blue-400'
    },
    {
      label: 'คำถามที่ต้องประเมินจริง',
      helper: 'ใช้เป็นโครงสร้างอ้างอิงของ section ไม่ใช่หน่วยที่ใช้คำนวณ banner',
      value: metrics.total_required_questions,
      accent: 'text-indigo-600 dark:text-indigo-400'
    },
    {
      label: 'รายการคำเฉลยทั้งหมด (Answer Targets)',
      helper: 'นับจาก QuestionAnswerKeys แบบ 1 แถว = 1 กล่องคำตอบ = 1 เป้าหมายการตรวจ',
      value: metrics.total_answer_targets,
      accent: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      label: 'กล่องคำตอบที่ระบบสร้าง',
      helper: 'ใช้หน่วยเดียวกับ Answer Targets และเป็นยอดเดียวกับที่ Banner ใช้เป็นตัวหาร',
      value: metrics.total_answer_targets,
      accent: 'text-purple-600 dark:text-purple-400'
    },
  ] : [];

  return (
    <div className="mt-12 mb-8 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900/50 shadow-sm">
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Database className="w-3.5 h-3.5" />
          <span>Developer Verification Metrics</span>
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
        <div className="p-4 md:p-5 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/30 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                <BarChart3 className="w-4 h-4" />
                <span>โครงสร้างคำถาม</span>
              </div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{metrics.total_required_questions}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">คำถามที่ต้องประเมินจริงหลังหักข้อยกเว้น</div>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/30 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>ความครบของหน่วยนับ</span>
              </div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{structureCompletion}%</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">ระบบนับจาก Answer Targets / Answer Boxes ทั้งหมด {metrics.total_answer_targets} รายการ</div>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/30 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                <Database className="w-4 h-4" />
                <span>ความคืบหน้าการตรวจ</span>
              </div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{assessmentCompletion}%</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Banner นับจาก {metrics.total_answer_targets} กล่องคำตอบ โดยตรวจแล้ว {metrics.answers_passed + metrics.answers_pending}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white/70 dark:bg-slate-950/20">
            <div className="px-4 py-3 bg-slate-100/80 dark:bg-slate-800/70 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              ความสัมพันธ์ของจำนวนสำคัญ
            </div>
            <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
              <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">รายการ</th>
                  <th className="px-4 py-3">ความหมาย</th>
                  <th className="px-4 py-3 text-right">จำนวน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {rows.map((row) => (
                  <tr key={row.label} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20">
                    <td className={`px-4 py-3 font-medium ${row.accent}`}>{row.label}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{row.helper}</td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${row.accent}`}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white/70 dark:bg-slate-950/20">
            <div className="px-4 py-3 bg-slate-100/80 dark:bg-slate-800/70 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              สถานะผลการประเมิน
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-slate-200 dark:bg-slate-800">
              <div className="bg-white dark:bg-slate-900 px-4 py-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">คำตอบที่ส่งแล้ว</div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{metrics.total_answers}</div>
              </div>
              <div className="bg-white dark:bg-slate-900 px-4 py-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">ผ่านแล้ว</div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.answers_passed}</div>
              </div>
              <div className="bg-white dark:bg-slate-900 px-4 py-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">รอประเมิน / รอดำเนินการ</div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{metrics.answers_pending}</div>
              </div>
              <div className="bg-white dark:bg-slate-900 px-4 py-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">ต้องปรับปรุง</div>
                <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{metrics.answers_needs_improvement}</div>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
            ตัวเลขบน Banner ใช้หน่วย <span className="font-semibold">Answer Target / กล่องคำตอบ</span> เท่านั้น
            ดังนั้นยอดเช่น <span className="font-semibold">47</span> หมายถึงมีเป้าหมายการตอบอยู่ 47 รายการใน section นี้
            และจะถือว่า <span className="font-semibold">ผ่าน</span> ต่อเมื่อทั้ง 47 รายการผ่านครบทั้งหมด
          </div>
        </div>
      )}
    </div>
  );
};

export default DevProgressVerificationTable;
