import React, { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import { invoke } from '@tauri-apps/api/tauri'
import Button from '../ui/Button' // Assuming default export based on name
// import Form inputs or use generic HTML/Tailwind for speed/customization?
import { logger } from '../../utils/logger';
// Checking Form.tsx might be useful but standard inputs are fine for this specificity.

interface OwnerUnit {
  unit_id: string
  unit_name: string
  unit_abbr: string | null
  parent_id: string | null
  unit_level: number | null
}

interface CreateDocumentArgs {
  name: string
  unit_id: string
  unit_code: string
  applied_to: string
  doc_type: string
  user_level: string
}

interface CreatePqsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const CreatePqsModal: React.FC<CreatePqsModalProps> = ({ isOpen, onClose, onSuccess }) => {
  // Cascading Selection State
  const [l2Units, setL2Units] = useState<OwnerUnit[]>([]) // Direct Reporting Units
  const [l3Units, setL3Units] = useState<OwnerUnit[]>([]) // Divisions
  const [l4Units, setL4Units] = useState<OwnerUnit[]>([]) // Sections

  const [selectedL2, setSelectedL2] = useState<string>('')
  const [selectedL3, setSelectedL3] = useState<string>('')
  const [selectedL4, setSelectedL4] = useState<string>('')

  // Document Info State
  const [docName, setDocName] = useState('')
  const [appliedTo, setAppliedTo] = useState('')
  const [docType, setDocType] = useState('10') // Default 10: General
  const [userLevel, setUserLevel] = useState('2') // Default 2: Undefined

  // Preview State
  const [previewId, setPreviewId] = useState('Waiting for selection...')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch Initial Units (L2 - Direct Reporting Units under Navy?)
  // Assuming Navy is root. get_owner_units(null) returns roots.
  // We want filtering logic.
  // Start by fetching roots (L2 in our concept may be children of L1 Navy)
  // Let's assume get_owner_units(null) gets everything with parent_id IS NULL.
  useEffect(() => {
    if (isOpen) {
      loadRootUnits()
      // Reset form
      setDocName('')
      setAppliedTo('')
      setDocType('10')
      setUserLevel('2')
      setSelectedL2('')
      setSelectedL3('')
      setSelectedL4('')
      setPreviewId('')
    }
  }, [isOpen])

  const loadRootUnits = async () => {
    try {
      // Logic: L1 is "Royal Thai Navy" (Static or ID?). 
      // If our DB structure has Navy as a Unit, then L2 are its children.
      // If roots are L2 (Direct Reporting), then query null.
      // Let's try query null first.
      const units = await invoke<OwnerUnit[]>('get_owner_units', { parentId: null })
      // If there is only 1 root (Navy), we might want to auto-select it and show its children (L2)
      // Check if units length > 1 or is Navy?
      // For now, let's assume 'units' here are the top level selectable items (e.g. Fleets, Departments)
      // Or if Navy is the ONLY root, we load its children.
      if (units.length === 1 && units[0]?.unit_level === 1) { // L1 logic
        // This is Navy. Load its children as L2.
        loadChildren(units[0]?.unit_id || '', setL2Units)
      } else {
        // These are likely L2s already?
        setL2Units(units)
      }
    } catch (err) {
      logger.error("Failed to load units:", err)
      setError("Failed to load initial units")
    }
  }

  const loadChildren = async (parentId: string, setter: React.Dispatch<React.SetStateAction<OwnerUnit[]>>) => {
    try {
      const units = await invoke<OwnerUnit[]>('get_owner_units', { parentId })
      setter(units)
    } catch (err) {
      logger.error(`Failed to load children for ${parentId}:`, err)
    }
  }

  // Effect: When L2 changes, load L3
  useEffect(() => {
    setL3Units([])
    setL4Units([])
    setSelectedL3('')
    setSelectedL4('')
    if (selectedL2) {
      loadChildren(selectedL2, setL3Units)
    }
  }, [selectedL2])

  // Effect: When L3 changes, load L4
  useEffect(() => {
    setL4Units([])
    setSelectedL4('')
    if (selectedL3) {
      loadChildren(selectedL3, setL4Units)
    }
  }, [selectedL3])

  // Effect: Auto-generate ID Preview
  useEffect(() => {
    const generatePreview = async () => {
      // Determine final Unit ID
      const finalUnitId = selectedL4 || selectedL3 || selectedL2
      if (!finalUnitId) {
        setPreviewId("Please select a unit")
        return
      }

      // We need unit_code (first 5 digits)
      // We can derive it here or let backend handle it.
      // Backend generate_document_id_preview expects unit_code.
      // Let's assume simple slicing for now as per spec
      const unitCode = finalUnitId.substring(0, 5)

      try {
        const id = await invoke<string>('generate_document_id_preview', {
          unitCode,
          docType,
          userLevel
        })
        setPreviewId(id)
      } catch (err) {
        setPreviewId("Error generating ID")
      }
    }

    // Debounce slightly or just run
    const timer = setTimeout(generatePreview, 300)
    return () => clearTimeout(timer)
  }, [selectedL2, selectedL3, selectedL4, docType, userLevel])

  const handleSubmit = async () => {
    setError(null)
    setIsLoading(true)

    // Validation
    const finalUnitId = selectedL4 || selectedL3 || selectedL2
    if (!finalUnitId) {
      setError("Please select a specific unit")
      setIsLoading(false)
      return
    }
    if (!docName.trim()) {
      setError("Please enter a document name")
      setIsLoading(false)
      return
    }

    try {
      const unitCode = finalUnitId.substring(0, 5) // Simplified logic

      const args: CreateDocumentArgs = {
        name: docName,
        unit_id: finalUnitId,
        unit_code: unitCode,
        applied_to: appliedTo,
        doc_type: docType,
        user_level: userLevel
      }

      await invoke('create_new_document', { args })

      if (onSuccess) onSuccess()
      onClose()
      // You might want to show a toast success here?

    } catch (err) {
      logger.error("Create failed:", err)
      setError(typeof err === 'string' ? err : "Failed to create document")
    } finally {
      setIsLoading(false)
    }
  }



  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New PQS Document"
      size="lg" // Make it wider
    >
      <div className="space-y-6">
        {/* Organization Section */}
        <div className="bg-github-canvas-subtle p-4 rounded-md border border-github-border-default">
          <h3 className="text-sm font-semibold text-github-fg-default mb-3 uppercase tracking-wider">Unit Selection</h3>

          <div className="grid grid-cols-1 gap-4">
            {/* L1 - Fixed Display */}
            <div>
              <label className="block text-xs font-medium text-github-fg-muted mb-1">Organization (L1)</label>
              <input
                type="text"
                disabled
                value="กองทัพเรือ (Royal Thai Navy)"
                className="w-full px-3 py-2 bg-github-canvas-inset border border-github-border-default rounded-md text-github-fg-muted text-sm"
              />
            </div>

            {/* L2 Selection */}
            <div>
              <label className="block text-xs font-medium text-github-fg-default mb-1">Unit / Department (L2) <span className="text-red-500">*</span></label>
              <select
                className="w-full px-3 py-2 bg-github-canvas-default border border-github-border-default rounded-md text-github-fg-default text-sm focus:ring-2 focus:ring-github-accent-emphasis outline-none"
                value={selectedL2}
                onChange={(e) => setSelectedL2(e.target.value)}
                disabled={l2Units.length === 0}
              >
                <option value="">-- Select Unit --</option>
                {l2Units.map(u => (
                  <option key={u.unit_id} value={u.unit_id}>{u.unit_name} ({u.unit_id})</option>
                ))}
              </select>
            </div>

            {/* L3 Selection */}
            <div>
              <label className="block text-xs font-medium text-github-fg-default mb-1">Division (L3)</label>
              <select
                className="w-full px-3 py-2 bg-github-canvas-default border border-github-border-default rounded-md text-github-fg-default text-sm focus:ring-2 focus:ring-github-accent-emphasis outline-none disabled:opacity-50"
                value={selectedL3}
                onChange={(e) => setSelectedL3(e.target.value)}
                disabled={!selectedL2 || l3Units.length === 0}
              >
                <option value="">-- Select Division (Optional) --</option>
                {l3Units.map(u => (
                  <option key={u.unit_id} value={u.unit_id}>{u.unit_name} ({u.unit_id})</option>
                ))}
              </select>
            </div>

            {/* L4 Selection */}
            <div>
              <label className="block text-xs font-medium text-github-fg-default mb-1">Section (L4)</label>
              <select
                className="w-full px-3 py-2 bg-github-canvas-default border border-github-border-default rounded-md text-github-fg-default text-sm focus:ring-2 focus:ring-github-accent-emphasis outline-none disabled:opacity-50"
                value={selectedL4}
                onChange={(e) => setSelectedL4(e.target.value)}
                disabled={!selectedL3 || l4Units.length === 0}
              >
                <option value="">-- Select Section (Optional) --</option>
                {l4Units.map(u => (
                  <option key={u.unit_id} value={u.unit_id}>{u.unit_name} ({u.unit_id})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Document Details Section */}
        <div className="bg-github-canvas-subtle p-4 rounded-md border border-github-border-default">
          <h3 className="text-sm font-semibold text-github-fg-default mb-3 uppercase tracking-wider">Document Details</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-github-fg-default mb-1">PQS Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-github-canvas-default border border-github-border-default rounded-md text-github-fg-default text-sm focus:ring-2 focus:ring-github-accent-emphasis outline-none"
                placeholder="e.g. Standard Procedure for Engine Start"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-github-fg-default mb-1">Applied To (Objective)</label>
              <textarea
                className="w-full px-3 py-2 bg-github-canvas-default border border-github-border-default rounded-md text-github-fg-default text-sm focus:ring-2 focus:ring-github-accent-emphasis outline-none min-h-[60px]"
                placeholder="Who or what is this PQS for?"
                value={appliedTo}
                onChange={(e) => setAppliedTo(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-github-fg-default mb-1">Type</label>
                <select
                  className="w-full px-3 py-2 bg-github-canvas-default border border-github-border-default rounded-md text-github-fg-default text-sm focus:ring-2 focus:ring-github-accent-emphasis outline-none"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                >
                  <option value="10">10 - General (ทั่วไป)</option>
                  <option value="20">20 - Specific (เฉพาะ)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-github-fg-default mb-1">User Level</label>
                <select
                  className="w-full px-3 py-2 bg-github-canvas-default border border-github-border-default rounded-md text-github-fg-default text-sm focus:ring-2 focus:ring-github-accent-emphasis outline-none"
                  value={userLevel}
                  onChange={(e) => setUserLevel(e.target.value)}
                >
                  <option value="0">0 - Commissioned (สัญญาบัตร)</option>
                  <option value="1">1 - Non-commissioned (ประทวน)</option>
                  <option value="2">2 - Undefined (ไม่ระบุ)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer / Preview */}
        <div className="flex items-center justify-between pt-4 border-t border-github-border-muted">
          <div className="flex flex-col">
            <span className="text-xs text-github-fg-muted uppercase">ID Preview</span>
            <span className="text-lg font-mono font-bold text-github-accent-fg">
              {previewId}
            </span>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create PQS'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-500 text-sm p-3 rounded-md mt-4">
            {error}
          </div>
        )}

      </div>
    </Modal>
  )
}

export default CreatePqsModal
