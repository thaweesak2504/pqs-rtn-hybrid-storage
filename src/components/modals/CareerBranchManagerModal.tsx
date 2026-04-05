import { invoke } from '@tauri-apps/api/tauri';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  CheckCircle,
  Copy,
  Pencil,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '../ui/Button';

interface CareerBranchManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userRole?: string;
}

interface OccupationBranch {
  code: string;
  name: string;
}

interface OccupationSubBranch {
  code: string;
  branch_code: string;
  name: string;
}

interface OccupationSubQuestion {
  id: number;
  branch_code: string;
  sub_branch_code: string;
  code: string;
  text: string;
  always_checked: boolean;
  sequence: number;
}

// Each tab maps to a 2-char code prefix: sCode + lCode
// e.g. '2xx.2' → sCode='2', lCode='2' → prefix '22'
const SECTION_SLOTS = [
  { id: '2xx.2', label: '2xx.2 (ส่วนประกอบ)', type: '200', sCode: '2', lCode: '2' },
  { id: '2xx.4', label: '2xx.4 (ข้อจำกัด)', type: '200', sCode: '2', lCode: '4' },
  { id: '3xx.2', label: '3xx.2 (ปกติ)', type: '300', sCode: '3', lCode: '2' },
  { id: '3xx.3', label: '3xx.3 (พิเศษ)', type: '300', sCode: '3', lCode: '3' },
  { id: '3xx.4', label: '3xx.4 (ขัดข้อง)', type: '300', sCode: '3', lCode: '4' },
  { id: '3xx.5', label: '3xx.5 (ฉุกเฉิน)', type: '300', sCode: '3', lCode: '5' },
];

const STANDARD_BRANCH_NAME = 'ต้นแบบมาตรฐาน';

/** Build the 2-char slot prefix from active tab, e.g. '22' for tab '2xx.2'. */
function slotPrefix(tabId: string): string {
  const slot = SECTION_SLOTS.find(s => s.id === tabId);
  return slot ? `${slot.sCode}${slot.lCode}` : '';
}

/** Build the full code prefix for a specific branch+sub+slot, e.g. '2201standard'. */
function fullPrefix(tabId: string, mainCode: string, subCode: string): string {
  return `${slotPrefix(tabId)}${mainCode}${subCode}`;
}

const CareerBranchManagerModal: React.FC<CareerBranchManagerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userRole
}) => {
  const [branches, setBranches] = useState<OccupationBranch[]>([]);
  const [subBranches, setSubBranches] = useState<OccupationSubBranch[]>([]);
  const [selectedMain, setSelectedMain] = useState<string>('');
  const [selectedSub, setSelectedSub] = useState<string>('');
  
  // Standard Template Reference Data (all sub-questions for the standard branch)
  const [standardSubQuestions, setStandardSubQuestions] = useState<OccupationSubQuestion[]>([]);
  
  // Editor Data — ALL sub-questions for selected main branch (filter client-side by code prefix)
  const [editorSubQuestions, setEditorSubQuestions] = useState<OccupationSubQuestion[]>([]);
  const [activeTab, setActiveTab] = useState<string>('2xx.2');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Branch CRUD state
  const [isAddingMain, setIsAddingMain] = useState(false);
  const [newMainName, setNewMainName] = useState('');
  const [editingMainCode, setEditingMainCode] = useState<string | null>(null);
  const [editingMainName, setEditingMainName] = useState('');
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [editingSubCode, setEditingSubCode] = useState<string | null>(null);
  const [editingSubName, setEditingSubName] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{
    type: 'main' | 'sub';
    code: string;
    name: string;
    branchCode?: string;
    isChecking: boolean;
    report: { is_used: boolean; document_count: number; document_names: string[] } | null;
  } | null>(null);

  const isAdmin = userRole === 'admin';

  // Load ALL sub-questions for a main branch (filter by code prefix client-side)
  const loadEditorSubQuestions = useCallback(async (mainCode: string) => {
    if (!mainCode) return;
    try {
      const data = await invoke<OccupationSubQuestion[]>('get_all_sub_questions_for_branch', { 
        branchCode: mainCode
      });
      setEditorSubQuestions(data);
    } catch (err) {
      console.error('Failed to load sub-questions:', err);
    }
  }, []);

  const loadSubBranches = useCallback(async (mainCode: string) => {
    try {
      const list = await invoke<OccupationSubBranch[]>('get_occupation_sub_branches', { branchCode: mainCode });
      setSubBranches(list);
      if (list.length > 0) {
        setSelectedSub(list[0].code);
        loadEditorSubQuestions(mainCode);
      } else {
        setSelectedSub('');
        setEditorSubQuestions([]);
      }
    } catch (err) {
      console.error('Failed to load sub-branches:', err);
    }
  }, [loadEditorSubQuestions]);

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const branchList = await invoke<OccupationBranch[]>('get_occupation_branches');
      setBranches(branchList);
      
      const stdSubQ = await invoke<OccupationSubQuestion[]>('get_standard_branch_sub_questions');
      setStandardSubQuestions(stdSubQ);
      
      // Default to first non-standard branch if available
      const firstRegular = branchList.find(b => b.name !== STANDARD_BRANCH_NAME);
      if (firstRegular) {
        setSelectedMain(firstRegular.code);
        await loadSubBranches(firstRegular.code);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
      setErrorMsg('ไม่สามารถโหลดข้อมูลสาขาอาชีพได้');
    } finally {
      setIsLoading(false);
    }
  }, [loadSubBranches]);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen, loadInitialData]);

  const handleMainChange = (code: string) => {
    setSelectedMain(code);
    setIsAddingSub(false);
    setEditingSubCode(null);
    loadSubBranches(code);
  };

  const handleSubChange = (code: string) => {
    setSelectedSub(code);
    // No need to reload — editor data is per main branch, sub-branch is part of the code prefix
  };

  // Branch CRUD handlers
  const handleCreateMain = async () => {
    if (!newMainName.trim()) return;
    const nc = (branches.length + 1).toString();
    try {
      const created = await invoke<OccupationBranch>('create_occupation_branch', { code: nc, name: newMainName.trim() });
      setBranches(prev => [...prev, created]);
      setSelectedMain(nc);
      setSelectedSub('');
      loadSubBranches(nc);
      onSuccess?.();
    } catch (e) { console.error(e); }
    setNewMainName(''); setIsAddingMain(false);
  };

  const handleUpdateMain = async () => {
    if (!editingMainName.trim() || !editingMainCode) return;
    try {
      await invoke('update_occupation_branch', { code: editingMainCode, name: editingMainName.trim() });
      setBranches(prev => prev.map(b => b.code === editingMainCode ? { ...b, name: editingMainName.trim() } : b));
      setEditingMainCode(null);
      onSuccess?.();
    } catch (e) { console.error(e); }
  };

  const handleCreateSub = async () => {
    if (!newSubName.trim() || !selectedMain) return;
    const nc = (subBranches.length + 1).toString();
    try {
      const created = await invoke<OccupationSubBranch>('create_occupation_sub_branch', { code: nc, branchCode: selectedMain, name: newSubName.trim() });
      setSubBranches(prev => [...prev, created]);
      setSelectedSub(nc);
      onSuccess?.();
    } catch (e) { console.error(e); }
    setNewSubName(''); setIsAddingSub(false);
  };

  const handleUpdateSub = async () => {
    if (!editingSubName.trim() || !editingSubCode) return;
    try {
      await invoke('update_occupation_sub_branch', { code: editingSubCode, branchCode: selectedMain, name: editingSubName.trim() });
      setSubBranches(prev => prev.map(s => s.code === editingSubCode ? { ...s, name: editingSubName.trim() } : s));
      setEditingSubCode(null);
      onSuccess?.();
    } catch (e) { console.error(e); }
  };

  const handleDeleteBranch = async (type: 'main' | 'sub', code: string, name: string, branchCode?: string) => {
    setDeleteDialog({ type, code, name, branchCode, isChecking: true, report: null });
    try {
      const report = type === 'main'
        ? await invoke<{ is_used: boolean; document_count: number; document_names: string[] }>('check_branch_usage_global', { branchCode: code })
        : await invoke<{ is_used: boolean; document_count: number; document_names: string[] }>('check_sub_branch_usage_global', { branchCode: branchCode!, subCode: code });
      setDeleteDialog(prev => prev ? { ...prev, isChecking: false, report } : null);
    } catch (err) {
      console.error('Failed to check branch usage:', err);
      setDeleteDialog(prev => prev ? { ...prev, isChecking: false, report: null } : null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog || deleteDialog.report?.is_used) return;
    try {
      if (deleteDialog.type === 'main') {
        await invoke('delete_occupation_branch', { code: deleteDialog.code });
        setBranches(prev => prev.filter(b => b.code !== deleteDialog.code));
        if (selectedMain === deleteDialog.code) {
          setSelectedMain(''); setSelectedSub('');
          setSubBranches([]); setEditorSubQuestions([]);
        }
      } else {
        await invoke('delete_occupation_sub_branch', { code: deleteDialog.code, branchCode: deleteDialog.branchCode! });
        setSubBranches(prev => prev.filter(s => s.code !== deleteDialog.code));
        if (selectedSub === deleteDialog.code) {
          setSelectedSub(''); setEditorSubQuestions([]);
        }
      }
      setDeleteDialog(null);
      onSuccess?.();
    } catch (err) {
      console.error('Failed to delete branch:', err);
      setDeleteDialog(null);
    }
  };

  // Filter reference items by the 2-char slot prefix (e.g. '22' for tab '2xx.2')
  const filteredRefItems = useMemo(() => {
    const prefix = slotPrefix(activeTab);
    return standardSubQuestions.filter(q => q.code.startsWith(prefix));
  }, [standardSubQuestions, activeTab]);

  // Filter editor items by the full prefix (slot + main + sub)
  const filteredEditorItems = useMemo(() => {
    if (!selectedMain || !selectedSub) return [];
    const prefix = fullPrefix(activeTab, selectedMain, selectedSub);
    return editorSubQuestions
      .filter(q => q.code.startsWith(prefix))
      .sort((a, b) => a.sequence - b.sequence);
  }, [editorSubQuestions, activeTab, selectedMain, selectedSub]);

  const isProtectedBranch = useMemo(() => {
    const main = branches.find(b => b.code === selectedMain);
    return main?.name === STANDARD_BRANCH_NAME;
  }, [selectedMain, branches]);

  const isProtectedSubBranch = useMemo(() => {
    const sub = subBranches.find(s => s.code === selectedSub);
    return isProtectedBranch || sub?.name === STANDARD_BRANCH_NAME;
  }, [selectedSub, subBranches, isProtectedBranch]);

  const currentSlotType = useMemo(() => {
    return SECTION_SLOTS.find(s => s.id === activeTab)?.type || '200';
  }, [activeTab]);

  /** Generate a unique compound code for a new item in the current tab. */
  const generateNewCode = useCallback((existingItems: OccupationSubQuestion[]) => {
    const prefix = fullPrefix(activeTab, selectedMain, selectedSub);
    // Find the next sequence number not already used
    let seq = existingItems.length + 1;
    const existingCodes = new Set(existingItems.map(q => q.code));
    while (existingCodes.has(`${prefix}${String(seq).padStart(3, '0')}`)) {
      seq++;
    }
    return `${prefix}${String(seq).padStart(3, '0')}`;
  }, [activeTab, selectedMain, selectedSub]);

  // Help keep 300-series mandatory item present
  useEffect(() => {
    if (isOpen && currentSlotType === '300' && !isProtectedBranch && selectedSub && selectedMain) {
      const items = filteredEditorItems;
      const hasMandatory = items.some(q => q.always_checked);
      if (!hasMandatory) {
        const prefix = fullPrefix(activeTab, selectedMain, selectedSub);
        const mandatoryItem: OccupationSubQuestion = {
          id: -Math.random(),
          branch_code: selectedMain,
          sub_branch_code: selectedSub,
          code: `${prefix}Z99`,
          text: 'ลงมือปฏิบัติ/ดำเนินการตามขั้นตอนที่กำหนด',
          always_checked: true,
          sequence: items.length + 1
        };
        setEditorSubQuestions(prev => [...prev, mandatoryItem]);
      }
    }
  }, [activeTab, selectedMain, selectedSub, currentSlotType, isProtectedBranch, filteredEditorItems, isOpen]);

  // Operations for Editor
  const handleAddItem = () => {
    if (isProtectedBranch || !selectedMain || !selectedSub) return;

    const newCode = generateNewCode(filteredEditorItems);
    const newItem: OccupationSubQuestion = {
      id: -Math.random(), // Temporary ID
      branch_code: selectedMain,
      sub_branch_code: selectedSub,
      code: newCode,
      text: '',
      always_checked: false,
      sequence: filteredEditorItems.length + 1
    };

    // If 300 series, the mandatory item must be at the end.
    if (currentSlotType === '300') {
      const items = [...filteredEditorItems];
      const mandatoryIdx = items.findIndex(q => q.always_checked);
      if (mandatoryIdx !== -1) {
        // Insert before mandatory item
        const updated = [...items];
        updated.splice(mandatoryIdx, 0, { ...newItem, sequence: mandatoryIdx + 1 });
        const reIndexed = updated.map((q, i) => ({ ...q, sequence: i + 1 }));
        const prefix = fullPrefix(activeTab, selectedMain, selectedSub);
        const otherItems = editorSubQuestions.filter(q => !q.code.startsWith(prefix));
        setEditorSubQuestions([...otherItems, ...reIndexed]);
        return;
      }
    }

    setEditorSubQuestions([...editorSubQuestions, newItem]);
  };

  const handleUpdateText = (id: number, text: string) => {
    setEditorSubQuestions(editorSubQuestions.map(q => q.id === id ? { ...q, text } : q));
  };

  const handleDeleteItem = (id: number) => {
    if (isProtectedBranch) return;
    
    const item = editorSubQuestions.find(q => q.id === id);
    if (item?.always_checked && currentSlotType === '300') {
      alert('ไม่สามารถลบรายการบังคับ "ลงมือปฏิบัติ" ได้');
      return;
    }

    const remaining = editorSubQuestions.filter(q => q.id !== id);
    // Re-index sequences for current tab
    const prefix = fullPrefix(activeTab, selectedMain, selectedSub);
    const currentTabItems = remaining.filter(q => q.code.startsWith(prefix));
    const reIndexed = currentTabItems.map((q, i) => ({ ...q, sequence: i + 1 }));
    const otherItems = remaining.filter(q => !q.code.startsWith(prefix));
    setEditorSubQuestions([...otherItems, ...reIndexed]);
  };

  const handleMove = (id: number, direction: 'up' | 'down') => {
    if (isProtectedBranch) return;

    const items = [...filteredEditorItems];
    const index = items.findIndex(q => q.id === id);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    // Protection for 300-series mandatory item (must stay last)
    if (currentSlotType === '300') {
      if (items[index].always_checked || items[newIndex].always_checked) {
        return;
      }
    }

    const swapped = [...items];
    [swapped[index], swapped[newIndex]] = [swapped[newIndex], swapped[index]];

    const updatedItems = swapped.map((q, i) => ({ ...q, sequence: i + 1 }));
    const prefix = fullPrefix(activeTab, selectedMain, selectedSub);
    const otherItems = editorSubQuestions.filter(q => !q.code.startsWith(prefix));
    setEditorSubQuestions([...otherItems, ...updatedItems]);
  };

  const handleCopyFromRef = () => {
    if (isProtectedBranch || !selectedMain || !selectedSub) return;
    
    const prefix = fullPrefix(activeTab, selectedMain, selectedSub);
    const newItems = filteredRefItems.map((ref, idx) => ({
      ...ref,
      id: -Math.random() - idx,
      branch_code: selectedMain,
      sub_branch_code: selectedSub,
      // Rewrite code from standard prefix to selected branch prefix
      code: `${prefix}${String(idx + 1).padStart(3, '0')}`,
      sequence: idx + 1
    }));

    const otherItems = editorSubQuestions.filter(q => !q.code.startsWith(prefix));
    setEditorSubQuestions([...otherItems, ...newItems]);
  };

  const handleSave = async () => {
    if (!selectedMain || !selectedSub) return;
    setIsSaving(true);
    setErrorMsg(null);

    try {
      // Collect all editor items for the selected sub-branch (across all tabs)
      const itemsForThisSub = editorSubQuestions.filter(q =>
        q.branch_code === selectedMain && q.sub_branch_code === selectedSub
      );
      const allItemsToCreate = itemsForThisSub.map(q => ({
        branch_code: q.branch_code,
        sub_branch_code: q.sub_branch_code,
        code: q.code,
        text: q.text,
        always_checked: q.always_checked,
        sequence: q.sequence
      }));

      // Delete all existing sub-questions for this main+sub pair
      await invoke('delete_occupation_sub_questions_by_sub_branch', { 
        branchCode: selectedMain, 
        subBranchCode: selectedSub
      });

      if (allItemsToCreate.length > 0) {
        await invoke('batch_create_occupation_sub_questions', { items: allItemsToCreate });
      }
      
      // Reload to get DB-assigned IDs
      await loadEditorSubQuestions(selectedMain);

      onSuccess?.();
      setErrorMsg(null);
    } catch (err) {
      console.error('Save failed:', err);
      setErrorMsg('บันทึกข้อมูลไม่สำเร็จ: ' + (err as string));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-github-bg-secondary border border-github-border-primary rounded-lg shadow-xl w-full max-w-5xl mx-4 h-[85vh] flex flex-col overflow-hidden">

        {/* Header — same pattern as EditMetadataModal */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-github-border-primary">
          <h2 className="text-xl font-bold text-gray-900 dark:text-github-text-primary">
            จัดการข้อคำถามย่อยสาขาอาชีพ (Career Branch Manager)
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-github-text-secondary dark:hover:text-github-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selection + Tabs */}
        <div className="p-4 border-b border-gray-200 dark:border-github-border-primary space-y-3">
          {/* Branch selectors with CRUD */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

            {/* Main Branch */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-github-text-secondary mb-1">สาขาหลัก</label>
              {isAddingMain ? (
                <div className="flex gap-2">
                  <input type="text" placeholder="ชื่อสาขา" maxLength={50} value={newMainName}
                    onChange={e => setNewMainName(e.target.value)} autoFocus
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-github-border-primary rounded-md bg-white dark:bg-github-bg-primary text-gray-900 dark:text-github-text-primary focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <button onClick={handleCreateMain} className="px-2 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors" title="ยืนยัน"><CheckCircle className="w-4 h-4" /></button>
                  <button onClick={() => { setNewMainName(''); setIsAddingMain(false); }} className="px-2 py-1.5 rounded-md border border-gray-300 dark:border-github-border-primary text-gray-500 hover:bg-gray-100 dark:hover:bg-github-bg-hover transition-colors" title="ยกเลิก"><X className="w-4 h-4" /></button>
                </div>
              ) : editingMainCode ? (
                <div className="flex gap-2">
                  <input type="text" maxLength={50} value={editingMainName}
                    onChange={e => setEditingMainName(e.target.value)} autoFocus
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-github-border-primary rounded-md bg-white dark:bg-github-bg-primary text-gray-900 dark:text-github-text-primary focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <button onClick={handleUpdateMain} className="px-2 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors" title="ยืนยัน"><CheckCircle className="w-4 h-4" /></button>
                  <button onClick={() => setEditingMainCode(null)} className="px-2 py-1.5 rounded-md border border-gray-300 dark:border-github-border-primary text-gray-500 hover:bg-gray-100 dark:hover:bg-github-bg-hover transition-colors" title="ยกเลิก"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select value={selectedMain} onChange={(e) => handleMainChange(e.target.value)}
                    className="flex-1 text-sm border border-gray-300 dark:border-github-border-primary rounded-md bg-white dark:bg-github-bg-primary text-gray-900 dark:text-github-text-primary px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">— เลือก —</option>
                    {branches.map(b => <option key={b.code} value={b.code}>{b.code} — {b.name}</option>)}
                  </select>
                  {isAdmin && selectedMain && !isProtectedBranch && (
                    <>
                      <button onClick={() => { setEditingMainCode(selectedMain); setEditingMainName(branches.find(b => b.code === selectedMain)?.name || ''); }}
                        className="px-2 py-1.5 border border-gray-300 dark:border-github-border-primary rounded-md text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-github-bg-hover transition-colors" title="แก้ไขชื่อสาขา">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteBranch('main', selectedMain, branches.find(b => b.code === selectedMain)?.name || '')}
                        className="px-2 py-1.5 border border-gray-300 dark:border-github-border-primary rounded-md text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-github-bg-hover transition-colors" title="ลบสาขา">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {isAdmin && (
                    <button onClick={() => setIsAddingMain(true)}
                      className="px-2 py-1.5 border border-gray-300 dark:border-github-border-primary rounded-md text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-github-bg-hover transition-colors" title="เพิ่มสาขาใหม่">
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Sub Branch */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-github-text-secondary mb-1">สาขาย่อย</label>
              {isAddingSub ? (
                <div className="flex gap-2">
                  <input type="text" placeholder="ชื่อสาขาย่อย" maxLength={50} value={newSubName}
                    onChange={e => setNewSubName(e.target.value)} autoFocus
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-github-border-primary rounded-md bg-white dark:bg-github-bg-primary text-gray-900 dark:text-github-text-primary focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <button onClick={handleCreateSub} className="px-2 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors" title="ยืนยัน"><CheckCircle className="w-4 h-4" /></button>
                  <button onClick={() => { setNewSubName(''); setIsAddingSub(false); }} className="px-2 py-1.5 rounded-md border border-gray-300 dark:border-github-border-primary text-gray-500 hover:bg-gray-100 dark:hover:bg-github-bg-hover transition-colors" title="ยกเลิก"><X className="w-4 h-4" /></button>
                </div>
              ) : editingSubCode ? (
                <div className="flex gap-2">
                  <input type="text" maxLength={50} value={editingSubName}
                    onChange={e => setEditingSubName(e.target.value)} autoFocus
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-github-border-primary rounded-md bg-white dark:bg-github-bg-primary text-gray-900 dark:text-github-text-primary focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <button onClick={handleUpdateSub} className="px-2 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors" title="ยืนยัน"><CheckCircle className="w-4 h-4" /></button>
                  <button onClick={() => setEditingSubCode(null)} className="px-2 py-1.5 rounded-md border border-gray-300 dark:border-github-border-primary text-gray-500 hover:bg-gray-100 dark:hover:bg-github-bg-hover transition-colors" title="ยกเลิก"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select value={selectedSub} onChange={(e) => handleSubChange(e.target.value)} disabled={!selectedMain}
                    className="flex-1 text-sm border border-gray-300 dark:border-github-border-primary rounded-md bg-white dark:bg-github-bg-primary text-gray-900 dark:text-github-text-primary px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50">
                    <option value="">— เลือก —</option>
                    {subBranches.map(s => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
                  </select>
                  {isAdmin && selectedMain && selectedSub && !isProtectedSubBranch && (
                    <>
                      <button onClick={() => { setEditingSubCode(selectedSub); setEditingSubName(subBranches.find(s => s.code === selectedSub)?.name || ''); }}
                        className="px-2 py-1.5 border border-gray-300 dark:border-github-border-primary rounded-md text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-github-bg-hover transition-colors" title="แก้ไขชื่อสาขาย่อย">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteBranch('sub', selectedSub, subBranches.find(s => s.code === selectedSub)?.name || '', selectedMain)}
                        className="px-2 py-1.5 border border-gray-300 dark:border-github-border-primary rounded-md text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-github-bg-hover transition-colors" title="ลบสาขาย่อย">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {isAdmin && selectedMain && !isProtectedBranch && (
                    <button onClick={() => setIsAddingSub(true)}
                      className="px-2 py-1.5 border border-gray-300 dark:border-github-border-primary rounded-md text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-github-bg-hover transition-colors" title="เพิ่มสาขาย่อยใหม่">
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>

          {isProtectedBranch && (
            <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <span>สาขานี้เป็นต้นแบบมาตรฐาน — ไม่สามารถแก้ไขหรือลบได้</span>
            </div>
          )}

          {isLoading && <span className="text-sm text-blue-600 dark:text-blue-400 animate-pulse">กำลังโหลด...</span>}

          {errorMsg && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-2 rounded text-sm">
              {errorMsg}
            </div>
          )}

          {/* Tabs — clean pill style with border for inactive state */}
          <div className="flex flex-wrap gap-2">
            {SECTION_SLOTS.map(slot => (
              <button
                key={slot.id}
                onClick={() => setActiveTab(slot.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                  activeTab === slot.id 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-gray-100 dark:bg-github-bg-tertiary text-gray-600 dark:text-github-text-secondary border-gray-300 dark:border-github-border-primary hover:bg-gray-200 dark:hover:bg-github-bg-hover'
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content — split view */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT: Reference Panel */}
          <div className="w-2/5 border-r border-gray-200 dark:border-github-border-primary flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-github-border-primary bg-gray-50 dark:bg-github-bg-tertiary flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700 dark:text-github-text-secondary flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                ต้นแบบมาตรฐาน (Reference)
              </span>
              {!isProtectedBranch && selectedMain && selectedSub && filteredRefItems.length > 0 && (
                <button 
                  onClick={handleCopyFromRef}
                  className="text-sm flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Copy className="w-3.5 h-3.5" />
                  คัดลอกทั้งหมด
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredRefItems.length > 0 ? (
                filteredRefItems.map((q, idx) => (
                  <div key={idx} className="px-3 py-2 bg-white dark:bg-github-bg-primary border border-gray-200 dark:border-github-border-primary rounded-md">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500 dark:text-github-text-muted font-mono">{q.code}</span>
                      {q.always_checked && (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">บังคับ</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 dark:text-github-text-primary">{q.text || "(ไม่มีข้อความ)"}</p>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-gray-400 dark:text-github-text-muted">
                  ไม่มีข้อมูลต้นแบบสำหรับ Tab นี้
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Editor Panel */}
          <div className="flex-1 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-github-border-primary bg-gray-50 dark:bg-github-bg-tertiary flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700 dark:text-github-text-secondary flex items-center gap-2">
                <Pencil className="w-4 h-4" />
                รายการปัจจุบัน (Editor)
                {filteredEditorItems.length > 0 && (
                  <span className="text-xs font-normal text-gray-400 dark:text-github-text-muted">({filteredEditorItems.length} รายการ)</span>
                )}
              </span>
              {!isProtectedBranch && selectedMain && selectedSub && (
                <button 
                  onClick={handleAddItem}
                  className="text-sm flex items-center gap-1 px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่มข้อใหม่
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredEditorItems.length > 0 ? (
                filteredEditorItems.map((q, idx) => {
                  const isMandatory = q.always_checked && currentSlotType === '300';
                  const isLastItem = idx === filteredEditorItems.length - 1;
                  const isLocked = isProtectedBranch || isMandatory;

                  return (
                    <div 
                      key={q.id} 
                      className={`flex items-start gap-3 px-3 py-3 rounded-md border ${
                        isMandatory 
                          ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-300 dark:border-amber-700/50' 
                          : 'bg-white dark:bg-github-bg-primary border-gray-200 dark:border-github-border-primary'
                      }`}
                    >
                      {/* Row number + move buttons */}
                      <div className="flex flex-col items-center gap-0.5 pt-1 min-w-[28px]">
                        <span className="text-sm font-medium text-gray-500 dark:text-github-text-muted">{idx + 1}</span>
                        {!isLocked && (
                          <>
                            <button 
                              onClick={() => handleMove(q.id, 'up')}
                              disabled={idx === 0}
                              className="p-0.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-20 disabled:hover:text-gray-400"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleMove(q.id, 'down')}
                              disabled={isLastItem || (currentSlotType === '300' && filteredEditorItems[idx+1]?.always_checked)}
                              className="p-0.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-20 disabled:hover:text-gray-400"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-400 dark:text-github-text-muted font-mono">{q.code}</span>
                          {isMandatory && (
                            <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">(บังคับ — ต้องอยู่ท้ายสุด)</span>
                          )}
                        </div>
                        <textarea
                          value={q.text}
                          onChange={(e) => handleUpdateText(q.id, e.target.value)}
                          disabled={isLocked}
                          placeholder="ระบุรายละเอียดข้อคำถามย่อย..."
                          className="w-full border border-gray-300 dark:border-github-border-primary rounded-md bg-white dark:bg-github-bg-primary text-sm text-gray-900 dark:text-github-text-primary px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none disabled:opacity-70 disabled:cursor-not-allowed"
                          rows={2}
                        />
                      </div>

                      {/* Delete button — always visible */}
                      {!isLocked && (
                        <button 
                          onClick={() => handleDeleteItem(q.id)}
                          className="pt-7 px-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="ลบรายการนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-github-text-muted">
                  <p className="text-sm">
                    {!selectedMain || !selectedSub
                      ? 'กรุณาเลือกสาขาหลักและสาขาย่อยก่อน'
                      : 'ยังไม่มีรายการ — กดปุ่ม "เพิ่มข้อใหม่" เพื่อเริ่มต้น'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer — same pattern as EditMetadataModal */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 dark:border-github-border-primary">
          <p className="text-xs text-gray-500 dark:text-github-text-muted">
            การบันทึกจะบันทึกข้อมูลทุก Tab สำหรับสาขาย่อยที่เลือก
          </p>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>ยกเลิก</Button>
            {!isProtectedBranch && (
              <Button 
                variant="primary" 
                onClick={handleSave} 
                loading={isSaving}
                disabled={isSaving || !selectedMain || !selectedSub}
              >
                {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
              </Button>
            )}
          </div>
        </div>

      </div>

      {/* Delete confirmation dialog */}
      {deleteDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white dark:bg-github-bg-secondary border border-github-border-primary rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-github-text-primary">ยืนยันการลบ</h3>
            {deleteDialog.isChecking ? (
              <p className="text-sm text-gray-600 dark:text-github-text-secondary mb-4">กำลังตรวจสอบการใช้งาน...</p>
            ) : deleteDialog.report?.is_used ? (
              <div className="mb-4">
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">ไม่สามารถลบได้ — กำลังถูกใช้งานอยู่ใน {deleteDialog.report.document_count} เอกสาร:</p>
                <ul className="mt-2 text-xs text-gray-600 dark:text-github-text-secondary list-disc list-inside space-y-0.5">
                  {deleteDialog.report.document_names.slice(0, 5).map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-gray-700 dark:text-github-text-secondary mb-4">
                ต้องการลบ <strong>"{deleteDialog.name}"</strong> ? การกระทำนี้ไม่สามารถย้อนกลับได้
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeleteDialog(null)}>ยกเลิก</Button>
              <Button variant="danger" disabled={deleteDialog.isChecking || !!deleteDialog.report?.is_used} onClick={handleConfirmDelete}>ลบ</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CareerBranchManagerModal;
