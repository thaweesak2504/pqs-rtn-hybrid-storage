import { invoke } from '@tauri-apps/api/tauri';
import { X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Button from '../ui/Button';
import { FormInput } from '../ui/Form';

interface EditMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  docId: string;
  initialName: string;
  initialAppliedTo: string;
  onSuccess: () => void;
}

interface OccupationBranch { code: string; name: string; }
interface OccupationSubBranch { code: string; branch_code: string; name: string; }
interface DocumentBranch { occupation_branch_main: string | null; occupation_branch_sub: string | null; }

const EditMetadataModal: React.FC<EditMetadataModalProps> = ({
  isOpen,
  onClose,
  docId,
  initialName,
  initialAppliedTo,
  onSuccess
}) => {
  const [name, setName] = useState(initialName);
  const [appliedTo, setAppliedTo] = useState(initialAppliedTo);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Branch selection state
  const [branches, setBranches] = useState<OccupationBranch[]>([]);
  const [subBranches, setSubBranches] = useState<OccupationSubBranch[]>([]);
  const [selectedMain, setSelectedMain] = useState<string>('');
  const [selectedSub, setSelectedSub] = useState<string>('');

  // Load branches and existing document branch on open
  useEffect(() => {
    if (!isOpen) return;
    // Load global branches
    invoke<OccupationBranch[]>('get_occupation_branches')
      .then(setBranches)
      .catch(() => setBranches([]));
    // Load document's current branch
    invoke<DocumentBranch>('get_document_branch', { docId })
      .then((b) => {
        setSelectedMain(b.occupation_branch_main || '');
        setSelectedSub(b.occupation_branch_sub || '');
      })
      .catch(() => { });
  }, [isOpen, docId]);

  // Load sub-branches when main branch changes
  useEffect(() => {
    if (!selectedMain) { setSubBranches([]); setSelectedSub(''); return; }
    invoke<OccupationSubBranch[]>('get_occupation_sub_branches', { branchCode: selectedMain })
      .then(setSubBranches)
      .catch(() => setSubBranches([]));
  }, [selectedMain]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await invoke('update_document', {
        args: {
          id: docId,
          name,
          applied_to: appliedTo
        }
      });

      // Save branch selection to document
      await invoke('update_document_branch', {
        docId,
        branchMain: selectedMain || null,
        branchSub: selectedSub || null,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to update document:', err);
      setErrorMsg(`Failed to update: ${err}`);
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
          <div className="border border-orange-200 dark:border-orange-800/50 rounded-md p-3 bg-orange-50/30 dark:bg-orange-950/20 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">สาขาอาชีพของเอกสาร</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">(ใช้ทั้งเล่ม)</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Main Branch */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">สาขาอาชีพหลัก</label>
                <select
                  value={selectedMain}
                  onChange={(e) => { setSelectedMain(e.target.value); setSelectedSub(''); }}
                  className="w-full text-sm border border-orange-300 dark:border-orange-700 rounded-md bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-2 focus:outline-none focus:ring-1 focus:ring-orange-400"
                >
                  <option value="">— ไม่ระบุ —</option>
                  {branches.map((b) => (
                    <option key={b.code} value={b.code}>{b.code} — {b.name}</option>
                  ))}
                </select>
              </div>

              {/* Sub Branch */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">สาขาอาชีพย่อย</label>
                <select
                  value={selectedSub}
                  onChange={(e) => setSelectedSub(e.target.value)}
                  disabled={!selectedMain}
                  className="w-full text-sm border border-orange-300 dark:border-orange-700 rounded-md bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-2 focus:outline-none focus:ring-1 focus:ring-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">— ไม่ระบุ —</option>
                  {subBranches.map((s) => (
                    <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedMain && selectedSub && (
              <div className="text-xs text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 rounded px-2 py-1.5">
                ✅ ทุก Section จะโหลดคำถามย่อยของสาขา <strong>{selectedMain} / {selectedSub}</strong> โดยอัตโนมัติ
              </div>
            )}
            {selectedMain && !selectedSub && (
              <div className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ กรุณาเลือกสาขาอาชีพย่อยด้วย
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
    </div>
  );
};

export default EditMetadataModal;
