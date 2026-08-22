import { invoke } from '@tauri-apps/api/tauri';
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, Copy, Edit3, Eye, EyeOff, Files, FileText, Lock, Menu, Plus, Printer, Trash2, UserCircle, Users, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import ClearAnswersWorkflowModal from '../modals/ClearAnswersWorkflowModal';
import EditMetadataModal from '../modals/EditMetadataModal';
import SimulationListModal from '../modals/SimulationListModal';
import { COMMAND_BUTTON_FOCUS } from '../ui/buttonStyles';
import DropdownMenu from '../ui/DropdownMenu';
import { logger } from '../../utils/logger';
import { simulationService } from '../../services/simulationService';

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

interface SimulationDocumentInfo {
  simulation_document_id: string;
  template_document_id: string;
  trainee_id: string;
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
  const [deleteSimulationModal, setDeleteSimulationModal] = useState(false);
  const [simulationListModal, setSimulationListModal] = useState(false);
  const [simulationCount, setSimulationCount] = useState<number | null>(null);
  const [simulationInfo, setSimulationInfo] = useState<SimulationDocumentInfo | null>(null);
  const [simulationContextDocumentId, setSimulationContextDocumentId] = useState<string | null>(null);
  const viewAsButtonRef = useRef<HTMLButtonElement>(null);
  const isSimulation = simulationInfo !== null;
  const isSimulationContextResolved = simulationContextDocumentId === docId;

  const fetchDocData = useCallback(() => {
    if (docId) {
      invoke<DocumentHierarchy>('get_document_with_hierarchy', { id: docId })
        .then(data => setDocData(data))
        .catch(err => logger.error("Failed to fetch doc:", err));
    }
  }, [docId]);

  const fetchSections = useCallback(() => {
    if (docId) {
      invoke<Section[]>('get_sections_by_document', { documentId: docId })
        .then(data => setSections(data))
        .catch(err => logger.error("Failed to fetch sections:", err));
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
    if (section.section_number === 101 || section.is_system_defined) return;
    setSectionToDelete(section);
  };

  const confirmDeleteSection = async () => {
    if (!sectionToDelete) return;
    if (sectionToDelete.section_number === 101 || sectionToDelete.is_system_defined) {
      setSectionToDelete(null);
      return;
    }
    try {
      const deletedGroup = sectionToDelete.section_group;
      await invoke('delete_section', { id: sectionToDelete.id });
      setActiveSection(`${deletedGroup}`);
      await invoke<Section[]>('get_sections_by_document', { documentId: docId })
        .then(data => setSections(data))
        .catch(err => logger.error("Failed to fetch sections:", err));
      setSectionToDelete(null);
    } catch (err) {
      logger.error("Failed to delete section:", err);
      showError(`ไม่สามารถลบหัวข้อได้: ${err}`);
    }
  };

  const handleClearAnswers = () => {
    setClearConfirmModal(true);
  };

  const handleStartSimulation = async () => {
    if (!docId) return;
    try {
      const simulation = await invoke<SimulationDocumentInfo>('clone_document_for_simulation', {
        templateDocumentId: docId,
        traineeId: 'T-001',
      });
      navigate(`/pqs/${simulation.simulation_document_id}`);
    } catch (err) {
      logger.error('Failed to create simulation document:', err);
      showError(`ไม่สามารถเริ่มรอบจำลองได้: ${err}`);
    }
  };

  const confirmDeleteSimulation = async () => {
    if (!docId || !simulationInfo) return;
    try {
      await invoke('delete_simulation_document', { documentId: docId });
      navigate(`/pqs/${simulationInfo.template_document_id}`);
    } catch (err) {
      logger.error('Failed to delete simulation:', err);
      setDeleteSimulationModal(false);
      showError(`ไม่สามารถลบรอบจำลองได้: ${err}`);
    }
  };

  useEffect(() => {
    let isActive = true;
    if (docId) {
      localStorage.setItem('lastActiveDocId', docId);
      fetchDocData();
      fetchSections();
      fetchDocBranch();
      invoke<SimulationDocumentInfo | null>('get_simulation_document_info', { documentId: docId })
        .then(info => {
          if (!isActive) return;
          setSimulationInfo(info);
          setSimulationContextDocumentId(docId);
          setViewMode(info ? 'trainee' : 'edit');
          if (!info) {
            simulationService.listForTemplate(docId)
              .then(items => setSimulationCount(items.length))
              .catch(err => logger.error('Failed to count simulation documents:', err));
          }
        })
        .catch(err => logger.error('Failed to fetch simulation context:', err));
    }
    return () => {
      isActive = false;
    };
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
                  onDelete={isEditMode && !section.is_system_defined && section.section_number !== 101 ? () => handleDeleteClick(section) : undefined}
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
                  onDelete={isEditMode && !section.is_system_defined ? () => handleDeleteClick(section) : undefined}
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
                  onDelete={isEditMode && !section.is_system_defined ? () => handleDeleteClick(section) : undefined}
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
                <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${isSimulation ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'}`}>
                  {isSimulation
                    ? `SIMULATION: ${simulationInfo.simulation_document_id}`
                    : 'TEMPLATE'}
                </span>
                <div className="flex items-center space-x-2">
                  {isSimulation && (
                    <button
                      onClick={() => navigate(`/pqs/${simulationInfo.template_document_id}`)}
                      className="px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center space-x-1.5 border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>กลับ Template</span>
                    </button>
                  )}

                  {!isSimulation && <button
                    onClick={() => setViewMode('edit')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center space-x-1.5 border ${viewMode === 'edit'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>}

                  {!isSimulation && (
                    <button
                      onClick={() => setSimulationListModal(true)}
                      className="px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center space-x-1.5 border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <Files className="w-4 h-4" />
                      <span>รอบจำลอง ({simulationCount ?? '…'})</span>
                    </button>
                  )}

                  {!isSimulation && (
                    <button
                      onClick={handleStartSimulation}
                      className="px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center space-x-1.5 border bg-amber-600 text-white border-amber-600 shadow-sm hover:bg-amber-700"
                    >
                      <Copy className="w-4 h-4" />
                      <span>เริ่มรอบจำลอง</span>
                    </button>
                  )}

                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                  <DropdownMenu
                    trigger={
                      <button
                        type="button"
                        ref={viewAsButtonRef}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center space-x-1 border ${COMMAND_BUTTON_FOCUS} ${viewMode !== 'edit'
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
                    items={isSimulation ? [
                      { label: 'Qualifier (See All)', icon: <UserCircle />, onClick: () => setViewMode('qualifier') },
                      { label: 'Trainee (Answer Only)', icon: <Users />, onClick: () => setViewMode('trainee') },
                      { label: 'Visitor (Questions Only)', icon: <EyeOff />, onClick: () => setViewMode('visitor') },
                        { separator: true, label: '', onClick: () => { } },
                        { label: 'ล้างคำตอบของรอบจำลอง', icon: <Trash2 className="text-red-500" />, onClick: handleClearAnswers },
                        { label: 'ลบรอบจำลองนี้', icon: <Trash2 />, danger: true, onClick: () => setDeleteSimulationModal(true) },
                    ] : [
                      { label: 'Visitor (Questions Only)', icon: <EyeOff />, onClick: () => setViewMode('visitor') },
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

                  {isEditMode && !isSimulation && (
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

        <div
          className={`flex-1 overflow-y-auto p-8 bg-github-bg-primary ${isPrintMode ? 'pqs-print-monochrome' : ''}`}
          data-print-color-mode={isPrintMode ? 'monochrome' : undefined}
        >
          {activeSection === 'cover' && docData && (
            <CoverPageView id={docData.document.id} name={docData.document.name} hierarchy={docData.hierarchy} isPreviewMode={isPrintMode} />
          )}
          {activeSection === 'intro' && docData && (
            <IntroductionView
              documentId={docData.document.id}
              appliedTo={docData.document.applied_to}
              isPreviewMode={isPrintMode}
              viewMode={viewMode}
              isSimulation={!isSimulationContextResolved || isSimulation}
              onAppliedToUpdated={(nextAppliedTo) => {
                setDocData((current) => current ? {
                  ...current,
                  document: {
                    ...current.document,
                    applied_to: nextAppliedTo,
                  },
                } : current);
              }}
            />
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

      {isSimulation && (
        <ClearAnswersWorkflowModal
          isOpen={clearConfirmModal}
          documentId={docId}
          documentTitle={docData?.document.name ?? ""}
          templateDocumentId={simulationInfo.template_document_id}
          onClose={() => setClearConfirmModal(false)}
          onCleared={() => setRefreshKey(prev => prev + 1)}
          returnFocusRef={viewAsButtonRef}
        />
      )}

      <ConfirmModal
        isOpen={deleteSimulationModal}
        onClose={() => setDeleteSimulationModal(false)}
        onConfirm={confirmDeleteSimulation}
        title="ลบรอบจำลอง"
        message={`คุณต้องการลบรอบจำลอง ${docId} ใช่หรือไม่? คำตอบ การประเมิน และไฟล์แนบของรอบนี้จะถูกลบ แต่ Template จะไม่ถูกกระทบ`}
        confirmText="ลบรอบจำลอง"
        variant="danger"
      />

      {!isSimulation && (
        <SimulationListModal
          isOpen={simulationListModal}
          templateDocumentId={docId}
          onClose={() => setSimulationListModal(false)}
          onCountChange={setSimulationCount}
          onOpenSimulation={(simulationDocumentId) => {
            setSimulationListModal(false);
            navigate(`/pqs/${simulationDocumentId}`);
          }}
        />
      )}

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
      {(isSystemDefined || sectionNumber === 101) && <Lock aria-label="Protected section" className="inline-block ml-2 h-3 w-3 text-gray-400" />}
    </button>
    {onDelete && !isSystemDefined && sectionNumber !== 101 && <button onClick={onDelete} title="Delete section" className="ml-1 opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 transition-opacity"><X className="w-3 h-3" /></button>}
  </div>
);

const AddSubSectionBtn: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <button onClick={onClick} className="w-full flex items-center text-left px-2 py-1.5 text-xs text-blue-500 hover:text-blue-700 bg-blue-50 dark:bg-gray-900 rounded transition-colors group">
    <Plus className="w-3 h-3 mr-1" />
    <span>Add Sub Section</span>
  </button>
);

export default ActiveDocumentPage;
