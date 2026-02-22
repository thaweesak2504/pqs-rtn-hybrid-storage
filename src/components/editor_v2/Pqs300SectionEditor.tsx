import { invoke } from '@tauri-apps/api/tauri';
import React, { useEffect, useState } from 'react';
import PqsEditorLayout from './PqsEditorLayout';
import PqsHeader from './PqsHeader';
import PqsQuestionSection from './PqsQuestionSection';
import PqsSectionPreview from './PqsSectionPreview';

type ViewMode = 'edit' | 'normal' | 'preview';

// ============ Component ============

interface Pqs300SectionEditorProps {
  docId: string;
  sectionNumber: number;
  title: string;
  subTitle?: string;
  isPreviewMode?: boolean;
  viewMode?: ViewMode;
}

const Pqs300SectionEditor: React.FC<Pqs300SectionEditorProps> = ({
  docId,
  sectionNumber,
  title,
  subTitle,
  viewMode = 'edit'
}) => {
  const readOnly = viewMode !== 'edit';
  const [sectionId, setSectionId] = useState<number>(0);

  // Default prefix for 300Template
  const titlePrefix = "การปฏิบัติหน้าที่ในตำแหน่ง ";

  const [currentTitle, setCurrentTitle] = useState(title);

  const handleTitleChange = async (newTitle: string) => {
    try {
      await invoke('update_section', {
        args: {
          id: sectionId,
          title_th: newTitle,
          menu_label: `${sectionNumber} ${subTitle || ''}`.trim()
        }
      });
      setCurrentTitle(newTitle);
    } catch (error) {
      console.error("Failed to update title:", error);
      alert("Failed to save title: " + error);
    }
  };

  // Fetch Section ID on mount or when sectionNumber changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const sections = await invoke<any[]>('get_sections_by_document', { documentId: docId });
        const currentSection = sections.find(s => s.section_number === sectionNumber);

        if (currentSection) {
          setSectionId(currentSection.id);
          setCurrentTitle(currentSection.title_th);
        }
      } catch (error) {
        console.error("Failed to fetch section data:", error);
      }
    };
    fetchData();
  }, [docId, sectionNumber]);

  // Preview Mode: Render A4 paper view
  if (viewMode === 'preview') {
    return (
      <PqsSectionPreview
        docId={docId}
        sectionId={sectionId}
        sectionNumber={sectionNumber}
        title={currentTitle}
        references={[]}
        sectionGroup={300}
      />
    );
  }

  return (
    <PqsEditorLayout section={sectionNumber.toString()}>

      {/* 1. Header Area */}
      <PqsHeader
        section={sectionNumber.toString()}
        title={currentTitle}
        subTitle={subTitle}
        onTitleChange={handleTitleChange}
        readOnly={readOnly}
        prefix={titlePrefix}
      />

      {/* 2. Content Area */}
      <div className="flex flex-col gap-6">
        <PqsQuestionSection
          docId={docId}
          sectionId={sectionId}
          sectionNumber={sectionNumber}
          sectionGroup={300}
          readOnly={readOnly}
        />
      </div>

    </PqsEditorLayout>
  );
};

export default Pqs300SectionEditor;
