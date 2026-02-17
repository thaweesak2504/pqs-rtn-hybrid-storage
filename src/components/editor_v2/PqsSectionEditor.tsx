import { invoke } from '@tauri-apps/api/tauri';
import React, { useEffect, useState } from 'react';
import PqsEditorLayout from './PqsEditorLayout';
import PqsHeader from './PqsHeader';
import PqsQuestionSection from './PqsQuestionSection';
import PqsReferenceSection, { ReferenceDoc } from './PqsReferenceSection';

type ViewMode = 'edit' | 'normal' | 'preview';

interface PqsSectionEditorProps {
  docId: string;
  sectionNumber: number;
  title: string;
  subTitle?: string;
  isPreviewMode?: boolean;
  viewMode?: ViewMode;
}

const PqsSectionEditor: React.FC<PqsSectionEditorProps> = ({
  docId,
  sectionNumber,
  title,
  subTitle,
  viewMode = 'edit'
}) => {
  const readOnly = viewMode !== 'edit';
  const isCompact = viewMode === 'normal';
  const [references, setReferences] = useState<ReferenceDoc[]>([]);
  const [currentTitle, setCurrentTitle] = useState(title);
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
        usage_count: r.usage_count || 0 // Added usage_count
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
          menu_label: `${sectionNumber} ${subTitle || ''}`.trim() // Keep menu label consistent
        }
      });
      setCurrentTitle(newTitle);
    } catch (error) {
      console.error("Failed to update title:", error);
      alert("Failed to save title: " + error);
    }
  };

  const handleAddRef = async (ref: Omit<ReferenceDoc, 'id'>) => {
    if (!sectionId) return;
    try {
      // 1. Create Reference (or retrieve if code exists - logic needs to be robust)
      // For now, naive create. If fails (duplicate), we might need to search.
      // Let's try to search first to be safe.
      const existingRefs = await invoke<any[]>('get_references', { search: ref.code, commonOnly: false });
      let refId = 0;
      const match = existingRefs.find(r => r.code === ref.code);

      if (match) {
        refId = match.id;
      } else {
        // Create new
        const newRef = await invoke<any>('create_reference', {
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
        alert("เอกสารนี้ถูกเชื่อมโยงอยู่ในรายการแล้วครับ");
        return;
      }

      // 3. Link to Section
      try {
        await invoke('add_section_reference', {
          sectionId: sectionId,
          referenceId: refId,
          displayOrder: null // Auto append
        });
      } catch (linkErr: any) {
        // If it's already linked in DB (even if UI was out of sync)
        const errMsg = linkErr.toString().toLowerCase();
        if (errMsg.includes('unique') || errMsg.includes('already exists') || errMsg.includes('duplicate')) {
          alert("เอกสารนี้ถูกเพิ่มไว้ในรายการแล้วครับ");
        } else {
          throw linkErr;
        }
      }

      // 4. Refresh List
      await fetchReferences(sectionId);
      setRefreshQuestionsTrigger(prev => prev + 1); // Trigger question refresh

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
          pqs_id: docId // Pass PQS ID
        }
      });

      // Refresh list to show updates
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
      // id is section_reference_id
      await invoke('remove_section_reference', { sectionRefId: parseInt(id) });
      // Update local state directly for speed
      setReferences(prev => prev.filter(r => r.id !== id));
      setRefreshQuestionsTrigger(prev => prev + 1); // Trigger question refresh
    } catch (error) {
      console.error("Failed to remove reference:", error);
      alert("Failed to remove reference: " + error);
    }
  };

  return (
    <PqsEditorLayout section={sectionNumber.toString()}>

      {/* 1. Header Area */}
      <PqsHeader
        section={sectionNumber.toString()}
        title={currentTitle}
        subTitle={subTitle}
        onTitleChange={readOnly ? undefined : handleTitleChange}
        readOnly={readOnly}
        metadata={{
          id: docId,
          unit_code: '',
          updated_at: new Date().toISOString() // TODO: Get real update time
        }}
      />

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
          readOnly={readOnly}
          refreshTrigger={refreshQuestionsTrigger} // Pass trigger
          onReferencesUpdated={() => {
            fetchReferences(sectionId);
          }}
        />
      </div>

    </PqsEditorLayout>
  );
};

export default PqsSectionEditor;
