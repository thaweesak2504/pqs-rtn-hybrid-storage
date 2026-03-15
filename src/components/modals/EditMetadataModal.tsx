import { invoke } from '@tauri-apps/api/tauri';
import { CheckCircle, Pencil, Plus, X } from 'lucide-react';
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

  // Flag: this open was a fresh document with no branch → auto-select ต้นแบบมาตรฐาน in sub effect
  const isDefaultingFromNull = React.useRef(false);

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

  const selectedMainBranch = branches.find((branch) => branch.code === selectedMain);
  const selectedSubBranch = subBranches.find((branch) => branch.code === selectedSub);
  const isProtectedMainBranch = selectedMainBranch?.name === STANDARD_BRANCH_NAME;
  const isProtectedSubBranch = isProtectedMainBranch && selectedSubBranch?.name === STANDARD_BRANCH_NAME;

  // Load branches and existing document branch on open
  useEffect(() => {
    if (!isOpen) return;
    isDefaultingFromNull.current = false;
    Promise.all([
      invoke<OccupationBranch[]>('get_occupation_branches'),
      invoke<DocumentBranch>('get_document_branch', { docId })
    ]).then(([branchList, docBranch]) => {
      setBranches(branchList);
      if (!docBranch.occupation_branch_main) {
        // No branch stored → default to ต้นแบบมาตรฐาน
        const defaultMain = branchList.find(b => b.name === STANDARD_BRANCH_NAME)?.code || '';
        isDefaultingFromNull.current = true;
        setSelectedMain(defaultMain);
        setSelectedSub('');
      } else {
        setSelectedMain(docBranch.occupation_branch_main);
        setSelectedSub(docBranch.occupation_branch_sub || '');
      }
    }).catch(() => setBranches([]));
  }, [isOpen, docId]);

  // Load sub-branches when main branch changes
  useEffect(() => {
    if (!selectedMain) { setSubBranches([]); setSelectedSub(''); return; }
    invoke<OccupationSubBranch[]>('get_occupation_sub_branches', { branchCode: selectedMain })
      .then((data) => {
        setSubBranches(data);
        if (isDefaultingFromNull.current) {
          isDefaultingFromNull.current = false;
          const defaultSub = data.find(s => s.name === STANDARD_BRANCH_NAME)?.code || '';
          setSelectedSub(defaultSub);
        }
      })
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
          applied_to: appliedTo,
          doc_type: docType,
          user_level: userLevel
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
                      onChange={(e) => { setSelectedMain(e.target.value); setSelectedSub(''); setIsAddingSub(false); }}
                      className="flex-1 text-sm border border-github-border-primary rounded-md bg-github-bg-primary text-github-text-primary p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">— ไม่ระบุ —</option>
                      {branches.map((b) => (
                        <option key={b.code} value={b.code}>{b.code} — {b.name}</option>
                      ))}
                    </select>
                    {selectedMain && !isProtectedMainBranch && (
                      <Button type="button" variant="outline" className="px-3" onClick={() => {
                        setEditingMainCode(selectedMain);
                        setEditingMainName(branches.find(b => b.code === selectedMain)?.name || "");
                      }} title="แก้ไขชื่อสาขา"><Pencil className="w-4 h-4" /></Button>
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
                          <Button type="button" variant="outline" className="px-3" onClick={() => {
                            setEditingSubCode(selectedSub);
                            setEditingSubName(subBranches.find(s => s.code === selectedSub)?.name || "");
                          }} title="แก้ไขชื่อสาขาย่อย"><Pencil className="w-4 h-4" /></Button>
                        )}
                        <Button type="button" variant="outline" className="px-3" onClick={() => setIsAddingSub(true)} title="เพิ่มสาขาย่อยใหม่"><Plus className="w-4 h-4" /></Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {selectedMain && selectedSub && (
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
    </div>
  );
};

export default EditMetadataModal;
