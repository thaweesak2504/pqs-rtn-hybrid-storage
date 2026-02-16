import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Container from '../ui/Container'
import { useAuth } from '../../hooks/useAuth'
import CreatePqsForm from '../forms/CreatePqsForm'
import SearchPqsForm from '../forms/SearchPqsForm'
import Button from '../ui/Button'
import { FilePlus, Search, LayoutDashboard, Clock } from 'lucide-react'
import { invoke } from '@tauri-apps/api/tauri'

interface DocumentStats {
  total_count: number;
  draft_count: number;
}

const EditorPage: React.FC = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'create' | 'search'>('create')
  const navigate = useNavigate()

  // State to hold the document currently being edited
  const [editingDoc, setEditingDoc] = useState<any | null>(null)
  const [stats, setStats] = useState<DocumentStats>({ total_count: 0, draft_count: 0 })
  const [recentDrafts, setRecentDrafts] = useState<any[]>([])

  const fetchStats = async () => {
    try {
      const data = await invoke<DocumentStats>('get_document_stats')
      setStats(data)
    } catch (err) {
      console.error("Failed to fetch stats:", err)
    }
  }

  const fetchRecentDrafts = async () => {
    try {
      // Search for status='draft', limit 5
      const data = await invoke<any[]>('search_documents', {
        unitIdPrefix: null,
        docType: null,
        namePart: null,
        status: 'draft'
      })
      setRecentDrafts(data.slice(0, 5)) // Ensure we only show top 5
    } catch (err) {
      console.error("Failed to fetch recent drafts:", err)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchRecentDrafts()
  }, [])

  const handleEditDocument = (doc: any) => {
    setEditingDoc(doc)
    setActiveTab('create')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCreateSuccess = (docId?: string) => {
    fetchStats()
    fetchRecentDrafts()

    // If we have a docId and we were NOT in editing mode, it's a new creation.
    // Redirect to the PQS editor immediately as requested by the user.
    if (docId && !editingDoc) {
      navigate(`/pqs/${docId}`)
    } else if (docId) {
      // If we were already editing metadata, just update the state
      setEditingDoc({ id: docId })
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
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-github-text-primary">
            Editor Dashboard
          </h1>
          <p className="text-github-text-secondary mt-1">
            Manage PQS documents and content. Welcome, {user?.username}.
          </p>
        </div>

        {/* Simple Tab Switcher */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-github-border-primary space-x-1 self-start">
          <Button
            onClick={() => setActiveTab('create')}
            variant={activeTab === 'create' ? 'primary' : 'ghost'}
            size="small"
            icon={<FilePlus className="w-4 h-4" />}
            className={`justify-center ${activeTab === 'create' ? '' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
          >
            {editingDoc ? 'Edit Document' : 'Create New'}
          </Button>
          <Button
            onClick={() => setActiveTab('search')}
            variant={activeTab === 'search' ? 'primary' : 'ghost'}
            size="small"
            icon={<Search className="w-4 h-4" />}
            className={`justify-center ${activeTab === 'search' ? '' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
          >
            Search & Manage
          </Button>
        </div>
      </div>

      {/* Dashboard Content (Visible only when not actively editing/creating or on search tab) */}
      {!editingDoc && activeTab === 'create' ? (
        <div className="space-y-8">
          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-github-bg-secondary p-5 rounded-xl border border-gray-200 dark:border-github-border-primary shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-github-text-secondary font-semibold uppercase tracking-wider">เอกสารทั้งหมด</p>
                <p className="text-3xl font-bold text-github-text-primary mt-0.5">{stats.total_count}</p>
              </div>
            </div>
            <div
              className={`bg-white dark:bg-github-bg-secondary p-5 rounded-xl border border-gray-200 dark:border-github-border-primary shadow-sm flex items-center gap-4 transition-all ${stats.draft_count > 0 ? 'cursor-pointer hover:border-orange-400 dark:hover:border-orange-500 group' : ''}`}
              onClick={() => stats.draft_count > 0 && setActiveTab('search')}
            >
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-github-text-secondary font-semibold uppercase tracking-wider">กำลังดำเนินการ (Draft)</p>
                <p className="text-3xl font-bold text-github-text-primary mt-0.5">{stats.draft_count}</p>
              </div>
            </div>
          </div>

          {/* Recent Drafts Section */}
          {recentDrafts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-github-text-primary flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-orange-500" />
                  เอกสารที่กำลังดำเนินการล่าสุด
                </h2>
                <Button variant="ghost" size="small" onClick={() => setActiveTab('search')} className="text-blue-600">
                  ดูทั้งหมด
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {recentDrafts.map((doc) => (
                  <div key={doc.id} className="bg-white dark:bg-github-bg-secondary p-4 rounded-xl border border-gray-200 dark:border-github-border-primary shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg mt-1">
                        <FilePlus className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-github-text-primary">{doc.name}</h3>
                        <p className="text-xs text-github-text-secondary font-mono mt-0.5">ID: {doc.id} • {doc.unit_code}</p>
                        <p className="text-[10px] text-github-text-tertiary mt-1 italic">
                          แก้ไขล่าสุด: {new Date(doc.updated_at || doc.created_at).toLocaleDateString('th-TH')}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => navigate(`/pqs/${doc.id}`)}
                      variant="primary"
                      size="small"
                      className="w-full sm:w-auto"
                    >
                      ดำเนินการต่อ
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 mt-4 border-t border-github-border-muted">
            <h2 className="text-lg font-bold text-github-text-primary mb-4 flex items-center">
              <FilePlus className="w-5 h-5 mr-2 text-blue-500" />
              สร้างเอกสารใหม่
            </h2>
            <CreatePqsForm
              initialData={editingDoc}
              onSuccess={handleCreateSuccess}
              onCancel={handleCancelEdit}
            />
          </div>
        </div>
      ) : activeTab === 'create' ? (
        /* Edit Mode UI */
        <div className="space-y-8">
          <CreatePqsForm
            initialData={editingDoc}
            onSuccess={handleCreateSuccess}
            onCancel={handleCancelEdit}
          />
        </div>
      ) : (
        /* Search Tab */
        <SearchPqsForm onEdit={handleEditDocument} />
      )}
    </Container>
  )
}

export default EditorPage
