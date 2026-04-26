import { invoke } from '@tauri-apps/api/tauri';
import React, { useEffect, useState } from 'react';
import ConfirmModal from '../modals/ConfirmModal';
import PqsEditorLayout from './PqsEditorLayout';
import PqsHeader from './PqsHeader';
import PqsQuestionSection from './PqsQuestionSection';
import PqsReferenceSection, { ReferenceDoc } from './PqsReferenceSection';
import PqsSectionPreview100 from './PqsSectionPreview100';
import ScoreProgressBanner from './ScoreProgressBanner';
import { logger } from '../../utils/logger';

type ViewMode = 'edit' | 'qualifier' | 'trainee' | 'visitor' | 'print';
type PrintSubView = 'question-only' | 'question-with-key';

interface PqsSectionEditorProps {
  docId: string;
  sectionNumber: number;
  title: string;
  subTitle?: string;
  isPreviewMode?: boolean;
  viewMode?: ViewMode;
  printSubView?: PrintSubView;
  onMenuLabelChange?: () => void;
}

const PqsSectionEditor: React.FC<PqsSectionEditorProps> = ({
  docId,
  sectionNumber,
  title,
  subTitle,
  viewMode = 'edit',
  printSubView = 'question-only',
  onMenuLabelChange,
}) => {
  const readOnly = viewMode !== 'edit';
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
        usage_count: r.usage_count || 0 // Added usage_count
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
          // Strip section number prefix (e.g. "101 " from "101 Gunner Mate") — only text part is editable
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
          menu_label: `${sectionNumber} ${currentMenuLabel}`.trim(),
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
      onMenuLabelChange?.(); // refresh sidebar
    } catch (error) {
      logger.error("Failed to update menu label:", error);
      showAlert("Failed to save menu label: " + error, 'danger');
    }
  };

  const handleAddRef = async (ref: Omit<ReferenceDoc, 'id'>) => {
    if (!sectionId) return;
    try {
      // 1. Create Reference (or retrieve if code exists - logic needs to be robust)
      // For now, naive create. If fails (duplicate), we might need to search.
      // Let's try to search first to be safe.
      const existingRefs = await invoke<{id: number, code: string}[]>('get_references', { search: ref.code, commonOnly: false });
      let refId = 0;
      const match = existingRefs.find(r => r.code === ref.code);

      if (match) {
        refId = match.id;
      } else {
        // Create new
        const newRef = await invoke<{id: number}>('create_reference', {
          request: {
            code: ref.code,
            title: ref.title,
            category: ref.category,
            classification: ref.classification,
            resource_type: ref.resource_type,
            file_path: ref.file_path,
            pqs_id: docId // Pass PQS ID for folder organization
          }
        });
        refId = newRef.id;
      }

      // 2. Check if already linked to THIS section locally to avoid backend error
      if (references.some(r => r.reference_id === refId)) {
        showAlert("เอกสารนี้ถูกเชื่อมโยงอยู่ในรายการแล้วครับ", 'warning');
        return;
      }

      // 3. Link to Section
      try {
        await invoke('add_section_reference', {
          sectionId: sectionId,
          referenceId: refId,
          displayOrder: null // Auto append
        });
      } catch (linkErr) {
        // If it's already linked in DB (even if UI was out of sync)
        const errMsg = String(linkErr).toLowerCase();
        if (errMsg.includes('unique') || errMsg.includes('already exists') || errMsg.includes('duplicate')) {
          showAlert("เอกสารนี้ถูกเพิ่มไว้ในรายการแล้วครับ", 'warning');
        } else {
          throw linkErr;
        }
      }

      // 4. Refresh List
      await fetchReferences(sectionId);
      setRefreshQuestionsTrigger(prev => prev + 1); // Trigger question refresh

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
          pqs_id: docId // Pass PQS ID
        }
      });

      // Refresh list to show updates
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
      // id is section_reference_id
      await invoke('remove_section_reference', { sectionRefId: parseInt(id) });
      // Update local state directly for speed
      setReferences(prev => prev.filter(r => r.id !== id));
      setRefreshQuestionsTrigger(prev => prev + 1); // Trigger question refresh
    } catch (error) {
      logger.error("Failed to remove reference:", error);
      showAlert("ไม่สามารถลบเอกสารอ้างอิงที่กำลังถูกใช้งานอยู่ได้", 'warning');
    }
  };

  // Wait for sectionId before rendering — prevents empty template flash
  if (!sectionId) return null;

  // Preview Mode: Render A4 paper view
  if (viewMode === 'print') {
    return (
      <PqsSectionPreview100
        docId={docId}
        sectionId={sectionId}
        sectionNumber={sectionNumber}
        title={currentTitle}
        references={references}
        mode={viewMode}
        printSubView={printSubView}
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
        onTitleChange={readOnly || sectionNumber === 101 ? undefined : handleTitleChange}
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
            sectionGroup={100}
            refreshTrigger={progressRefreshKey}
          />
        </div>
      )}

      {/* 2. Reference Section */}
      <div className="bg-white dark:bg-slate-900/50 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
        <PqsReferenceSection
          sectionNumber={sectionNumber.toString()}
          references={references}
          onAdd={handleAddRef}
          onEdit={handleEditRef}
          onDelete={handleDeleteRef}
          readOnly={readOnly}
          compact={isCompact}
          sectionId={sectionId}
          onRefresh={() => {
            fetchReferences(sectionId);
            setRefreshQuestionsTrigger(prev => prev + 1); // Trigger question refresh
          }}
        />
      </div>

      {/* 3. Question Area */}
      <div className="bg-white dark:bg-slate-900/50 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
        <PqsQuestionSection
          docId={docId}
          sectionId={sectionId}
          sectionNumber={sectionNumber}
          sectionGroup={100}
          readOnly={false}
          refreshTrigger={refreshQuestionsTrigger}
          onQuestionsUpdated={() => setRefreshQuestionsTrigger(prev => prev + 1)}
          onProgressUpdate={() => setProgressRefreshKey(prev => prev + 1)}
          onReferencesUpdated={() => {
            fetchReferences(sectionId);
          }}
          viewMode={viewMode}
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

export default PqsSectionEditor;
