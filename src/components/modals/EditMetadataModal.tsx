import { invoke } from '@tauri-apps/api/tauri';
import { Settings, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { normalizePolicyGuardError } from '../../utils/policyGuards';
import Button from '../ui/Button';
import { FormInput, FormRow, FormSelect } from '../ui/Form';
import CareerBranchManagerModal from './CareerBranchManagerModal';

interface EditMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  docId: string;
  initialName: string;
  initialAppliedTo: string;
  initialDocType: string;
  initialUserLevel: string;
  onSuccess: () => void;
  userRole?: string;
}

interface OccupationBranch { code: string; name: string; }
interface OccupationSubBranch { code: string; branch_code: string; name: string; }
interface DocumentBranch { occupation_branch_main: string | null; occupation_branch_sub: string | null; }
interface CareerBranchUsageReport {
  has_conflict: boolean;
  affected_question_count: number;
  affected_section_groups: number[];
}
interface CareerBranchResetReport {
  subq_links_deleted: number;
  answer_keys_deleted: number;
  user_answers_deleted: number;
  questions_reset: number;
}
interface CompletedBranchPair {
  branch_code: string;
  sub_branch_code: string;
}

const STANDARD_BRANCH_NAME = 'ต้นแบบมาตรฐาน';

const EditMetadataModal: React.FC<EditMetadataModalProps> = ({
  isOpen,
  onClose,
  docId,
  initialName,
  initialAppliedTo,
  initialDocType,
  initialUserLevel,
  onSuccess,
  userRole
}) => {
  const [name, setName] = useState(initialName);
  const [appliedTo, setAppliedTo] = useState(initialAppliedTo);
  const [docType, setDocType] = useState(initialDocType || '10');
  const [userLevel, setUserLevel] = useState(initialUserLevel || '2');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Branch selection state
  const [branches, setBranches] = useState<OccupationBranch[]>([]);
  const [subBranches, setSubBranches] = useState<OccupationSubBranch[]>([]);
  const [selectedMain, setSelectedMain] = useState<string>('');
  const [selectedSub, setSelectedSub] = useState<string>('');
  const [originalMain, setOriginalMain] = useState<string>('');
  const [originalSub, setOriginalSub] = useState<string>('');

  // Conflict detection state
  const [conflictReport, setConflictReport] = useState<CareerBranchUsageReport | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);

  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const isAdmin = userRole === 'admin';

  // Completed branch+sub pairs (all 6 slots done)
  const [completedPairs, setCompletedPairs] = useState<CompletedBranchPair[]>([]);

  // Helper: load sub-branches for a given main code (used by dropdown onChange & create)
  const loadSubBranches = async (mainCode: string) => {
    if (!mainCode) { setSubBranches([]); return; }
    try {
      const data = await invoke<OccupationSubBranch[]>('get_occupation_sub_branches', { branchCode: mainCode });
      setSubBranches(data);
    } catch {
      setSubBranches([]);
    }
  };

  const loadCompletedPairs = async () => {
    try {
      const pairs = await invoke<CompletedBranchPair[]>('get_all_completed_branch_pairs');
      setCompletedPairs(pairs ?? []);
    } catch {
      setCompletedPairs([]);
    }
  };

  const loadBranches = async () => {
    try {
      const list = await invoke<OccupationBranch[]>('get_occupation_branches');
      setBranches(list);
    } catch {
      setBranches([]);
    }
  };

  // Load branches, document branch, AND sub-branches atomically on open
  useEffect(() => {
    if (!isOpen) return;
    setSelectedMain('');
    setSelectedSub('');
    setSubBranches([]);
    setBranches([]);

    Promise.all([
      invoke<OccupationBranch[]>('get_occupation_branches'),
      invoke<DocumentBranch>('get_document_branch', { docId }),
      invoke<CompletedBranchPair[]>('get_all_completed_branch_pairs')
    ]).then(async ([branchList, docBranch, pairs]) => {
      setBranches(branchList);
      setCompletedPairs(pairs);
      let mainCode = docBranch.occupation_branch_main;
      let subCode = docBranch.occupation_branch_sub;
      if (!mainCode) {
        mainCode = branchList.find(b => b.name === STANDARD_BRANCH_NAME)?.code || '';
      }
      let subList: OccupationSubBranch[] = [];
      if (mainCode) {
        try {
          subList = await invoke<OccupationSubBranch[]>('get_occupation_sub_branches', { branchCode: mainCode });
        } catch { /* ignore */ }
      }
      if (!subCode && mainCode) {
        subCode = subList.find(s => s.name === STANDARD_BRANCH_NAME)?.code || '';
      }
      setSubBranches(subList);
      setSelectedMain(mainCode || '');
      setSelectedSub(subCode || '');
      setOriginalMain(mainCode || '');
      setOriginalSub(subCode || '');
    }).catch(() => setBranches([]));
  }, [isOpen, docId]);

  // Check for career branch conflicts when branch changes
  useEffect(() => {
    const branchChanged = selectedMain !== originalMain || selectedSub !== originalSub;
    if (!branchChanged || !isOpen) {
      setConflictReport(null);
      return;
    }
    setIsCheckingConflict(true);
    invoke<CareerBranchUsageReport>('check_career_branch_usage', { docId })
      .then(report => {
        setConflictReport(report);
      })
      .catch(err => {
        console.error('Failed to check career branch usage:', err);
        setConflictReport(null);
      })
      .finally(() => {
        setIsCheckingConflict(false);
      });
  }, [selectedMain, selectedSub, originalMain, originalSub, isOpen, docId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    const branchChanged = selectedMain !== originalMain || selectedSub !== originalSub;
    if (branchChanged && conflictReport?.has_conflict && !showConfirmDialog) {
      setShowConfirmDialog(true);
      setIsSubmitting(false);
      return;
    }
    try {
      await invoke('update_document', {
        args: {
          id: docId,
          name,
          applied_to: appliedTo,
          doc_type: docType,
          user_level: userLevel
        }
      });
      if (branchChanged && conflictReport?.has_conflict) {
        await invoke<CareerBranchResetReport>('reset_and_update_career_branch', {
          docId,
          newMain: selectedMain || null,
          newSub: selectedSub || null,
        });
      } else {
        await invoke('update_document_branch', {
          docId,
          branchMain: selectedMain || null,
          branchSub: selectedSub || null,
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to update document:', err);
      setErrorMsg(normalizePolicyGuardError(err, 'Failed to update'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-github-bg-secondary border border-github-border-primary rounded-lg shadow-xl max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-github-border-primary">
          <h2 className="text-xl font-bold text-github-text-primary">Edit Document Metadata</h2>
          <button
            onClick={onClose}
            className="text-github-text-secondary hover:text-github-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          {errorMsg && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded">
              {errorMsg}
            </div>
          )}

          <div>
            <FormInput
              name="name"
              label="Document Name"
              placeholder="Enter document name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <FormRow>
              <FormSelect
                name="docType"
                label="ประเภทเอกสาร (Type)"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                options={[
                  { value: '10', label: '10 - General (ทั่วไป)' },
                  { value: '20', label: '20 - Specific (เฉพาะ)' }
                ]}
                className="dark:text-slate-200"
              />
              <FormSelect
                name="userLevel"
                label="ระดับชั้นผู้ใช้ (User Level)"
                value={userLevel}
                onChange={(e) => setUserLevel(e.target.value)}
                options={[
                  { value: '0', label: '0 - Commissioned (สัญญาบัตร)' },
                  { value: '1', label: '1 - Non-commissioned (ประทวน)' },
                  { value: '2', label: '2 - Undefined (ไม่ระบุ)' },
                  { value: '3', label: '3 - Both (ประทวน และ สัญญาบัตร)' }
                ]}
                className="dark:text-slate-200"
              />
            </FormRow>
          </div>

          <div>
            <FormInput
              name="appliedTo"
              label="Applied To (การประยุกต์ใช้)"
              placeholder="e.g., เรือทุกลำที่ติดตั้งระบบ CIWS MK15"
              value={appliedTo}
              onChange={(e) => setAppliedTo(e.target.value)}
              required
            />
            <p className="text-xs text-github-text-secondary mt-1">
              This content will be displayed in the Introduction section (ข้อ ๒).
            </p>
          </div>

          {/* Occupation Branch Selection */}
          <div className="border border-github-border-primary rounded-md p-4 bg-github-bg-secondary space-y-3 mt-6">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-github-text-primary">สาขาอาชีพของเอกสาร</span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsManagerOpen(true)}
                  className="text-sm flex items-center gap-1.5 px-3 py-1 border border-gray-300 dark:border-github-border-primary rounded-md text-gray-600 dark:text-github-text-secondary hover:bg-gray-100 dark:hover:bg-github-bg-hover transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  จัดการสาขาอาชีพ
                </button>
              )}
            </div>

            {(() => {
              // Filter: only show main branches that have at least one completed sub-pair
              const completedMainCodes = new Set((completedPairs || []).map(p => p.branch_code));
              const availableMain = branches.filter(b =>
                completedMainCodes.has(b.code) || b.code === originalMain
              );
              // Filter: only show sub-branches that are completed for the selected main
              const completedSubCodes = new Set(
                (completedPairs || []).filter(p => p.branch_code === selectedMain).map(p => p.sub_branch_code)
              );
              const availableSub = subBranches.filter(s =>
                completedSubCodes.has(s.code) || (s.code === originalSub && selectedMain === originalMain)
              );
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-github-text-secondary mb-1">สาขาอาชีพหลัก</label>
                    <select
                      value={selectedMain}
                      onChange={(e) => { setSelectedMain(e.target.value); setSelectedSub(''); loadSubBranches(e.target.value); }}
                      className="w-full text-sm border border-github-border-primary rounded-md bg-github-bg-primary text-github-text-primary p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="" disabled hidden>— เลือกสาขาอาชีพหลัก —</option>
                      {availableMain.map((b) => (
                        <option key={b.code} value={b.code}>{b.code} — {b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-github-text-secondary mb-1">สาขาอาชีพย่อย</label>
                    <select
                      value={selectedSub}
                      onChange={(e) => setSelectedSub(e.target.value)}
                      disabled={!selectedMain}
                      className="w-full text-sm border border-github-border-primary rounded-md bg-github-bg-primary text-github-text-primary p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="" disabled hidden>— เลือกสาขาอาชีพย่อย —</option>
                      {availableSub.map((s) => (
                        <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })()}

            {isCheckingConflict && (
              <div className="text-sm text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded px-3 py-2">
                🔍 กำลังตรวจสอบข้อมูลที่เกี่ยวข้อง...
              </div>
            )}
            {conflictReport && !conflictReport.has_conflict && (selectedMain !== originalMain || selectedSub !== originalSub) && (
              <div className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded px-3 py-2">
                ✅ ไม่พบข้อมูลที่ขัดแย้ง — สามารถเปลี่ยนสาขาได้
              </div>
            )}
            {conflictReport?.has_conflict && (selectedMain !== originalMain || selectedSub !== originalSub) && (
              <div className="text-sm text-yellow-800 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700/50 rounded px-3 py-2">
                ⚠️ <strong>พบข้อมูล Sub-Question ที่ผูกกับสาขาเดิม {conflictReport.affected_question_count} ข้อ</strong>
                <br />
                การเปลี่ยนสาขาจะลบรีเซ็ตกลับเป็น exempted ในหัวข้อ: {conflictReport.affected_section_groups.map(g => `${g}xx`).join(', ')}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-github-border-primary">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={isSubmitting || !name.trim() || !appliedTo.trim() || !selectedMain || !selectedSub}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60">
           <div className="bg-white dark:bg-github-bg-secondary border border-github-border-primary rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
             <h3 className="text-lg font-bold mb-4 text-amber-600">⚠️ ยืนยันการเปลี่ยนสาขาอาชีพ</h3>
             <p className="text-sm mb-4 text-github-text-primary">
               การเปลี่ยนสาขาอาชีพจะรีเซ็ตข้อมูลคำถามย่อย (Sub-Questions) ในส่วนที่เกี่ยวข้อง ({conflictReport?.affected_question_count} รายการ) เป็นการยกเว้นทั้งหมด
             </p>
             <p className="text-xs mb-6 text-red-600 dark:text-red-400 font-medium">ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนได้</p>
             <div className="flex justify-end gap-3">
               <Button type="button" variant="ghost" onClick={() => { setShowConfirmDialog(false); setSelectedMain(originalMain); setSelectedSub(originalSub); }}>ยกเลิก</Button>
               <Button type="button" variant="danger" onClick={() => { setShowConfirmDialog(false); handleSubmit(new Event('submit') as any); }}>ยืนยัน เปลี่ยนสาขาและล้างข้อมูล</Button>
             </div>
           </div>
        </div>
      )}

      <CareerBranchManagerModal
        isOpen={isManagerOpen}
        onClose={() => { setIsManagerOpen(false); loadBranches(); loadCompletedPairs(); if (selectedMain) loadSubBranches(selectedMain); }}
        onSuccess={() => { loadBranches(); loadCompletedPairs(); if (selectedMain) loadSubBranches(selectedMain); }}
        userRole={userRole}
      />
    </div>
  );
};

export default EditMetadataModal;
