import { invoke } from '@tauri-apps/api/tauri';
import React, { useEffect, useState } from 'react';
import PqsEditorLayout from './PqsEditorLayout';
import PqsHeader from './PqsHeader';
import PqsQuestionSection from './PqsQuestionSection';
import PqsReferenceSection, { ReferenceDoc } from './PqsReferenceSection';
import PqsSectionPreview200 from './PqsSectionPreview200';

type ViewMode = 'edit' | 'qualifier' | 'trainee' | 'visitor' | 'print';
type PrintSubView = 'question-only' | 'question-with-key';

// ============ Component ============

interface Pqs200SectionEditorProps {
  docId: string;
  sectionNumber: number;
  title: string;
  subTitle?: string;
  isPreviewMode?: boolean;
  viewMode?: ViewMode;
  printSubView?: PrintSubView; // reserved for future 200-section print sub-view
  onMenuLabelChange?: () => void;
  docBranchMain?: string;
  docBranchSub?: string;
}

const Pqs200SectionEditor: React.FC<Pqs200SectionEditorProps> = ({
  docId,
  sectionNumber,
  title,
  subTitle,
  viewMode = 'edit',
  printSubView: _printSubView200 = 'question-only',
  onMenuLabelChange,
  docBranchMain,
  docBranchSub,
}) => {
  const readOnly = viewMode !== 'edit';
  const isCompact = viewMode !== 'edit' && viewMode !== 'print';
  const [references, setReferences] = useState<ReferenceDoc[]>([]);
  const [currentTitle, setCurrentTitle] = useState(title);
  const [currentMenuLabel, setCurrentMenuLabel] = useState(subTitle || '');
  const [sectionId, setSectionId] = useState<number>(0);
  const [refreshQuestionsTrigger, setRefreshQuestionsTrigger] = useState(0);

  const fetchReferences = async (sId: number) => {
    try {
      const refs = await invoke<any[]>('get_section_references', { sectionId: sId });
      setReferences(refs.map(r => ({
        id: r.id.toString(),
        reference_id: r.reference.id,
        code: r.reference.code,
        title: r.reference.title,
        category: r.reference.category || 'MANUAL',
        classification: r.reference.classification || 'Unclassified',
        resource_type: r.reference.resource_type || 'DOCUMENT',
        file_path: r.reference.file_path || '',
        description: r.reference.title,
        usage_count: r.usage_count || 0
      })));
    } catch (error) {
      console.error("Failed to fetch references:", error);
    }
  };

  // Fetch Section ID and References on mount or when sectionNumber changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const sections = await invoke<any[]>('get_sections_by_document', { documentId: docId });
        const currentSection = sections.find(s => s.section_number === sectionNumber);

        if (currentSection) {
          setSectionId(currentSection.id);
          setCurrentTitle(currentSection.title_th);
          // Strip section number prefix — only menu text part is editable
          const rawLabel = currentSection.menu_label || '';
          const prefix = `${sectionNumber} `;
          setCurrentMenuLabel(rawLabel.startsWith(prefix) ? rawLabel.slice(prefix.length) : rawLabel);
          await fetchReferences(currentSection.id);
        }
      } catch (error) {
        console.error("Failed to fetch section data:", error);
      }
    };
    fetchData();
  }, [docId, sectionNumber]);

  const handleTitleChange = async (newTitle: string) => {
    try {
      await invoke('update_section', {
        args: {
          id: sectionId,
          title_th: newTitle,
          menu_label: `${sectionNumber} ${currentMenuLabel}`.trim()
        }
      });
      setCurrentTitle(newTitle);
    } catch (error) {
      console.error("Failed to update title:", error);
      alert("Failed to save title: " + error);
    }
  };

  const handleSubTitleChange = async (newSubTitle: string) => {
    try {
      await invoke('update_section', {
        args: {
          id: sectionId,
          title_th: currentTitle,
          menu_label: `${sectionNumber} ${newSubTitle}`.trim(),
        }
      });
      setCurrentMenuLabel(newSubTitle);
      onMenuLabelChange?.();
    } catch (error) {
      console.error("Failed to update menu label:", error);
      alert("Failed to save menu label: " + error);
    }
  };

  const handleAddRef = async (ref: Omit<ReferenceDoc, 'id'>) => {
    if (!sectionId) return;
    try {
      const existingRefs = await invoke<any[]>('get_references', { search: ref.code, commonOnly: false });
      let refId = 0;
      const match = existingRefs.find(r => r.code === ref.code);

      if (match) {
        refId = match.id;
      } else {
        const newRef = await invoke<any>('create_reference', {
          request: {
            code: ref.code,
            title: ref.title,
            category: ref.category,
            classification: ref.classification,
            resource_type: ref.resource_type,
            file_path: ref.file_path,
            pqs_id: docId
          }
        });
        refId = newRef.id;
      }

      if (references.some(r => r.reference_id === refId)) {
        alert("เอกสารนี้ถูกเชื่อมโยงอยู่ในรายการแล้วครับ");
        return;
      }

      try {
        await invoke('add_section_reference', {
          sectionId: sectionId,
          referenceId: refId,
          displayOrder: null
        });
      } catch (linkErr: any) {
        const errMsg = linkErr.toString().toLowerCase();
        if (errMsg.includes('unique') || errMsg.includes('already exists') || errMsg.includes('duplicate')) {
          alert("เอกสารนี้ถูกเพิ่มไว้ในรายการแล้วครับ");
        } else {
          throw linkErr;
        }
      }

      await fetchReferences(sectionId);
      setRefreshQuestionsTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Failed to add reference:", error);
      alert("Failed to add reference: " + error);
    }
  };

  const handleEditRef = async (updatedRef: ReferenceDoc) => {
    if (!updatedRef.reference_id) {
      alert("Error: Reference ID not found for update.");
      return;
    }

    try {
      await invoke('update_reference', {
        args: {
          id: updatedRef.reference_id,
          code: updatedRef.code,
          title: updatedRef.title,
          category: updatedRef.category,
          classification: updatedRef.classification,
          resource_type: updatedRef.resource_type,
          file_path: updatedRef.file_path,
          pqs_id: docId
        }
      });

      setReferences(prev => prev.map(r =>
        r.id === updatedRef.id ? { ...r, ...updatedRef } : r
      ));
    } catch (error) {
      console.error("Failed to update reference:", error);
      alert("Failed to update reference: " + error);
    }
  };

  const handleDeleteRef = async (id: string) => {
    try {
      await invoke('remove_section_reference', { sectionRefId: parseInt(id) });
      setReferences(prev => prev.filter(r => r.id !== id));
      setRefreshQuestionsTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Failed to remove reference:", error);
      alert("Failed to remove reference: " + error);
    }
  };

  // Print Mode: Render A4 paper view
  if (viewMode === 'print') {
    return (
      <PqsSectionPreview200
        docId={docId}
        sectionId={sectionId}
        sectionNumber={sectionNumber}
        title={currentTitle}
        references={references}
        sectionGroup={200}
      />
    );
  }

  return (
    <PqsEditorLayout section={sectionNumber.toString()}>

      {/* 1. Header Area */}
      <PqsHeader
        section={sectionNumber.toString()}
        title={currentTitle}
        subTitle={currentMenuLabel || subTitle}
        onTitleChange={readOnly ? undefined : handleTitleChange}
        onSubTitleChange={readOnly ? undefined : handleSubTitleChange}
        readOnly={readOnly}
        metadata={{
          id: docId,
          unit_code: '',
          updated_at: new Date().toISOString()
        }}
      />

      {/* 2. Reference Section */}
      <div className="bg-white dark:bg-slate-900/50 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
        <PqsReferenceSection
          sectionNumber={sectionNumber.toString()}
          sectionGroup={200}
          references={references}
          onAdd={handleAddRef}
          onEdit={handleEditRef}
          onDelete={handleDeleteRef}
          readOnly={readOnly}
          compact={isCompact}
          sectionId={sectionId}
          onRefresh={() => {
            fetchReferences(sectionId);
            setRefreshQuestionsTrigger(prev => prev + 1);
          }}
        />
      </div>

      {/* 3. Question Area — Section 200 Template */}
      <div className="bg-white dark:bg-slate-900/50 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
        <PqsQuestionSection
          docId={docId}
          sectionId={sectionId}
          sectionNumber={sectionNumber}
          sectionGroup={200}
          readOnly={false}
          refreshTrigger={refreshQuestionsTrigger}
          onQuestionsUpdated={() => setRefreshQuestionsTrigger(prev => prev + 1)}
          viewMode={viewMode}
          docBranchMain={docBranchMain}
          docBranchSub={docBranchSub}
          onReferencesUpdated={() => {
            fetchReferences(sectionId);
          }}
        />
      </div>

    </PqsEditorLayout>
  );
};

export default Pqs200SectionEditor;
