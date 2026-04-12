import { invoke } from '@tauri-apps/api/tauri';
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, Edit3, Eye, EyeOff, FileText, Menu, Plus, Printer, Trash2, UserCircle, Users, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import ConfirmModal from '../modals/ConfirmModal';
import Button from '../ui/Button';

import CoverPageView from '../views/CoverPageView';
import IntroductionView from '../views/IntroductionView';
import Section100View from '../views/Section100View';
import Section200View from '../views/Section200View';
import Section300View from '../views/Section300View';

import Pqs200SectionEditor from '../editor_v2/Pqs200SectionEditor';
import Pqs300SectionEditor from '../editor_v2/Pqs300SectionEditor';
import PqsSectionEditor from '../editor_v2/PqsSectionEditor';
import AddSectionModal from '../modals/AddSectionModal';
import EditMetadataModal from '../modals/EditMetadataModal';
import DropdownMenu from '../ui/DropdownMenu';

interface Document {
  id: string;
  name: string;
  applied_to: string;
  doc_type?: string;
  user_level?: string;
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
  title_th?: string;
  menu_label: string;
  display_order: number;
  is_system_defined: boolean;
  created_at: string;
  updated_at: string | null;
}

export type ViewMode = 'edit' | 'qualifier' | 'trainee' | 'visitor' | 'print';
export type PrintSubView = 'question-only' | 'question-with-key';

const ActiveDocumentPage: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const { showError } = useToast();
  const { user } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [docData, setDocData] = useState<DocumentHierarchy | null>(null);
  const [activeSection, setActiveSection] = useState<string>('cover'); 
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [printSubView, setPrintSubView] = useState<PrintSubView>('question-only');
  const isPrintMode = viewMode === 'print';
  const isEditMode = viewMode === 'edit';

  const [sections, setSections] = useState<Section[]>([]);
  const [isAddSectionModalOpen, setAddSectionModalOpen] = useState(false);
  const [selectedSectionGroup, setSelectedSectionGroup] = useState<100 | 200 | 300>(100);
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [clearConfirmModal, setClearConfirmModal] = useState<boolean>(false);
  const [clearSuccessModal, setClearSuccessModal] = useState<boolean>(false);
  const [clearErrorModal, setClearErrorModal] = useState<boolean>(false);
  const [clearError, setClearError] = useState<string>('');

  const fetchDocData = useCallback(() => {
    if (docId) {
      invoke<DocumentHierarchy>('get_document_with_hierarchy', { id: docId })
        .then(data => setDocData(data))
        .catch(err => console.error("Failed to fetch doc:", err));
    }
  }, [docId]);

  const fetchSections = useCallback(() => {
    if (docId) {
      invoke<Section[]>('get_sections_by_document', { documentId: docId })
        .then(data => setSections(data))
        .catch(err => console.error("Failed to fetch sections:", err));
    }
  }, [docId]);

  const [docBranchMain, setDocBranchMain] = useState<string>('');
  const [docBranchSub, setDocBranchSub] = useState<string>('');

  const fetchDocBranch = useCallback(() => {
    if (docId) {
      invoke<{ occupation_branch_main: string | null; occupation_branch_sub: string | null }>(
        'get_document_branch', { docId }
      ).then(b => {
        setDocBranchMain(b.occupation_branch_main || '');
        setDocBranchSub(b.occupation_branch_sub || '');
      }).catch(() => { });
    }
  }, [docId]);

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
      const deletedGroup = sectionToDelete.section_group;
      await invoke('delete_section', { id: sectionToDelete.id });
      setActiveSection(`${deletedGroup}`);
      await invoke<Section[]>('get_sections_by_document', { documentId: docId })
        .then(data => setSections(data))
        .catch(err => console.error("Failed to fetch sections:", err));
      setSectionToDelete(null);
    } catch (err) {
      console.error("Failed to delete section:", err);
      showError(`ไม่สามารถลบหัวข้อได้: ${err}`);
    }
  };

  const handleClearAnswers = async () => {
    setClearConfirmModal(true);
  };

  const confirmClearAnswers = async () => {
    try {
      await invoke('clear_all_trainee_answers');
      setClearConfirmModal(false);
      setClearSuccessModal(true);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error("Failed to clear trainee answers:", err);
      setClearConfirmModal(false);
      setClearError(String(err));
      setClearErrorModal(true);
    }
  };

  useEffect(() => {
    if (docId) {
      localStorage.setItem('lastActiveDocId', docId);
      fetchDocData();
      fetchSections();
      fetchDocBranch();
    }
  }, [docId, fetchDocData, fetchSections, fetchDocBranch]);

  if (!docId) return <div>Invalid Document ID</div>;

  return (
    <div className="flex flex-1 min-h-0 bg-github-bg-primary overflow-hidden">
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
          <button
            onClick={() => setActiveSection('cover')}
            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors font-medium ${activeSection === 'cover'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
              : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-800'
              }`}
          >
            Cover Page
          </button>

          <button
            onClick={() => setActiveSection('intro')}
            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors font-medium ${activeSection === 'intro'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
              : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-800'
              }`}
          >
            Introduction
          </button>

          <SectionGroup title="100 Fundamental Sections">
            <SectionItem title="100 Introduction" onClick={() => setActiveSection('100')} isActive={activeSection === '100'} />
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
                  sectionNumber={section.section_number}
                  onDelete={() => handleDeleteClick(section)}
                />
              ))
            }
            {isEditMode && <AddSubSectionBtn onClick={() => handleAddSection(100)} />}
          </SectionGroup>

          <SectionGroup title="200 System Sections">
            <SectionItem title="200 Introduction" onClick={() => setActiveSection('200')} isActive={activeSection === '200'} />
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
                  sectionNumber={section.section_number}
                  onDelete={() => handleDeleteClick(section)}
                />
              ))
            }
            {isEditMode && <AddSubSectionBtn onClick={() => handleAddSection(200)} />}
          </SectionGroup>

          <SectionGroup title="300 Watch Station Sections">
            <SectionItem title="300 Introduction" onClick={() => setActiveSection('300')} isActive={activeSection === '300'} />
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
                  sectionNumber={section.section_number}
                  onDelete={() => handleDeleteClick(section)}
                />
              ))
            }
            {isEditMode && <AddSubSectionBtn onClick={() => handleAddSection(300)} />}
          </SectionGroup>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="bg-white dark:bg-github-bg-secondary border-b border-gray-200 dark:border-github-border-primary p-4 shadow-sm z-10">
          <div className="flex items-start">
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="mr-4 mt-1 p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h1 className="text-base font-semibold text-github-text-primary leading-tight">
                  มาตรฐานกำลังพล : {docId} {docData?.document.name || '...'}
                </h1>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode('edit')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center space-x-1.5 border ${viewMode === 'edit'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>

                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                  <DropdownMenu
                    trigger={
                      <button
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center space-x-1 border ${viewMode !== 'edit'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                      >
                        <Eye className="w-4 h-4" />
                        <span>
                          View As
                          {viewMode !== 'edit' && (
                            <span className="ml-1 opacity-90 font-bold bg-white/20 px-1.5 py-0.5 rounded text-[10px] uppercase">
                              {viewMode}
                            </span>
                          )}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-70" />
                      </button>
                    }
                    items={[
                      { label: 'Qualifier (See All)', icon: <UserCircle />, onClick: () => setViewMode('qualifier') },
                      { label: 'Trainee (Answer Only)', icon: <Users />, onClick: () => setViewMode('trainee') },
                      { label: 'Visitor (Questions Only)', icon: <EyeOff />, onClick: () => setViewMode('visitor') },
                      { separator: true, label: '', onClick: () => { } },
                      { label: 'Clear Answers (DB)', icon: <Trash2 className="text-red-500" />, onClick: handleClearAnswers }
                    ]}
                  />

                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                  <DropdownMenu
                    trigger={
                      <button
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center space-x-1 border ${
                          isPrintMode
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        <Printer className="w-4 h-4" />
                        <span>Print Layout (A4)</span>
                        <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-70" />
                      </button>
                    }
                    items={[
                      { label: 'Question (เล่มคำถาม)', icon: <FileText />, onClick: () => { setViewMode('print'); setPrintSubView('question-only'); } },
                      { label: 'Answer Key (เล่มเฉลย)', icon: <BookOpen />, onClick: () => { setViewMode('print'); setPrintSubView('question-with-key'); } },
                    ]}
                  />

                  {isEditMode && (
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => setEditModalOpen(true)}
                      icon={<Edit3 className="w-4 h-4" />}
                      className="text-github-text-secondary hover:text-blue-600"
                    >
                      Edit Metadata
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-end mt-2 text-sm text-github-text-secondary font-medium">
                <div className="flex space-x-2">
                  {docData?.hierarchy?.map((unit, idx) => (
                    <span key={idx} className="bg-github-bg-secondary px-2 py-0.5 rounded text-xs border border-github-border-primary text-github-text-secondary">
                      {unit}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-github-text-tertiary">
                   Update: {docData?.document.updated_at ? new Date(docData.document.updated_at).toLocaleString('th-TH') : '-'}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-github-bg-primary">
          {activeSection === 'cover' && docData && (
            <CoverPageView id={docData.document.id} name={docData.document.name} hierarchy={docData.hierarchy} isPreviewMode={isPrintMode} />
          )}
          {activeSection === 'intro' && docData && (
            <IntroductionView appliedTo={docData.document.applied_to} isPreviewMode={isPrintMode} />
          )}
          {activeSection === '100' && <Section100View isPreviewMode={isPrintMode} />}
          {activeSection === '200' && <Section200View isPreviewMode={isPrintMode} />}
          {activeSection === '300' && <Section300View isPreviewMode={isPrintMode} />}

          {activeSection !== '100' && activeSection !== '200' && activeSection !== '300' &&
            parseInt(activeSection) >= 100 && parseInt(activeSection) < 200 && docId && (
              <PqsSectionEditor
                key={`100-${docId}-${refreshKey}`}
                docId={docId}
                sectionNumber={parseInt(activeSection)}
                title={sections.find(s => s.section_number.toString() === activeSection)?.title_th || sections.find(s => s.section_number.toString() === activeSection)?.title || ""}
                subTitle={(() => {
                  const s = sections.find(sec => sec.section_number.toString() === activeSection);
                  if (!s) return "";
                  const parts = s.menu_label.split(' ');
                  return parts.length > 1 ? parts.slice(1).join(' ') : "";
                })()}
                isPreviewMode={isPrintMode}
                viewMode={viewMode}
                printSubView={printSubView}
                onMenuLabelChange={fetchSections}
              />
            )}

          {activeSection !== '200' &&
            parseInt(activeSection) >= 201 && parseInt(activeSection) < 300 && docId && (
              <Pqs200SectionEditor
                key={`200-${docId}-${refreshKey}`}
                docId={docId}
                sectionNumber={parseInt(activeSection)}
                title={sections.find(s => s.section_number.toString() === activeSection)?.title_th || sections.find(s => s.section_number.toString() === activeSection)?.title || ""}
                subTitle={(() => {
                  const s = sections.find(sec => sec.section_number.toString() === activeSection);
                  if (!s) return "";
                  const parts = s.menu_label.split(' ');
                  return parts.length > 1 ? parts.slice(1).join(' ') : "";
                })()}
                isPreviewMode={isPrintMode}
                viewMode={viewMode}
                printSubView={printSubView}
                onMenuLabelChange={fetchSections}
                docBranchMain={docBranchMain}
                docBranchSub={docBranchSub}
              />
            )}

          {activeSection !== '300' &&
            parseInt(activeSection) >= 301 && parseInt(activeSection) < 400 && docId && (
              <Pqs300SectionEditor
                key={`300-${docId}-${refreshKey}`}
                docId={docId}
                sectionNumber={parseInt(activeSection)}
                title={sections.find(s => s.section_number.toString() === activeSection)?.title_th || sections.find(s => s.section_number.toString() === activeSection)?.title || ""}
                subTitle={(() => {
                  const s = sections.find(sec => sec.section_number.toString() === activeSection);
                  if (!s) return "";
                  const parts = s.menu_label.split(' ');
                  return parts.length > 1 ? parts.slice(1).join(' ') : "";
                })()}
                isPreviewMode={isPrintMode}
                viewMode={viewMode}
                printSubView={printSubView}
                onMenuLabelChange={fetchSections}
                docBranchMain={docBranchMain}
                docBranchSub={docBranchSub}
              />
            )}
        </div>
      </main>

      {docData && (
        <EditMetadataModal
          isOpen={isEditModalOpen}
          onClose={() => setEditModalOpen(false)}
          docId={docData.document.id}
          initialName={docData.document.name}
          initialAppliedTo={docData.document.applied_to || ''}
          initialDocType={docData.document.doc_type || '10'}
          initialUserLevel={docData.document.user_level || '2'}
          onSuccess={() => { fetchDocData(); fetchDocBranch(); setRefreshKey(prev => prev + 1); }}
          userRole={user?.role}
        />
      )}

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
            setActiveSection(newSectionNumber.toString());
          }
        }}
      />

      <ConfirmModal
        isOpen={!!sectionToDelete}
        onClose={() => setSectionToDelete(null)}
        onConfirm={confirmDeleteSection}
        title="ยืนยันการลบส่วน (Section)"
        message={`คุณต้องการลบส่วน "${sectionToDelete?.title || sectionToDelete?.menu_label}" ใช่หรือไม่?`}
        confirmText="ลบส่วนนี้"
        variant="danger"
      />

      <ConfirmModal
        isOpen={clearConfirmModal}
        onClose={() => setClearConfirmModal(false)}
        onConfirm={confirmClearAnswers}
        title="ยืนยันการลบคำตอบ"
        message="คำเตือน: คุณต้องการลบคำตอบทั้งหมดใช่หรือไม่?"
        confirmText="ลบทั้งหมด"
        variant="danger"
      />

      <ConfirmModal
        isOpen={clearSuccessModal}
        onClose={() => setClearSuccessModal(false)}
        onConfirm={() => setClearSuccessModal(false)}
        title="สำเร็จ"
        message="ลบข้อมูลสำเร้จ"
        confirmText="ตกลง"
        variant="info"
      />

      <ConfirmModal
        isOpen={clearErrorModal}
        onClose={() => setClearErrorModal(false)}
        onConfirm={() => setClearErrorModal(false)}
        title="ข้อผิดพลาด"
        message={`เกิดข้อผิดพลาด: ${clearError}`}
        confirmText="ตกลง"
        variant="warning"
      />
    </div>
  );
};

const SectionGroup: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="mt-2">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between px-3 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
        <span>{title}</span>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {isOpen && <div className="ml-4 mt-1 border-l-2 border-gray-200 dark:border-gray-700 pl-2 space-y-1">{children}</div>}
    </div>
  );
};

const SectionItem: React.FC<{ title: string; onClick?: () => void; isActive?: boolean; isSystemDefined?: boolean; sectionNumber?: number; onDelete?: () => void; }> = ({ title, onClick, isActive, isSystemDefined, sectionNumber, onDelete }) => (
  <div className="flex items-center group">
    <button onClick={onClick} className={`flex-1 text-left px-2 py-1.5 text-sm rounded transition-colors truncate ${isActive ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800'}`}>
      {title}
      {isSystemDefined && sectionNumber !== 101 && <span className="ml-2 text-xs text-gray-400">🔒</span>}
    </button>
    {onDelete && <button onClick={onDelete} title="Delete section" className="ml-1 opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 transition-opacity"><X className="w-3 h-3" /></button>}
  </div>
);

const AddSubSectionBtn: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <button onClick={onClick} className="w-full flex items-center text-left px-2 py-1.5 text-xs text-blue-500 hover:text-blue-700 bg-blue-50 dark:bg-gray-900 rounded transition-colors group">
    <Plus className="w-3 h-3 mr-1" />
    <span>Add Sub Section</span>
  </button>
);

export default ActiveDocumentPage;
