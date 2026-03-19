import { invoke } from '@tauri-apps/api/tauri'
import { AlertCircle, Edit, FileText, Filter, Trash2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import UnitSelector from '../common/UnitSelector'
import ConfirmModal from '../modals/ConfirmModal'
import { FormGroup, FormInput, FormSelect } from '../ui/Form'

// Backend Document Struct
interface Document {
  id: string
  name: string
  applied_to: string | null
  unit_owner_id: string | null
  unit_code: string | null
  doc_type: string | null
  user_level: string | null
  status: string | null // 'draft', etc.
  created_at: string | null
  updated_at: string | null
}

import { useNavigate } from 'react-router-dom'

interface SearchPqsFormProps {
  onEdit?: (doc: Document) => void
}

const SearchPqsForm: React.FC<SearchPqsFormProps> = ({ onEdit }) => {
  const navigate = useNavigate()
  // ... state ...

  // ... handleSearch ...

  // ... handleDelete ...

  // ... inside return ...

  // Filter State
  const [selectedUnit, setSelectedUnit] = useState<{ finalUnitId: string, unitCode: string }>({ finalUnitId: '', unitCode: '' })
  const [docType, setDocType] = useState<string>('')
  const [searchName, setSearchName] = useState('')

  // Result State
  const [results, setResults] = useState<Document[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [docToDelete, setDocToDelete] = useState<{ id: string; name: string } | null>(null)

  const handleSearch = async (e?: React.FormEvent) => {
    // ... code omitted for brevity, keeping handleSearch as is ...
    if (e) e.preventDefault()
    setIsLoading(true)
    setErrorMsg(null)
    setHasSearched(true)

    try {
      // Strip trailing "00" pairs to get the actual hierarchical prefix
      // e.g. 2270000 -> 227 (Matches 2270000, 2272400, etc.)
      // e.g. 2272400 -> 22724 (Matches 2272400, 2272410, etc.)
      let searchPrefix = selectedUnit.finalUnitId
      if (searchPrefix) {
        // Strip ALL trailing zeros to get the significant unit code
        // e.g. 2272000 -> 2272 (Matches 22724, 22725 etc.)
        searchPrefix = searchPrefix.replace(/0+$/, '')
      }

      const docs = await invoke<Document[]>('search_documents', {
        unitIdPrefix: searchPrefix || null,
        docType: docType || null,
        namePart: searchName || null,
        status: null
      })
      setResults(docs)
    } catch (err) {
      console.error("Search failed:", err)
      setErrorMsg("Failed to search documents.")
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDocToDelete({ id, name })
  }

  const handleConfirmDelete = async () => {
    if (!docToDelete) return

    try {
      await invoke('delete_document', { id: docToDelete.id })
      setDocToDelete(null)
      // Refresh results
      handleSearch()
    } catch (err) {
      console.error("Delete failed:", err)
      setErrorMsg(`Failed to delete document: ${err}`)
      setDocToDelete(null)
    }
  }



  // Helper to format Date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit' // e.g., 3 Feb 2026 14:30
    })
  }

  // Map Type to Label
  const getTypeLabel = (type: string | null) => {
    if (type === '10') return 'General'
    if (type === '20') return 'Specific'
    return type || '-'
  }

  // Auto-search effect with debounce
  useEffect(() => {
    // Only trigger if we have at least a base unit selected (L2+)
    // UnitSelector logic ensures finalUnitId is at least L2 if something is selected there
    if (!selectedUnit.finalUnitId) {
      setResults([])
      setHasSearched(false)
      return
    }

    const timer = setTimeout(() => {
      handleSearch()
    }, 300)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUnit, docType, searchName])

  return (
    <div className="space-y-6">
      {/* Search Filters */}
      <div className="bg-github-bg-secondary border border-github-border-primary rounded-xl p-6 shadow-sm">
        <div className="mb-4 pb-2 border-b border-github-border-primary flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-github-text-primary flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Search Filters
            </h2>
            <p className="text-github-text-secondary text-sm">Select a unit to automatically browse documents.</p>
          </div>
          {isLoading && (
            <span className="text-xs text-blue-600 animate-pulse font-medium">Updating results...</span>
          )}
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column 1: Unit Selector */}
            <div>
              <UnitSelector
                label="Filter by Unit"
                onSelectionChange={(sel) => setSelectedUnit(sel)}
              />
            </div>

            {/* Column 2: Other criteria */}
            <FormGroup>
              <FormInput
                name="searchName"
                label="Document Name (Partial)"
                placeholder="Type to filter by name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
              <FormSelect
                name="docType"
                label="Document Type"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                options={[
                  { value: '', label: '-- All Types --' },
                  { value: '10', label: '10 - General (ทั่วไป)' },
                  { value: '20', label: '20 - Specific (เฉพาะ)' }
                ]}
              />
            </FormGroup>
          </div>

          {errorMsg && (
            <div className="flex items-center p-3 mb-2 text-sm text-red-800 border border-red-300 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400 dark:border-red-800">
              <AlertCircle className="flex-shrink-0 inline w-5 h-5 mr-3" />
              <div>
                <span className="font-bold">Error:</span> {errorMsg}
              </div>
            </div>
          )}

          {/* Manual Search Button Removed as per request (Auto-search implemented) */}

        </form>
      </div>

      {/* Results Table */}
      {hasSearched && (
        <div className="bg-github-bg-secondary border border-github-border-primary rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-github-border-primary bg-github-bg-tertiary flex justify-between items-center">
            <h3 className="font-semibold text-github-text-primary">
              Search Results
              <span className="ml-2 text-xs font-normal text-github-text-secondary bg-github-bg-default px-2 py-0.5 rounded-full border border-github-border-muted">
                {results.length} found
              </span>
            </h3>
          </div>

          {results.length === 0 ? (
            <div className="p-8 text-center text-github-text-secondary">
              <FileText className="w-12 h-12 mx-auto mb-3 text-github-fg-muted opacity-50" />
              <p>No documents found matching your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-github-canvas-subtle text-github-text-secondary font-semibold uppercase tracking-wider text-xs border-b border-github-border-muted">
                  <tr>
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Document Name</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Unit</th>
                    <th className="px-6 py-3">Last Updated</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-github-border-muted bg-github-bg-default">
                  {results.map((doc) => (
                    <tr key={doc.id} className="hover:bg-github-canvas-subtle transition-colors">
                      <td className="px-6 py-4 font-mono text-blue-600 font-medium">{doc.id}</td>
                      <td className="px-6 py-4 font-medium text-github-text-primary">{doc.name}</td>
                      <td className="px-6 py-4 text-github-text-secondary">{getTypeLabel(doc.doc_type)}</td>
                      <td className="px-6 py-4 text-github-text-secondary font-mono text-xs">{doc.unit_code}</td>
                      <td className="px-6 py-4 text-github-text-secondary whitespace-nowrap">{formatDate(doc.updated_at || doc.created_at)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-1">
                          <button
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                            title="แก้ไขเนื้อหาเอกสาร (Edit Content)"
                            onClick={() => navigate(`/pqs/${doc.id}`)}
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                            title="แก้ไขข้อมูลหลัก (Edit Metadata)"
                            onClick={() => onEdit && onEdit(doc)}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800"
                            title="ลบเอกสาร (Delete)"
                            onClick={(e) => handleDeleteClick(e, doc.id, doc.name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!docToDelete}
        onClose={() => setDocToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบเอกสาร"
        message={`คุณต้องการลบเอกสาร "${docToDelete?.name}" หรือไม่?\nการกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmText="ลบ"
        cancelText="ยกเลิก"
        variant="danger"
      />
    </div>
  )
}

export default SearchPqsForm
