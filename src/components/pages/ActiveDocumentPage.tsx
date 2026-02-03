import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import { ArrowLeft, Menu, ChevronDown, ChevronRight, Plus } from 'lucide-react';

import { invoke } from '@tauri-apps/api/tauri';

interface Document {
  id: string;
  name: string;
  updated_at: string | null;
  created_at: string | null;
}

interface DocumentHierarchy {
  document: Document;
  hierarchy: string[];
}

import CoverPageView from '../views/CoverPageView';

const ActiveDocumentPage: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [docData, setDocData] = useState<DocumentHierarchy | null>(null);
  const [activeSection, setActiveSection] = useState<string>('cover'); // 'cover', 'intro', '100', '200', '300'

  useEffect(() => {
    if (docId) {
      // Save to localStorage for quick resume
      localStorage.setItem('lastActiveDocId', docId);

      invoke<DocumentHierarchy>('get_document_with_hierarchy', { id: docId })
        .then(data => setDocData(data))
        .catch(err => console.error("Failed to fetch doc:", err));
    }
  }, [docId]);

  if (!docId) return <div>Invalid Document ID</div>;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-github-bg-primary overflow-hidden">
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

          {/* 100 Section */}
          <SectionGroup title="100 Section">
            <SectionItem title="100 Introduction" onClick={() => setActiveSection('100')} isActive={activeSection === '100'} />
            <AddSubSectionBtn />
          </SectionGroup>

          {/* 200 Section */}
          <SectionGroup title="200 Section">
            <SectionItem title="200 Introduction" onClick={() => setActiveSection('200')} isActive={activeSection === '200'} />
            <AddSubSectionBtn />
          </SectionGroup>

          {/* 300 Section */}
          <SectionGroup title="300 Section">
            <SectionItem title="300 Introduction" onClick={() => setActiveSection('300')} isActive={activeSection === '300'} />
            <AddSubSectionBtn />
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
              <h1 className="text-base font-semibold text-github-text-primary leading-tight">
                มาตรฐานกำลังพล : {docId} {docData?.document.name || '...'}
              </h1>

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
        <div className="flex-1 overflow-y-auto p-8 bg-gray-100 dark:bg-github-bg-primary">
          {activeSection === 'cover' && docData && (
            <CoverPageView
              id={docData.document.id}
              name={docData.document.name}
              hierarchy={docData.hierarchy}
            />
          )}

          {activeSection !== 'cover' && (
            <div className="max-w-[210mm] mx-auto bg-white dark:bg-github-bg-secondary shadow-lg min-h-[297mm] p-12 border border-gray-200 dark:border-github-border-primary relative">
              <div className="flex flex-col items-center justify-center h-full text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                <p>Implementing: {activeSection.toUpperCase()}</p>
              </div>
            </div>
          )}
        </div>
      </main>
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

const SectionItem: React.FC<{ title: string, onClick?: () => void, isActive?: boolean }> = ({ title, onClick, isActive }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-2 py-1.5 text-sm rounded transition-colors truncate ${isActive
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
      : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800'
      }`}
  >
    {title}
  </button>
);

const AddSubSectionBtn: React.FC = () => (
  <button className="w-full flex items-center text-left px-2 py-1.5 text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-gray-900 rounded transition-colors group">
    <Plus className="w-3 h-3 mr-1" />
    <span>Add Sub section</span>
  </button>
);

export default ActiveDocumentPage;
