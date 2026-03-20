import { invoke } from '@tauri-apps/api/tauri';
import { CheckCircle, Pencil, Plus, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { normalizePolicyGuardError } from '../../utils/policyGuards';
import Button from '../ui/Button';
import { FormInput, FormRow, FormSelect } from '../ui/Form';

interface EditMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  docId: string;
  initialName: string;
  initialAppliedTo: string;
  initialDocType: string;
  initialUserLevel: string;
  onSuccess: () => void;
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

const STANDARD_BRANCH_NAME = 'ต้นแบบมาตรฐาน';

const EditMetadataModal: React.FC<EditMetadataModalProps> = ({
  isOpen,
  onClose,
  docId,
  initialName,
  initialAppliedTo,
  initialDocType,
  initialUserLevel,
  onSuccess
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

  // Add branch state
  const [isAddingMain, setIsAddingMain] = useState(false);
  const [newMainName, setNewMainName] = useState('');
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [newSubName, setNewSubName] = useState('');

  // Editing existing branch state
  const [editingMainCode, setEditingMainCode] = useState<string | null>(null);
  const [editingMainName, setEditingMainName] = useState('');
  const [editingSubCode, setEditingSubCode] = useState<string | null>(null);
  const [editingSubName, setEditingSubName] = useState('');

  // Delete branch state
  const [deleteDialog, setDeleteDialog] = useState<{
    type: 'main' | 'sub';
    code: string;
    name: string;
    branchCode?: string;
    isChecking: boolean;
    report: { is_used: boolean; document_count: number; document_names: string[] } | null;
  } | null>(null);

  const selectedMainBranch = branches.find((branch) => branch.code === selectedMain);
  const selectedSubBranch = subBranches.find((branch) => branch.code === selectedSub);
  const isProtectedMainBranch = selectedMainBranch?.name === STANDARD_BRANCH_NAME;
  const isProtectedSubBranch = isProtectedMainBranch && selectedSubBranch?.name === STANDARD_BRANCH_NAME;

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

  // Handler: Open delete dialog and check usage
  const handleDeleteBranch = async (type: 'main' | 'sub', code: string, name: string, branchCode?: string) => {
    // Open dialog immediately in "checking" state
    setDeleteDialog({ type, code, name, branchCode, isChecking: true, report: null });

    try {
      const report = type === 'main'
        ? await invoke<{ is_used: boolean; document_count: number; document_names: string[] }>('check_branch_usage_global', { branchCode: code })
        : await invoke<{ is_used: boolean; document_count: number; document_names: string[] }>('check_sub_branch_usage_global', { branchCode: branchCode!, subCode: code });

      setDeleteDialog(prev => prev ? { ...prev, isChecking: false, report } : null);
    } catch (err) {
      console.error('Failed to check branch usage:', err);
      // Show error inside dialog
      setDeleteDialog(prev => prev ? { ...prev, isChecking: false, report: null } : null);
    }
  };

  // Handler: Confirm delete after user confirmation
  const handleConfirmDelete = async () => {
    if (!deleteDialog || deleteDialog.report?.is_used) return;

    try {
      if (deleteDialog.type === 'main') {
        await invoke('delete_occupation_branch', { code: deleteDialog.code });
        setBranches(prev => prev.filter(b => b.code !== deleteDialog.code));
        if (selectedMain === deleteDialog.code) {
          const standardBranch = branches.find(b => b.name === STANDARD_BRANCH_NAME);
          setSelectedMain(standardBranch?.code || '');
          setSelectedSub('');
          if (standardBranch) loadSubBranches(standardBranch.code);
        }
      } else {
        await invoke('delete_occupation_sub_branch', { code: deleteDialog.code, branchCode: deleteDialog.branchCode! });
        setSubBranches(prev => prev.filter(s => s.code !== deleteDialog.code));
        if (selectedSub === deleteDialog.code) {
          const standardSub = subBranches.find(s => s.name === STANDARD_BRANCH_NAME);
          setSelectedSub(standardSub?.code || '');
        }
      }
      setDeleteDialog(null);
    } catch (err) {
      console.error('Failed to delete branch:', err);
      setDeleteDialog(null);
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
      invoke<DocumentBranch>('get_document_branch', { docId })
    ]).then(async ([branchList, docBranch]) => {
      setBranches(branchList);

      let mainCode = docBranch.occupation_branch_main;
      let subCode = docBranch.occupation_branch_sub;

      // Default to ต้นแบบมาตรฐาน if main is missing
      if (!mainCode) {
        mainCode = branchList.find(b => b.name === STANDARD_BRANCH_NAME)?.code || '';
      }

      // Load sub-branches inline — no second useEffect needed
      let subList: OccupationSubBranch[] = [];
      if (mainCode) {
        try {
          subList = await invoke<OccupationSubBranch[]>('get_occupation_sub_branches', { branchCode: mainCode });
        } catch { /* ignore */ }
      }

      // Default sub to ต้นแบบมาตรฐาน if missing
      if (!subCode && mainCode) {
        subCode = subList.find(s => s.name === STANDARD_BRANCH_NAME)?.code || '';
      }

      // Set all state together — no race condition
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

    // If sub-branch is empty, revert to ต้นแบบมาตรฐาน before saving
    let effectiveSub = selectedSub;
    if (!effectiveSub && selectedMain) {
      const standardSub = subBranches.find(s => s.name === STANDARD_BRANCH_NAME)?.code || '';
      effectiveSub = standardSub;
      setSelectedSub(standardSub);
    }

    const branchChanged = selectedMain !== originalMain || effectiveSub !== originalSub;

    // Check if we need confirmation for branch change with conflict
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

      // Save branch selection to document
      if (branchChanged && conflictReport?.has_conflict) {
        // Use reset flow for conflicting branch changes
        await invoke<CareerBranchResetReport>('reset_and_update_career_branch', {
          docId,
          newMain: selectedMain || null,
          newSub: effectiveSub || null,
        });
      } else {
        // Normal flow for non-conflicting changes
        await invoke('update_document_branch', {
          docId,
          branchMain: selectedMain || null,
          branchSub: effectiveSub || null,
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

          {/* Occupation Branch (Document-level) */}
          <div className="border border-github-border-primary rounded-md p-4 bg-github-bg-secondary space-y-4 mt-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold text-github-text-primary">สาขาอาชีพของเอกสาร (Document Branch Selection)</span>
              <span className="text-xs text-github-text-secondary">(บังคับใช้ทั้งเล่ม)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Main Branch */}
              <div>
                <label className="block text-sm font-medium text-github-text-secondary mb-1">สาขาอาชีพหลัก</label>
                {isAddingMain ? (
                  <div className="flex gap-2">
                    <input type="text" placeholder="ชื่อสาขา" maxLength={50} value={newMainName} onChange={e => setNewMainName(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-github-border-primary rounded-md bg-github-bg-primary text-github-text-primary focus:outline-none focus:ring-1 focus:ring-blue-500" autoFocus />
                    <Button type="button" variant="primary" onClick={async () => {
                      if (!newMainName.trim()) return;
                      const nc = (branches.length + 1).toString();
                      try {
                        const created = await invoke<OccupationBranch>('create_occupation_branch', { code: nc, name: newMainName.trim() });
                        setBranches(prev => [...prev, created]);
                        setSelectedMain(nc);
                        setSelectedSub("");
                        loadSubBranches(nc);
                      } catch (e) { console.error(e); }
                      setNewMainName(""); setIsAddingMain(false);
                    }}><CheckCircle className="w-4 h-4" /></Button>
                    <Button type="button" variant="outline" onClick={() => { setNewMainName(""); setIsAddingMain(false); }}><X className="w-4 h-4" /></Button>
                  </div>
                ) : editingMainCode ? (
                  <div className="flex gap-2">
                    <input type="text" maxLength={50} value={editingMainName} onChange={e => setEditingMainName(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-github-border-primary rounded-md bg-github-bg-primary text-github-text-primary focus:outline-none focus:ring-1 focus:ring-blue-500" autoFocus />
                    <Button type="button" variant="primary" onClick={async () => {
                      if (!editingMainName.trim()) return;
                      try {
                        await invoke('update_occupation_branch', { code: editingMainCode, name: editingMainName.trim() });
                        setBranches(prev => prev.map(b => b.code === editingMainCode ? { ...b, name: editingMainName.trim() } : b));
                        setEditingMainCode(null);
                      } catch (e) { console.error(e); }
                    }}><CheckCircle className="w-4 h-4" /></Button>
                    <Button type="button" variant="outline" onClick={() => setEditingMainCode(null)}><X className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select
                      value={selectedMain}
                      onChange={(e) => { setSelectedMain(e.target.value); setSelectedSub(''); setIsAddingSub(false); loadSubBranches(e.target.value); }}
                      className="flex-1 text-sm border border-github-border-primary rounded-md bg-github-bg-primary text-github-text-primary p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">— ไม่ระบุ —</option>
                      {branches.map((b) => (
                        <option key={b.code} value={b.code}>{b.code} — {b.name}</option>
                      ))}
                    </select>
                    {selectedMain && !isProtectedMainBranch && (
                      <>
                        <Button type="button" variant="outline" className="px-3" onClick={() => {
                          setEditingMainCode(selectedMain);
                          setEditingMainName(branches.find(b => b.code === selectedMain)?.name || "");
                        }} title="แก้ไขชื่อสาขา"><Pencil className="w-4 h-4" /></Button>
                        <Button type="button" variant="outline" className="px-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => {
                          const branch = branches.find(b => b.code === selectedMain);
                          if (branch) handleDeleteBranch('main', selectedMain, branch.name);
                        }} title="ลบสาขา"><Trash2 className="w-4 h-4" /></Button>
                      </>
                    )}
                    <Button type="button" variant="outline" className="px-3" onClick={() => setIsAddingMain(true)} title="เพิ่มสาขาใหม่"><Plus className="w-4 h-4" /></Button>
                  </div>
                )}
              </div>

              {/* Sub Branch */}
              <div>
                <label className="block text-sm font-medium text-github-text-secondary mb-1">สาขาอาชีพย่อย</label>
                {selectedMain && isAddingSub ? (
                  <div className="flex gap-2">
                    <input type="text" placeholder="ชื่อสาขาย่อย" maxLength={50} value={newSubName} onChange={e => setNewSubName(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-github-border-primary rounded-md bg-github-bg-primary text-github-text-primary focus:outline-none focus:ring-1 focus:ring-blue-500" autoFocus />
                    <Button type="button" variant="primary" onClick={async () => {
                      if (!newSubName.trim()) return;
                      const nc = (subBranches.length + 1).toString();
                      try {
                        const created = await invoke<OccupationSubBranch>('create_occupation_sub_branch', { code: nc, branchCode: selectedMain, name: newSubName.trim() });
                        setSubBranches(prev => [...prev, created]);
                        setSelectedSub(nc);
                      } catch (e) { console.error(e); }
                      setNewSubName(""); setIsAddingSub(false);
                    }}><CheckCircle className="w-4 h-4" /></Button>
                    <Button type="button" variant="outline" onClick={() => { setNewSubName(""); setIsAddingSub(false); }}><X className="w-4 h-4" /></Button>
                  </div>
                ) : selectedMain && editingSubCode ? (
                  <div className="flex gap-2">
                    <input type="text" maxLength={50} value={editingSubName} onChange={e => setEditingSubName(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-github-border-primary rounded-md bg-github-bg-primary text-github-text-primary focus:outline-none focus:ring-1 focus:ring-blue-500" autoFocus />
                    <Button type="button" variant="primary" onClick={async () => {
                      if (!editingSubName.trim()) return;
                      try {
                        await invoke('update_occupation_sub_branch', { code: editingSubCode, branchCode: selectedMain, name: editingSubName.trim() });
                        setSubBranches(prev => prev.map(s => s.code === editingSubCode ? { ...s, name: editingSubName.trim() } : s));
                        setEditingSubCode(null);
                      } catch (e) { console.error(e); }
                    }}><CheckCircle className="w-4 h-4" /></Button>
                    <Button type="button" variant="outline" onClick={() => setEditingSubCode(null)}><X className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select
                      value={selectedSub}
                      onChange={(e) => setSelectedSub(e.target.value)}
                      disabled={!selectedMain}
                      className="flex-1 text-sm border border-github-border-primary rounded-md bg-github-bg-primary text-github-text-primary p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">— ไม่ระบุ —</option>
                      {subBranches.map((s) => (
                        <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
                      ))}
                    </select>
                    {selectedMain && (
                      <>
                        {selectedSub && !isProtectedSubBranch && (
                          <>
                            <Button type="button" variant="outline" className="px-3" onClick={() => {
                              setEditingSubCode(selectedSub);
                              setEditingSubName(subBranches.find(s => s.code === selectedSub)?.name || "");
                            }} title="แก้ไขชื่อสาขาย่อย"><Pencil className="w-4 h-4" /></Button>
                            <Button type="button" variant="outline" className="px-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => {
                              const subBranch = subBranches.find(s => s.code === selectedSub);
                              if (subBranch) handleDeleteBranch('sub', selectedSub, subBranch.name, selectedMain);
                            }} title="ลบสาขาย่อย"><Trash2 className="w-4 h-4" /></Button>
                          </>
                        )}
                        <Button type="button" variant="outline" className="px-3" onClick={() => setIsAddingSub(true)} title="เพิ่มสาขาย่อยใหม่"><Plus className="w-4 h-4" /></Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {isCheckingConflict && (
              <div className="text-sm text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded px-3 py-2">
                🔍 กำลังตรวจสอบข้อมูลที่เกี่ยวข้อง...
              </div>
            )}
            {conflictReport?.has_conflict && (selectedMain !== originalMain || selectedSub !== originalSub) && (
              <div className="text-sm text-yellow-800 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700/50 rounded px-3 py-2">
                ⚠️ <strong>พบข้อมูล Sub-Question ที่ผูกกับสาขาเดิม {conflictReport.affected_question_count} ข้อ</strong>
                <br />
                การเปลี่ยนสาขาจะลบข้อมูลและรีเซ็ตกลับเป็น exempted ในหัวข้อ: {conflictReport.affected_section_groups.map((g: number) => `${g}xx.${g === 200 ? '2, 4' : '2-5'}`).join(', ')}
              </div>
            )}
            {selectedMain && selectedSub && !conflictReport?.has_conflict && (selectedMain !== originalMain || selectedSub !== originalSub) && !isCheckingConflict && (
              <div className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded px-3 py-2">
                ✅ ไม่พบข้อมูลที่ขัดแย้ง — สามารถเปลี่ยนสาขาได้
              </div>
            )}
            {selectedMain && selectedSub && (selectedMain === originalMain && selectedSub === originalSub) && (
              <div className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded px-3 py-2">
                ✅ <strong>{branches.find(b => b.code === selectedMain)?.name} / {subBranches.find(s => s.code === selectedSub)?.name}</strong> จะถูกใช้งานเป็นสาขาหลักในทุก Section (เช่น 2xx.2, 3xx.2)
              </div>
            )}
            {selectedMain && !selectedSub && (
              <div className="text-sm text-github-danger dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded px-3 py-2">
                ⚠️ กรุณาเลือกสาขาอาชีพย่อยด้วยเพื่อความสมบูรณ์
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !name.trim() || !appliedTo.trim()}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>

      {/* Confirmation Dialog for Branch Change with Conflict */}
      {showConfirmDialog && conflictReport?.has_conflict && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white dark:bg-github-bg-secondary border border-github-border-primary rounded-lg shadow-2xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-bold text-github-text-primary mb-4">
                ⚠️ ยืนยันการเปลี่ยนสาขาอาชีพ
              </h3>
              <div className="text-sm text-github-text-secondary space-y-3 mb-6">
                <p>
                  การเปลี่ยนสาขาอาชีพจะส่งผลกระทบต่อข้อมูลที่มีอยู่:
                </p>
                <ul className="list-disc list-inside space-y-1 text-github-text-primary">
                  <li>ลบ Sub-Question Links: <strong>{conflictReport.affected_question_count}</strong> ข้อ</li>
                  <li>รีเซ็ตหัวข้อกลับเป็น <strong>exempted</strong></li>
                  <li>ลบ Answer Keys และ User Answers ที่เกี่ยวข้อง</li>
                </ul>
                <p className="text-yellow-700 dark:text-yellow-400 font-medium">
                  ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนได้
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setSelectedMain(originalMain);
                    setSelectedSub(originalSub);
                    setConflictReport(null);
                  }}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    setShowConfirmDialog(false);
                    handleSubmit(new Event('submit') as any);
                  }}
                >
                  ยืนยัน เปลี่ยนสาขาและล้างข้อมูล
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Branch Dialog — self-contained: checking → blocked / allowed */}
      {deleteDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white dark:bg-github-bg-secondary border border-github-border-primary rounded-lg shadow-2xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-bold text-github-text-primary mb-4">
                {deleteDialog.report?.is_used ? '⚠️' : '🗑️'} ลบ{deleteDialog.type === 'main' ? 'สาขาอาชีพหลัก' : 'สาขาอาชีพย่อย'}
              </h3>
              <div className="text-sm text-github-text-secondary space-y-3 mb-6">
                <p>
                  {deleteDialog.type === 'main' ? 'สาขา' : 'สาขาย่อย'}: <strong className="text-github-text-primary">{deleteDialog.name}</strong> ({deleteDialog.code})
                </p>

                {/* State 1: Checking usage */}
                {deleteDialog.isChecking && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded px-3 py-2">
                    <p className="text-blue-700 dark:text-blue-400 text-xs">🔍 กำลังตรวจสอบการใช้งาน...</p>
                  </div>
                )}

                {/* State 2: Branch is in use — BLOCKED */}
                {deleteDialog.report?.is_used && (
                  <>
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded px-3 py-2">
                      <p className="text-red-700 dark:text-red-400 text-xs font-medium">
                        ❌ ไม่สามารถลบได้ — กำลังถูกใช้งานใน {deleteDialog.report.document_count} เอกสาร
                      </p>
                    </div>
                    <div className="bg-github-bg-primary border border-github-border-primary rounded px-3 py-2 max-h-32 overflow-y-auto">
                      <p className="text-xs font-medium text-github-text-secondary mb-1">เอกสารที่ใช้สาขานี้:</p>
                      <ul className="text-xs text-github-text-primary space-y-0.5">
                        {deleteDialog.report.document_names.map((name, i) => (
                          <li key={i}>• {name}</li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-xs text-github-text-secondary">
                      กรุณาเปลี่ยนสาขาอาชีพในเอกสารเหล่านี้ก่อน จึงจะลบสาขานี้ได้
                    </p>
                  </>
                )}

                {/* State 3: Branch is NOT in use — safe to delete */}
                {deleteDialog.report && !deleteDialog.report.is_used && (
                  <>
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded px-3 py-2">
                      <p className="text-green-700 dark:text-green-400 text-xs">
                        ✅ ไม่พบเอกสารที่ใช้สาขานี้ — ปลอดภัยที่จะลบ
                      </p>
                    </div>
                    <p className="text-yellow-700 dark:text-yellow-400 font-medium text-xs">
                      ⚠️ การกระทำนี้ไม่สามารถย้อนกลับได้
                    </p>
                  </>
                )}

                {/* State 4: Error checking */}
                {!deleteDialog.isChecking && !deleteDialog.report && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded px-3 py-2">
                    <p className="text-red-700 dark:text-red-400 text-xs">❌ ไม่สามารถตรวจสอบการใช้งานได้</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <Button type="button" variant="ghost" onClick={() => setDeleteDialog(null)}>
                  {deleteDialog.report?.is_used ? 'ปิด' : 'ยกเลิก'}
                </Button>
                {deleteDialog.report && !deleteDialog.report.is_used && (
                  <Button type="button" variant="danger" onClick={handleConfirmDelete}>
                    ยืนยัน ลบ{deleteDialog.type === 'main' ? 'สาขา' : 'สาขาย่อย'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditMetadataModal;
