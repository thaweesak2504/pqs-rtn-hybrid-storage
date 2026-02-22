import { ArrowLeft, ChevronDown, ChevronRight, Menu, Plus, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../ui/Button';

import { invoke } from '@tauri-apps/api/tauri';

interface Document {
  id: string;
  name: string;
  applied_to: string;
  updated_at: string | null;
  created_at: string | null;
}

interface DocumentHierarchy {
  document: Document;
  hierarchy: string[];
}

interface Section {
  id: number;
  document_id: string;
  section_group: number;
  section_number: number;
  title: string;
  title_th?: string; // Optional if not always present
  menu_label: string;
  display_order: number;
  is_system_defined: boolean;
  created_at: string;
  updated_at: string | null;
}

import CoverPageView from '../views/CoverPageView';
import IntroductionView from '../views/IntroductionView';
import Section100View from '../views/Section100View';
import Section200View from '../views/Section200View';
import Section300View from '../views/Section300View';

import { Edit2, Edit3, Eye, FileText } from 'lucide-react';
import Pqs200SectionEditor from '../editor_v2/Pqs200SectionEditor';
import Pqs300SectionEditor from '../editor_v2/Pqs300SectionEditor';
import PqsSectionEditor from '../editor_v2/PqsSectionEditor';
import AddSectionModal from '../modals/AddSectionModal';
import ConfirmModal from '../modals/ConfirmModal';
import EditMetadataModal from '../modals/EditMetadataModal';

type ViewMode = 'edit' | 'normal' | 'preview';

const ActiveDocumentPage: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [docData, setDocData] = useState<DocumentHierarchy | null>(null);
  const [activeSection, setActiveSection] = useState<string>('cover'); // 'cover', 'intro', '100', '200', '300', or section numbers
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const isPreviewMode = viewMode === 'preview';
  const isEditMode = viewMode === 'edit';

  // Section Management States
  const [sections, setSections] = useState<Section[]>([]);
  const [isAddSectionModalOpen, setAddSectionModalOpen] = useState(false);
  const [selectedSectionGroup, setSelectedSectionGroup] = useState<100 | 200 | 300>(100);
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null);

  const fetchDocData = () => {
    if (docId) {
      invoke<DocumentHierarchy>('get_document_with_hierarchy', { id: docId })
        .then(data => setDocData(data))
        .catch(err => console.error("Failed to fetch doc:", err));
    }
  };

  const fetchSections = () => {
    if (docId) {
      invoke<Section[]>('get_sections_by_document', { documentId: docId })
        .then(data => setSections(data))
        .catch(err => console.error("Failed to fetch sections:", err));
    }
  };

  const handleAddSection = (sectionGroup: 100 | 200 | 300) => {
    setSelectedSectionGroup(sectionGroup);
    setAddSectionModalOpen(true);
  };

  const handleDeleteClick = (section: Section) => {
    setSectionToDelete(section);
  };

  const confirmDeleteSection = async () => {
    if (!sectionToDelete) return;

    try {
      await invoke('delete_section', { id: sectionToDelete.id });
      fetchSections();
      setSectionToDelete(null);
    } catch (err) {
      console.error("Failed to delete section:", err);
      alert(`Error: ${err}`);
    }
  };

  useEffect(() => {
    if (docId) {
      // Save to localStorage for quick resume
      localStorage.setItem('lastActiveDocId', docId);

      // Fetch data immediately
      fetchDocData();
      fetchSections();
    }
  }, [docId]);

  if (!docId) return <div>Invalid Document ID</div>;

  return (
    <div className="flex h-screen bg-github-bg-primary overflow-hidden">
      {/* Left Sidebar */}
      <aside
        className={`${isSidebarOpen ? 'w-64' : 'w-0'} bg-white dark:bg-github-bg-secondary border-r border-gray-200 dark:border-github-border-primary transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-github-border-primary flex justify-between items-center">
          <span className="font-bold text-gray-700 dark:text-gray-200">Sections</span>
          <Button variant="ghost" size="small" onClick={() => navigate('/editor')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Cover Page */}
          <button
            onClick={() => setActiveSection('cover')}
            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors font-medium ${activeSection === 'cover'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
              : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-800'
              }`}
          >
            Cover Page
          </button>

          {/* Introduction */}
          <button
            onClick={() => setActiveSection('intro')}
            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors font-medium ${activeSection === 'intro'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
              : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-800'
              }`}
          >
            Introduction
          </button>

          {/* 100 Fundamental Sections */}
          <SectionGroup title="100 Fundamental Sections">
            <SectionItem title="100 Introduction" onClick={() => setActiveSection('100')} isActive={activeSection === '100'} />

            {/* Dynamic Sections */}
            {sections
              .filter(s => s.section_group === 100)
              .sort((a, b) => a.section_number - b.section_number)
              .map(section => (
                <SectionItem
                  key={section.id}
                  title={section.menu_label}
                  onClick={() => setActiveSection(`${section.section_number}`)}
                  isActive={activeSection === `${section.section_number}`}
                  isSystemDefined={section.is_system_defined}
                  onDelete={() => handleDeleteClick(section)}
                />
              ))
            }

            {isEditMode && <AddSubSectionBtn onClick={() => handleAddSection(100)} />}
          </SectionGroup>

          {/* 200 System Sections */}
          <SectionGroup title="200 System Sections">
            <SectionItem title="200 Introduction" onClick={() => setActiveSection('200')} isActive={activeSection === '200'} />

            {/* Dynamic Sections */}
            {sections
              .filter(s => s.section_group === 200)
              .sort((a, b) => a.section_number - b.section_number)
              .map(section => (
                <SectionItem
                  key={section.id}
                  title={section.menu_label}
                  onClick={() => setActiveSection(`${section.section_number}`)}
                  isActive={activeSection === `${section.section_number}`}
                  isSystemDefined={section.is_system_defined}
                  onDelete={() => handleDeleteClick(section)}
                />
              ))
            }

            {isEditMode && <AddSubSectionBtn onClick={() => handleAddSection(200)} />}
          </SectionGroup>

          {/* 300 Watch Station Sections */}
          <SectionGroup title="300 Watch Station Sections">
            <SectionItem title="300 Introduction" onClick={() => setActiveSection('300')} isActive={activeSection === '300'} />

            {/* Dynamic Sections */}
            {sections
              .filter(s => s.section_group === 300)
              .sort((a, b) => a.section_number - b.section_number)
              .map(section => (
                <SectionItem
                  key={section.id}
                  title={section.menu_label}
                  onClick={() => setActiveSection(`${section.section_number}`)}
                  isActive={activeSection === `${section.section_number}`}
                  isSystemDefined={section.is_system_defined}
                  onDelete={() => handleDeleteClick(section)}
                />
              ))
            }

            {isEditMode && <AddSubSectionBtn onClick={() => handleAddSection(300)} />}
          </SectionGroup>

        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header / Toolbar */}
        <header className="bg-white dark:bg-github-bg-secondary border-b border-gray-200 dark:border-github-border-primary p-4 shadow-sm z-10">
          <div className="flex items-start">
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="mr-4 mt-1 p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1">
              {/* Line 1: มาตรฐานกำลังพล + ID + Title */}
              <div className="flex items-center justify-between">
                <h1 className="text-base font-semibold text-github-text-primary leading-tight">
                  มาตรฐานกำลังพล : {docId} {docData?.document.name || '...'}
                </h1>
                <div className="flex items-center space-x-2">
                  {/* View Mode Toggle */}
                  <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setViewMode('edit')}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center space-x-1 ${viewMode === 'edit'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setViewMode('normal')}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center space-x-1 ${viewMode === 'normal'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                    <button
                      onClick={() => setViewMode('preview')}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center space-x-1 ${viewMode === 'preview'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                  </div>

                  {/* Edit Metadata Button — only in Edit mode */}
                  {isEditMode && (
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => setEditModalOpen(true)}
                      icon={<Edit2 className="w-4 h-4" />}
                      className="text-github-text-secondary hover:text-blue-600"
                    >
                      Edit Metadata
                    </Button>
                  )}
                </div>
              </div>

              {/* Line 2: Hierarchy & Last Update */}
              <div className="flex justify-between items-end mt-2 text-sm text-github-text-secondary font-medium">
                <div className="flex space-x-2">
                  {/* Render Hierarchy: L4 L3 L2 L1 */}
                  {docData?.hierarchy?.map((unit, idx) => (
                    <span key={idx} className="bg-github-bg-secondary px-2 py-0.5 rounded text-xs border border-github-border-primary text-github-text-secondary">
                      {unit}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-github-text-tertiary">
                  Last Update: {docData?.document.updated_at ? new Date(docData.document.updated_at).toLocaleString('th-TH') : '-'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Document Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-github-bg-primary">
          {activeSection === 'cover' && docData && (
            <CoverPageView
              id={docData.document.id}
              name={docData.document.name}
              hierarchy={docData.hierarchy}
              isPreviewMode={isPreviewMode}
            />
          )}

          {activeSection === 'intro' && docData && (
            <IntroductionView
              appliedTo={docData.document.applied_to}
              isPreviewMode={isPreviewMode}
            />
          )}

          {activeSection === '100' && (
            <Section100View isPreviewMode={isPreviewMode} />
          )}

          {activeSection === '200' && (
            <Section200View isPreviewMode={isPreviewMode} />
          )}

          {activeSection === '300' && (
            <Section300View isPreviewMode={isPreviewMode} />
          )}

          {/* Dynamic Sections (101-199) - 100 Template */}
          {activeSection !== '100' && activeSection !== '200' && activeSection !== '300' &&
            parseInt(activeSection) >= 100 && parseInt(activeSection) < 200 && docId && (
              <PqsSectionEditor
                docId={docId}
                sectionNumber={parseInt(activeSection)}
                title={sections.find(s => s.section_number.toString() === activeSection)?.title_th || sections.find(s => s.section_number.toString() === activeSection)?.title || ""}
                subTitle={(() => {
                  const section = sections.find(s => s.section_number.toString() === activeSection);
                  if (!section) return "";
                  const parts = section.menu_label.split(' ');
                  return parts.length > 1 ? parts.slice(1).join(' ') : "";
                })()}
                isPreviewMode={isPreviewMode}
                viewMode={viewMode}
              />
            )}

          {/* Dynamic Sections (201-299) - 200 Template */}
          {activeSection !== '200' &&
            parseInt(activeSection) >= 201 && parseInt(activeSection) < 300 && docId && (
              <Pqs200SectionEditor
                docId={docId}
                sectionNumber={parseInt(activeSection)}
                title={sections.find(s => s.section_number.toString() === activeSection)?.title_th || sections.find(s => s.section_number.toString() === activeSection)?.title || ""}
                subTitle={(() => {
                  const section = sections.find(s => s.section_number.toString() === activeSection);
                  if (!section) return "";
                  const parts = section.menu_label.split(' ');
                  return parts.length > 1 ? parts.slice(1).join(' ') : "";
                })()}
                isPreviewMode={isPreviewMode}
                viewMode={viewMode}
              />
            )}

          {/* Dynamic Sections (301-399) - 300 Template */}
          {activeSection !== '300' &&
            parseInt(activeSection) >= 301 && parseInt(activeSection) < 400 && docId && (
              <Pqs300SectionEditor
                docId={docId}
                sectionNumber={parseInt(activeSection)}
                title={sections.find(s => s.section_number.toString() === activeSection)?.title_th || sections.find(s => s.section_number.toString() === activeSection)?.title || ""}
                subTitle={(() => {
                  const section = sections.find(s => s.section_number.toString() === activeSection);
                  if (!section) return "";
                  const parts = section.menu_label.split(' ');
                  return parts.length > 1 ? parts.slice(1).join(' ') : "";
                })()}
                isPreviewMode={isPreviewMode}
                viewMode={viewMode}
              />
            )}


        </div>
      </main>

      {/* Edit Metadata Modal */}
      {docData && (
        <EditMetadataModal
          isOpen={isEditModalOpen}
          onClose={() => setEditModalOpen(false)}
          docId={docData.document.id}
          initialName={docData.document.name}
          initialAppliedTo={docData.document.applied_to}
          onSuccess={fetchDocData}
        />
      )}

      {/* Add Section Modal */}
      <AddSectionModal
        isOpen={isAddSectionModalOpen}
        onClose={() => setAddSectionModalOpen(false)}
        documentId={docId!}
        sectionGroup={selectedSectionGroup}
        existingNumbers={sections.map(s => s.section_number)}
        onSuccess={(newSectionNumber) => {
          fetchSections();
          setAddSectionModalOpen(false);
          if (newSectionNumber) {
            console.log("Navigating to new section:", newSectionNumber);
            setActiveSection(newSectionNumber.toString());
          }
        }}
      />

      <ConfirmModal
        isOpen={!!sectionToDelete}
        onClose={() => setSectionToDelete(null)}
        onConfirm={confirmDeleteSection}
        title="ยืนยันการลบส่วน (Section)"
        message={`คุณต้องการลบส่วน "${sectionToDelete?.title || sectionToDelete?.menu_label}" ใช่หรือไม่?\n\nการลบส่วนจะลบเนื้อหาและคำถามทั้งหมดที่อยู่ภายใน`}
        confirmText="ลบส่วนนี้"
        variant="danger"
      />
    </div>
  );
};

// Helper Components for Sidebar
const SectionGroup: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <span>{title}</span>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {isOpen && (
        <div className="ml-4 mt-1 border-l-2 border-gray-200 dark:border-gray-700 pl-2 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
};

const SectionItem: React.FC<{
  title: string;
  onClick?: () => void;
  isActive?: boolean;
  isSystemDefined?: boolean;
  onDelete?: () => void;
}> = ({ title, onClick, isActive, isSystemDefined, onDelete }) => (
  <div className="flex items-center group">
    <button
      onClick={onClick}
      className={`flex-1 text-left px-2 py-1.5 text-sm rounded transition-colors truncate ${isActive
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
        : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800'
        }`}
    >
      {title}
      {isSystemDefined && <span className="ml-2 text-xs text-gray-400">🔒</span>}
    </button>
    {onDelete && (
      <button
        onClick={onDelete}
        className="ml-1 opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-opacity"
        title="Delete section"
      >
        <X className="w-3 h-3" />
      </button>
    )}
  </div>
);

const AddSubSectionBtn: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center text-left px-2 py-1.5 text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-gray-900 rounded transition-colors group"
  >
    <Plus className="w-3 h-3 mr-1" />
    <span>Add Sub Section</span>
  </button>
);

export default ActiveDocumentPage;
