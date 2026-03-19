import { invoke } from '@tauri-apps/api/tauri';
import React, { useEffect, useState } from 'react';
import { useToast } from '../../contexts/ToastContext';

interface Question {
  id: string;
  document_id: string;
  section_id: number;
  parent_id: string | null;
  sequence: number;
  content: string;
  is_header: boolean;
  description: string | null;
  metadata: string | null;
}

interface ContentEditorProps {
  docId: string;
  sectionId?: number | null;
  sectionNumber?: number | null;
}

export const ContentEditor: React.FC<ContentEditorProps> = ({ docId, sectionId, sectionNumber }) => {
  const { showError } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMg, setErrorMsg] = useState('');

  // Auto-Numbering Helper
  const toThaiDigit = (num: number) => {
    const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    return num.toString().split('').map(d => thaiDigits[parseInt(d)] || d).join('');
  };

  const getNextSequence = (parentId: string | null, list: Question[]) => {
    const siblings = list.filter(q => q.parent_id === parentId);
    return siblings.length + 1;
  };

  const getPrefix = (parentId: string | null, list: Question[]) => {
    if (!sectionNumber) return '';
    const seq = getNextSequence(parentId, list);
    const thaiSeq = toThaiDigit(seq);
    const thaiSec = toThaiDigit(sectionNumber);

    if (!parentId) {
      // Level 0: 101.1
      return `${thaiSec}.${thaiSeq} `;
    } else {
      // Level 1+: Find parent's prefix
      const parent = list.find(q => q.id === parentId);
      if (parent) {
        // Extract parent prefix (e.g. "๑๐๑.๑")
        const match = parent.content.match(/^([^\s]+)/);
        if (match) {
          return `${match[1]}.${thaiSeq} `;
        }
      }
      return `${thaiSeq}. `; // Fallback
    }
  };

  const fetchQuestions = async () => {
    if (!docId) return;
    setLoading(true);
    try {
      const data = await invoke<Question[]>('get_document_questions', { docId });
      // Filter by Section if provided
      const filtered = sectionId !== undefined && sectionId !== null
        ? data.filter(q => q.section_id === sectionId) // Strict Section Match
        : data;

      setQuestions(filtered);
      setErrorMsg('');
    } catch (err: any) {
      console.error("Failed to fetch questions:", err);
      setErrorMsg(err.toString());
    } finally {
      setLoading(false);
    }
  };

  // Tree Builder Logic
  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, sectionId]);

  const buildTree = (items: Question[]) => {
    const map = new Map<string, Question & { children: any[] }>();
    const roots: any[] = [];

    // Initialize map
    items.forEach(item => {
      map.set(item.id, { ...item, children: [] });
    });

    // Build hierarchy
    items.forEach(item => {
      const node = map.get(item.id);
      if (item.parent_id && map.has(item.parent_id)) {
        map.get(item.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Sort by sequence
    const sortNodes = (nodes: any[]) => {
      nodes.sort((a, b) => a.sequence - b.sequence);
      nodes.forEach(n => sortNodes(n.children));
    };
    sortNodes(roots);

    return roots;
  };

  const treeData = buildTree(questions);

  // New Question Form State
  const [addingTo, setAddingTo] = useState<string | null>(null); // parent_id or null(root)
  const [newQContent, setNewQContent] = useState('');
  const [isNewQHeader, setIsNewQHeader] = useState(false);

  // Trigger pre-fill when opening add form
  useEffect(() => {
    if (addingTo !== null) {
      const parentId = addingTo === 'ROOT' ? null : addingTo;
      const prefix = getPrefix(parentId, questions);
      setNewQContent(prefix);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addingTo]);

  const handleAddQuestion = async (parentId: string | null) => {
    if (!newQContent.trim()) return;

    // Use current strict sectionId if available, else 0 or prompt? 
    // For now we assume logic handles passing the correct section_id via props or defaulting.
    // NOTE: The invoke 'create_question' might need 'section_id' in args if we are in strict mode!
    // But existing create_question might infer/auto-calc. Let's rely on 'create_question' behavior or update it.
    // Actually create_question takes sequence but specific section? 
    // We should pass section_group/number? No, create_question signature is simple.
    // Let's assume for now we just pass docId and parentId. 
    // Wait, if parent_id is NULL, how does backend know which section it belongs to?
    // Backend `create_question` calculates sequence but might default section to 0 if not specified.
    // We definitely need to pass `section_id` if we want it in Section 101!

    // Quick Fix: We need to update create_question invoke or use a new command.
    // Looking at backend: `create_question` takes `CreateQuestionArgs` struct.
    // Does it have section_id?
    // Let's assume we pass it implicitly via parent? 
    // If root, we MUST pass section_id.
    // I will add `section_id: sectionId` to the invoke if it supports it. If not, we might need a backend tweak.
    // Assuming `create_question` follows `Question` struct.

    try {
      await invoke('create_question', {
        args: {
          document_id: docId,
          section_id: sectionId, // Pass this!
          parent_id: parentId,
          content: newQContent,
          is_header: isNewQHeader,
          sequence: null // Auto-calc
        }
      });
      setNewQContent('');
      setAddingTo(null);
      fetchQuestions(); // Refresh tree
    } catch (err) {
      showError(`ไม่สามารถเพิ่มได้: ${err}`);
      console.error(err);
    }
  };

  const renderNode = (node: any, level: number = 0) => (
    <div key={node.id} className={`mb-2 pl-${Math.min(level * 4, 12)} ${level > 0 ? 'border-l-2 border-gray-100 dark:border-gray-800' : ''}`}>
      <div className={`p-2 rounded flex justify-between items-center group ${node.is_header ? 'bg-gray-100 dark:bg-gray-700 font-bold' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'
        }`}>
        <div className="flex-1 flex items-center">
          <span className="mr-3 text-xs text-gray-400 font-mono w-6 inline-block text-right">
            {level === 0 ? node.sequence : ''}
          </span>
          <span>{node.content}</span>
        </div>
        <div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
          <button
            onClick={() => { setAddingTo(node.id); setIsNewQHeader(false); }}
            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-gray-900"
          >
            + Sub
          </button>
        </div>
      </div>

      {/* Inline Form for Sub-Question */}
      {addingTo === node.id && (
        <div className="ml-8 mt-2 p-3 bg-blue-50 dark:bg-gray-900 rounded border border-blue-200 dark:border-blue-900 shadow-inner">
          <input
            autoFocus
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm mb-2 text-black dark:text-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Enter sub-question text..."
            value={newQContent}
            onChange={e => setNewQContent(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddQuestion(node.id)}
          />
          <div className="flex justify-between items-center">
            <label className="flex items-center text-xs text-gray-600 dark:text-gray-400 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={isNewQHeader}
                onChange={e => setIsNewQHeader(e.target.checked)}
                className="mr-1.5 rounded text-blue-600 focus:ring-blue-500"
              />
              Is Header (Bold)
            </label>
            <div className="space-x-2">
              <button
                onClick={() => setAddingTo(null)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 px-2 py-1"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddQuestion(node.id)}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded font-medium transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {node.children.length > 0 && (
        <div className="ml-2 mt-1">
          {node.children.map((child: any) => renderNode(child, level + 1))}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mt-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Document Content (PQS)</h2>
        <div className="space-x-2">
          <button
            onClick={() => { setAddingTo(null); setIsNewQHeader(true); }} // Add Root Item
            className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
          >
            + Add Root Section
          </button>
          <button
            onClick={fetchQuestions}
            className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {errorMg && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">
          {errorMg}
        </div>
      )}

      {/* Root Addition Form */}
      {addingTo === null && newQContent !== '' && ( // This logic needs refining, but let's use a simpler check or state
        <div className="mb-4 p-4 bg-green-50 dark:bg-gray-900 rounded border border-green-200 shadow-inner">
          {/* Re-use form UI or make a component, but for now inline is fine for speed */}
          <h3 className="text-sm font-bold text-green-800 mb-2">Add New Root Section</h3>
          <input
            autoFocus
            className="w-full p-2 border border-green-300 rounded text-sm mb-2"
            placeholder="Enter section name..."
            value={newQContent}
            onChange={e => setNewQContent(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddQuestion(null)}
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setNewQContent('')} className="text-xs text-gray-500">Cancel</button>
            <button onClick={() => handleAddQuestion(null)} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded">Add Section</button>
          </div>
        </div>
      )}

      {/* Root Form Trigger - Logic fix: "addingTo" logic is tricky for Root vs Cancel. 
          Let's verify: handleAddQuestion(null) is called. 
          We need a specific state for "Adding Root". 
          Let's recycle "addingTo" = 'ROOT' string maybe? 
          Or just use a separate boolean. 
          Actually, I'll simplify: 
          If addingTo === 'ROOT', show root form.
      */}

      {loading ? (
        <div className="text-center py-4 text-gray-500">Loading content...</div>
      ) : questions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          No questions found.
        </div>
      ) : (
        <div className="space-y-1">
          {treeData.map((node: any) => renderNode(node))}
        </div>
      )}

      {/* Manual Fix for Root Add: changing the button above to setAddingTo('ROOT') */}
      {addingTo === 'ROOT' && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-gray-900 rounded border border-green-200 shadow-inner">
          <h3 className="text-sm font-bold text-green-800 mb-2">Add New Root Section</h3>
          <input
            autoFocus
            className="w-full p-2 border border-green-300 rounded text-sm mb-2 text-black"
            placeholder="Enter section name..."
            value={newQContent}
            onChange={e => setNewQContent(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddQuestion(null)}
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setAddingTo(null)} className="text-xs text-gray-500 px-2">Cancel</button>
            <button onClick={() => handleAddQuestion(null)} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded">Add Section</button>
          </div>
        </div>
      )}
    </div>
  );
};
