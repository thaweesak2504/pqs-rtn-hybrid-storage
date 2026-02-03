import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Container from '../ui/Container'
import { useAuth } from '../../hooks/useAuth'
import CreatePqsForm from '../forms/CreatePqsForm'
import SearchPqsForm from '../forms/SearchPqsForm'
import Button from '../ui/Button'
import { FilePlus, Search } from 'lucide-react'
import { ContentEditor } from '../forms/ContentEditor'

const EditorPage: React.FC = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'create' | 'search'>('create')

  // State to hold the document currently being edited
  const [editingDoc, setEditingDoc] = useState<any | null>(null)
  const [savedDocId, setSavedDocId] = useState<string | null>(null)

  const navigate = useNavigate(); // Needs to be added to imports

  useEffect(() => {
    const lastId = localStorage.getItem('lastActiveDocId');
    if (lastId) {
      setSavedDocId(lastId);
    }
  }, []);

  const handleEditDocument = (doc: any) => {
    setEditingDoc(doc)
    setActiveTab('create')
  }

  const handleCreateSuccess = (docId?: string) => {
    // If we have a docId (newly created or updated), keep us in edit mode
    // so the user can see the ContentEditor immediately.
    if (docId) {
      // If we don't have the full doc object, we at least need the ID for ContentEditor
      // Ideally we would fetch the fresh doc here, but for now let's update what we can.
      // If it was a new creation, editingDoc is null. We need to set it.
      if (!editingDoc) {
        setEditingDoc({ id: docId }) // Partial object just for ID
      }
      // If updating, editingDoc is already set.
    } else {
      setEditingDoc(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingDoc(null)
    setActiveTab('search')
  }

  return (
    <Container size="medium" padding="large" className="py-8">
      {/* Header Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-github-text-primary">
            Editor Dashboard
          </h1>
          <p className="text-github-text-secondary mt-1">
            Manage PQS documents and content. Welcome, {user?.username}.
          </p>

          {/* Quick Resume Button */}
          {savedDocId && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md flex items-center justify-between">
              <span className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                You were working on Document <strong>{savedDocId}</strong>
              </span>
              <Button
                onClick={() => navigate(`/pqs/${savedDocId}`)}
                variant="primary"
                size="small"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Resume Editing
              </Button>
            </div>
          )}
        </div>

        {/* Simple Tab Switcher */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 space-x-1">
          <Button
            onClick={() => { setActiveTab('create'); setEditingDoc(null); }}
            variant={activeTab === 'create' ? 'primary' : 'ghost'}
            size="small"
            icon={<FilePlus className="w-4 h-4" />}
            className={`justify-center ${activeTab === 'create' ? '' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
          >
            {editingDoc ? 'Edit Document' : 'Create New'}
          </Button>
          <Button
            onClick={() => { setActiveTab('search'); setEditingDoc(null); }}
            variant={activeTab === 'search' ? 'primary' : 'ghost'}
            size="small"
            icon={<Search className="w-4 h-4" />}
            className={`justify-center ${activeTab === 'search' ? '' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
          >
            Search & Manage
          </Button>
        </div>
      </div>

      {activeTab === 'create' ? (
        <div className="space-y-8">
          <CreatePqsForm
            initialData={editingDoc}
            onSuccess={handleCreateSuccess}
            onCancel={editingDoc ? handleCancelEdit : undefined}
          />

          {editingDoc && <ContentEditor docId={editingDoc.id} />}
        </div>
      ) : (
        <SearchPqsForm onEdit={handleEditDocument} />
      )}
    </Container>
  )
}

export default EditorPage
