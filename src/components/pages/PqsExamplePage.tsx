import { ArrowLeft, ChevronDown, ChevronRight, Eye, Menu } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';

import { invoke } from '@tauri-apps/api/tauri';

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

import CoverPageView from '../views/CoverPageView';
import IntroductionView from '../views/IntroductionView';
import Section100View from '../views/Section100View';
import Section200View from '../views/Section200View';
import Section300View from '../views/Section300View';

import Pqs200SectionEditor from '../editor_v2/Pqs200SectionEditor';
import Pqs300SectionEditor from '../editor_v2/Pqs300SectionEditor';
import PqsSectionEditor from '../editor_v2/PqsSectionEditor';

import type { ViewMode } from './ActiveDocumentPage';
import { logger } from '../../utils/logger';

const EXAMPLE_DOC_ID = '22724201001';

const PqsExamplePage: React.FC = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [docData, setDocData] = useState<DocumentHierarchy | null>(null);
  const [activeSection, setActiveSection] = useState<string>('cover');
  const viewMode: ViewMode = 'visitor';

  // Section Management States
  const [sections, setSections] = useState<Section[]>([]);

  // Document-level occupation branch
  const [docBranchMain, setDocBranchMain] = useState<string>('');
  const [docBranchSub, setDocBranchSub] = useState<string>('');

  const fetchDocData = useCallback(() => {
    invoke<DocumentHierarchy>('get_document_with_hierarchy', { id: EXAMPLE_DOC_ID })
      .then(data => setDocData(data))
      .catch(err => logger.error("Failed to fetch doc:", err));
  }, []);

  const fetchSections = useCallback(() => {
    invoke<Section[]>('get_sections_by_document', { documentId: EXAMPLE_DOC_ID })
      .then(data => setSections(data))
      .catch(err => logger.error("Failed to fetch sections:", err));
  }, []);

  const fetchDocBranch = useCallback(() => {
    invoke<{ occupation_branch_main: string | null; occupation_branch_sub: string | null }>(
      'get_document_branch', { docId: EXAMPLE_DOC_ID }
    ).then(b => {
      setDocBranchMain(b.occupation_branch_main || '');
      setDocBranchSub(b.occupation_branch_sub || '');
    }).catch(() => { });
  }, []);

  useEffect(() => {
    fetchDocData();
    fetchSections();
    fetchDocBranch();
  }, [fetchDocData, fetchSections, fetchDocBranch]);

  return (
    <div className="flex h-screen bg-github-bg-primary overflow-hidden">
      {/* Left Sidebar */}
      <aside
        className={`${isSidebarOpen ? 'w-64' : 'w-0'} bg-white dark:bg-github-bg-secondary border-r border-gray-200 dark:border-github-border-primary transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-github-border-primary flex justify-between items-center">
          <span className="font-bold text-gray-700 dark:text-gray-200">Sections</span>
          <Button variant="ghost" size="small" onClick={() => navigate('/home')}>
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
                />
              ))
            }
          </SectionGroup>

          {/* 200 System Sections */}
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
                />
              ))
            }
          </SectionGroup>

          {/* 300 Watch Station Sections */}
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
                />
              ))
            }
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
              {/* Line 1: Title + Visitor badge */}
              <div className="flex items-center justify-between">
                <h1 className="text-base font-semibold text-github-text-primary leading-tight">
                  มาตรฐานกำลังพล : {EXAMPLE_DOC_ID} {docData?.document.name || '...'}
                </h1>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded bg-amber-600 text-white border border-amber-600 shadow-sm space-x-1.5">
                    <Eye className="w-4 h-4" />
                    <span>View As <span className="ml-1 opacity-90 font-bold bg-white/20 px-1.5 py-0.5 rounded text-[10px] uppercase">visitor</span></span>
                  </span>
                </div>
              </div>

              {/* Line 2: Hierarchy & Last Update */}
              <div className="flex justify-between items-end mt-2 text-sm text-github-text-secondary font-medium">
                <div className="flex space-x-2">
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
              isPreviewMode={false}
            />
          )}

          {activeSection === 'intro' && docData && (
            <IntroductionView
              appliedTo={docData.document.applied_to}
              isPreviewMode={false}
            />
          )}

          {activeSection === '100' && (
            <Section100View isPreviewMode={false} />
          )}

          {activeSection === '200' && (
            <Section200View isPreviewMode={false} />
          )}

          {activeSection === '300' && (
            <Section300View isPreviewMode={false} />
          )}

          {/* Dynamic Sections (101-199) - 100 Template */}
          {activeSection !== '100' && activeSection !== '200' && activeSection !== '300' &&
            parseInt(activeSection) >= 100 && parseInt(activeSection) < 200 && (
              <PqsSectionEditor
                key={`100-${EXAMPLE_DOC_ID}`}
                docId={EXAMPLE_DOC_ID}
                sectionNumber={parseInt(activeSection)}
                title={sections.find(s => s.section_number.toString() === activeSection)?.title_th || sections.find(s => s.section_number.toString() === activeSection)?.title || ""}
                subTitle={(() => {
                  const section = sections.find(s => s.section_number.toString() === activeSection);
                  if (!section) return "";
                  const parts = section.menu_label.split(' ');
                  return parts.length > 1 ? parts.slice(1).join(' ') : "";
                })()}
                isPreviewMode={false}
                viewMode={viewMode}
                printSubView="question-only"
                onMenuLabelChange={fetchSections}
              />
            )}

          {/* Dynamic Sections (201-299) - 200 Template */}
          {activeSection !== '200' &&
            parseInt(activeSection) >= 201 && parseInt(activeSection) < 300 && (
              <Pqs200SectionEditor
                key={`200-${EXAMPLE_DOC_ID}`}
                docId={EXAMPLE_DOC_ID}
                sectionNumber={parseInt(activeSection)}
                title={sections.find(s => s.section_number.toString() === activeSection)?.title_th || sections.find(s => s.section_number.toString() === activeSection)?.title || ""}
                subTitle={(() => {
                  const section = sections.find(s => s.section_number.toString() === activeSection);
                  if (!section) return "";
                  const parts = section.menu_label.split(' ');
                  return parts.length > 1 ? parts.slice(1).join(' ') : "";
                })()}
                isPreviewMode={false}
                viewMode={viewMode}
                printSubView="question-only"
                onMenuLabelChange={fetchSections}
                docBranchMain={docBranchMain}
                docBranchSub={docBranchSub}
              />
            )}

          {/* Dynamic Sections (301-399) - 300 Template */}
          {activeSection !== '300' &&
            parseInt(activeSection) >= 301 && parseInt(activeSection) < 400 && (
              <Pqs300SectionEditor
                key={`300-${EXAMPLE_DOC_ID}`}
                docId={EXAMPLE_DOC_ID}
                sectionNumber={parseInt(activeSection)}
                title={sections.find(s => s.section_number.toString() === activeSection)?.title_th || sections.find(s => s.section_number.toString() === activeSection)?.title || ""}
                subTitle={(() => {
                  const section = sections.find(s => s.section_number.toString() === activeSection);
                  if (!section) return "";
                  const parts = section.menu_label.split(' ');
                  return parts.length > 1 ? parts.slice(1).join(' ') : "";
                })()}
                isPreviewMode={false}
                viewMode={viewMode}
                printSubView="question-only"
                onMenuLabelChange={fetchSections}
                docBranchMain={docBranchMain}
                docBranchSub={docBranchSub}
              />
            )}

        </div>
      </main>
    </div>
  );
};

// Helper Components for Sidebar (read-only — no delete, no add)
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
  sectionNumber?: number;
}> = ({ title, onClick, isActive, isSystemDefined, sectionNumber }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-2 py-1.5 text-sm rounded transition-colors truncate ${isActive
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
      : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800'
      }`}
  >
    {title}
    {isSystemDefined && sectionNumber !== 101 && <span className="ml-2 text-xs text-gray-400">🔒</span>}
  </button>
);

export default PqsExamplePage;
