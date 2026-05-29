import { invoke } from '@tauri-apps/api/tauri';
import React, { useEffect, useState } from 'react';
import ConfirmModal from '../modals/ConfirmModal';
import PqsEditorLayout from './PqsEditorLayout';
import PqsHeader from './PqsHeader';
import PqsQuestionSection from './PqsQuestionSection';
import PqsReferenceSection from './PqsReferenceSection';
import { ReferenceDoc } from './reference/types';
import PqsSectionPreview200 from './PqsSectionPreview200';
import ScoreProgressBanner from './ScoreProgressBanner';
import { logger } from '../../utils/logger';

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
  printSubView: printSubView200 = 'question-only',
  onMenuLabelChange,
  docBranchMain,
  docBranchSub,
}) => {
  const readOnly = viewMode !== 'edit' && viewMode !== 'trainee' && viewMode !== 'qualifier';
  const isCompact = viewMode !== 'edit' && viewMode !== 'print';
  const [references, setReferences] = useState<ReferenceDoc[]>([]);
  const [currentTitle, setCurrentTitle] = useState(title);
  const [currentMenuLabel, setCurrentMenuLabel] = useState(subTitle || '');
  const [sectionId, setSectionId] = useState<number>(0);
  const [refreshQuestionsTrigger, setRefreshQuestionsTrigger] = useState(0);
  const [progressRefreshKey, setProgressRefreshKey] = useState(0);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'warning',
  });

  const showAlert = (
    message: string,
    variant: 'danger' | 'warning' | 'info' = 'warning',
    title = 'แจ้งเตือน',
  ) => {
    setAlertModal({ isOpen: true, title, message, variant });
  };

  const fetchReferences = async (sId: number) => {
    try {
      const refs = await invoke<{id: number, reference: {id: number, code: string, title: string, category: string, classification: string, resource_type: string, file_path: string}, usage_count: number}[]>('get_section_references', { sectionId: sId });
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
      logger.error("Failed to fetch references:", error);
    }
  };

  // Fetch Section ID and References on mount or when sectionNumber changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const sections = await invoke<{id: number, section_number: number, title_th: string, menu_label: string}[]>('get_sections_by_document', { documentId: docId });
        const currentSection = sections.find(s => s.section_number === sectionNumber);

        if (currentSection) {
          // Fetch references BEFORE setting sectionId so data is ready when guard passes
          await fetchReferences(currentSection.id);
          setCurrentTitle(currentSection.title_th);
          // Strip section number prefix — only menu text part is editable
          const rawLabel = currentSection.menu_label || '';
          const prefix = `${sectionNumber} `;
          setCurrentMenuLabel(rawLabel.startsWith(prefix) ? rawLabel.slice(prefix.length) : rawLabel);
          setSectionId(currentSection.id);
        }
      } catch (error) {
        logger.error("Failed to fetch section data:", error);
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
      logger.error("Failed to update title:", error);
      showAlert("Failed to save title: " + error, 'danger');
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
      logger.error("Failed to update menu label:", error);
      showAlert("Failed to save menu label: " + error, 'danger');
    }
  };

  const handleAddRef = async (ref: Omit<ReferenceDoc, 'id'>) => {
    if (!sectionId) return;
    try {
      const existingRefs = await invoke<{id: number, code: string}[]>('get_references', { search: ref.code, commonOnly: false });
      let refId = 0;
      const match = existingRefs.find(r => r.code === ref.code);

      if (match) {
        refId = match.id;
      } else {
        const newRef = await invoke<{id: number}>('create_reference', {
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
        showAlert("เอกสารนี้ถูกเชื่อมโยงอยู่ในรายการแล้วครับ", 'warning');
        return;
      }

      try {
        await invoke('add_section_reference', {
          sectionId: sectionId,
          referenceId: refId,
          displayOrder: null
        });
      } catch (linkErr) {
        const errMsg = String(linkErr).toLowerCase();
        if (errMsg.includes('unique') || errMsg.includes('already exists') || errMsg.includes('duplicate')) {
          showAlert("เอกสารนี้ถูกเพิ่มไว้ในรายการแล้วครับ", 'warning');
        } else {
          throw linkErr;
        }
      }

      await fetchReferences(sectionId);
      setRefreshQuestionsTrigger(prev => prev + 1);
    } catch (error) {
      logger.error("Failed to add reference:", error);
      showAlert("Failed to add reference: " + error, 'danger');
    }
  };

  const handleEditRef = async (updatedRef: ReferenceDoc) => {
    if (!updatedRef.reference_id) {
      showAlert("Error: Reference ID not found for update.", 'danger');
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
      logger.error("Failed to update reference:", error);
      showAlert("Failed to update reference: " + error, 'danger');
    }
  };

  const handleDeleteRef = async (id: string) => {
    try {
      await invoke('remove_section_reference', { sectionRefId: parseInt(id) });
      setReferences(prev => prev.filter(r => r.id !== id));
      setRefreshQuestionsTrigger(prev => prev + 1);
    } catch (error) {
      logger.error("Failed to remove reference:", error);
      showAlert("ไม่สามารถลบเอกสารอ้างอิงที่กำลังถูกใช้งานอยู่ได้", 'warning');
    }
  };

  // Wait for sectionId before rendering — prevents empty template flash
  if (!sectionId) return null;

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
        mode={viewMode}
        printSubView={printSubView200}
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

      {/* 1.5. Score Progress Banner (For Trainee & Qualifier) */}
      {(viewMode === 'trainee' || viewMode === 'qualifier') && (
        <div className="mb-6">
          <ScoreProgressBanner
            documentId={docId}
            sectionId={sectionId}
            sectionGroup={200}
            refreshTrigger={progressRefreshKey}
          />
        </div>
      )}

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
          onProgressUpdate={() => setProgressRefreshKey(prev => prev + 1)}
          viewMode={viewMode}
          docBranchMain={docBranchMain}
          docBranchSub={docBranchSub}
          onReferencesUpdated={() => {
            fetchReferences(sectionId);
          }}
        />
      </div>

      <ConfirmModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
      />

    </PqsEditorLayout>
  );
};

export default Pqs200SectionEditor;
