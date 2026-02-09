import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import { FormInput, FormTextarea, FormSelect, FormGroup, FormRow, FormActions } from '../ui/Form'
import Button from '../ui/Button'
import UnitSelector from '../common/UnitSelector'
import { Save, CheckCircle, AlertCircle } from 'lucide-react'

interface CreateDocumentArgs {
  name: string
  unit_id: string
  unit_code: string
  applied_to: string
  doc_type: string
  user_level: string
}

interface CreatePqsFormProps {
  initialData?: any
  onSuccess?: (docId?: string) => void
  onCancel?: () => void
}

const CreatePqsForm: React.FC<CreatePqsFormProps> = ({ initialData, onSuccess, onCancel }) => {
  // Unit Selection State
  const [selectedUnit, setSelectedUnit] = useState<{ finalUnitId: string, unitCode: string }>({ finalUnitId: '', unitCode: '' })

  // Form State
  const [docName, setDocName] = useState('')
  const [appliedTo, setAppliedTo] = useState('')
  const [docType, setDocType] = useState('10')
  const [userLevel, setUserLevel] = useState('2')

  // UI State
  const [previewId, setPreviewId] = useState('Waiting for selection...')
  const [isLoading, setIsLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const isEditing = !!initialData

  // Populate form when initialData changes
  useEffect(() => {
    if (initialData) {
      setDocName(initialData.name || '')
      setAppliedTo(initialData.applied_to || '')
      setDocType(initialData.doc_type || '10')
      setUserLevel(initialData.user_level || '2')

      // For ID, we just show it, we don't allow changing unit in simple edit mode normally
      // But for now let's just show the ID in preview and verify usage
      setPreviewId(initialData.id)

      // Pre-fill unit selector if possible? 
      // This is tricky because UnitSelector is self-contained. 
      // For simple edit (content only), we might disable unit selection or just display the unit code.
      // Let's assume for now we keep the unit as is and just display it.
      setSelectedUnit({
        finalUnitId: initialData.unit_owner_id || '',
        unitCode: initialData.unit_code || ''
      })
    } else {
      // Reset if switching back to create
      setDocName('')
      setAppliedTo('')
      setDocType('10')
      setUserLevel('2')
      setPreviewId('Waiting for selection...')
      setSelectedUnit({ finalUnitId: '', unitCode: '' })
    }
  }, [initialData])

  // Auto-generate ID Preview (Only if NOT editing)
  useEffect(() => {
    if (isEditing) return

    const generatePreview = async () => {
      if (!selectedUnit.unitCode) {
        setPreviewId("Waiting for unit selection...")
        return
      }

      setPreviewId("Calculating...")

      try {
        const id = await invoke<string>('generate_document_id_preview', {
          unitCode: selectedUnit.unitCode,
          docType,
          userLevel
        })
        setPreviewId(id)
      } catch (err) {
        console.error("ID Generation Error:", err)
        setPreviewId(`Error: ${err}`)
      }
    }

    const timer = setTimeout(generatePreview, 300)
    return () => clearTimeout(timer)
  }, [selectedUnit.unitCode, docType, userLevel, isEditing])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMsg(null)
    setErrorMsg(null)
    setIsLoading(true)

    // Validation
    if (!docName.trim() || !appliedTo.trim()) {
      setErrorMsg("Please fill in all required fields (Name & Objective).")
      setIsLoading(false)
      return
    }

    try {
      let resultId = initialData?.id;

      if (isEditing) {
        // Update existing document
        await invoke('update_document', {
          args: {
            id: initialData.id,
            name: docName,
            applied_to: appliedTo,
            doc_type: docType,
            user_level: userLevel
          }
        })
        setSuccessMsg(`Document updated successfully!`)
      } else {
        // Create new document
        if (!selectedUnit.finalUnitId) {
          throw "Please select a valid unit."
        }

        const args: CreateDocumentArgs = {
          name: docName,
          unit_id: selectedUnit.finalUnitId,
          unit_code: selectedUnit.unitCode,
          applied_to: appliedTo,
          doc_type: docType,
          user_level: userLevel
        }

        const newId = await invoke<string>('create_new_document', { args })
        resultId = newId;

        // DON'T reset/clear form immediately if we want to stay in edit mode,
        // but onSuccess will likely handle the transition.
        setSuccessMsg(`Document created successfully! New ID: ${newId}`)
      }

      if (onSuccess) onSuccess(resultId)

    } catch (err: any) {
      console.error("Operation failed:", err)
      setErrorMsg(typeof err === 'string' ? err : "Failed to save document")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-github-bg-secondary border border-github-border-primary rounded-xl p-6 shadow-sm">
      <div className="mb-6 pb-4 border-b border-github-border-primary flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-github-text-primary">
            {isEditing ? `Edit Document: ${initialData.id}` : 'Create New PQS Document'}
          </h2>
          <p className="text-github-text-secondary text-sm mt-1">
            {isEditing ? 'Update document details.' : 'Define the new document structure and generate its official ID.'}
          </p>
        </div>
        {onCancel && (
          <Button variant="ghost" size="small" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <FormRow className="items-start">
          {/* Left Column: Organization & ID */}
          <div className="space-y-6">
            {isEditing ? (
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <label className="block text-xs font-semibold text-github-text-secondary uppercase tracking-wider mb-2">
                  1. Unit Owner (Locked)
                </label>
                <div className="text-sm font-medium text-github-text-primary">
                  Unit Code: {initialData?.unit_code || 'N/A'}
                  <div className="text-xs text-orange-600 dark:text-orange-400 mt-2 font-semibold">
                    Note: Document ID is permanent.
                  </div>
                </div>
              </div>
            ) : (
              <UnitSelector
                label="1. Unit Owner"
                onSelectionChange={(sel) => setSelectedUnit(sel)}
              />
            )}

            <div className="bg-github-bg-tertiary p-4 rounded-lg border border-github-border-muted">
              <label className="block text-xs font-semibold text-github-text-secondary uppercase tracking-wider mb-2">
                {isEditing ? 'Document ID' : 'Next Available ID (Preview)'}
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">
                  {previewId}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Document Info */}
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-github-fg-default mb-3 uppercase tracking-wider">2. Document Details</h3>
            <FormGroup>
              <FormInput
                name="docName"
                label="ชื่อเอกสาร (Document Title)"
                placeholder="ตัวอย่าง: พนักงานควบคุมการยิงระบบอาวุธปล่อยนำวิถี..."
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                required
              />

              <FormRow>
                <FormSelect
                  name="docType"
                  label="ประเภทเอกสาร (Type)"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  options={[
                    { value: '10', label: '10 - General (ทั่วไป)' },
                    { value: '20', label: '20 - Specific (เฉพาะ)' }
                  ]}
                />
                <FormSelect
                  name="userLevel"
                  label="ระดับชั้นผู้ใช้ (User Level)"
                  value={userLevel}
                  onChange={(e) => setUserLevel(e.target.value)}
                  options={[
                    { value: '0', label: '0 - Commissioned (สัญญาบัตร)' },
                    { value: '1', label: '1 - Non-commissioned (ประทวน)' },
                    { value: '2', label: '2 - Undefined (ไม่ระบุ)' },
                    { value: '3', label: '3 - Both (ประทวน และ สัญญาบัตร)' }
                  ]}
                />
              </FormRow>

              <FormTextarea
                name="appliedTo"
                label="การประยุกต์ใช้ (Applied To)"
                placeholder="ตัวอย่าง: ตำแหน่งพนักงานควบคุมการยิงระบบอาวุธปล่อยนำวิถี..."
                value={appliedTo}
                onChange={(e) => setAppliedTo(e.target.value)}
                rows={3}
                required
              />
            </FormGroup>
          </div>
        </FormRow>

        <FormActions className="border-t border-github-border-muted pt-6 flex flex-col items-stretch gap-4">
          {/* Feedback Messages */}
          {successMsg && (
            <div className="flex items-center p-4 mb-2 text-sm text-green-800 border border-green-300 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400 dark:border-green-800">
              <CheckCircle className="flex-shrink-0 inline w-5 h-5 mr-3" />
              <div>
                <span className="font-bold">Success!</span> {successMsg}
              </div>
            </div>
          )}
          {errorMsg && (
            <div className="flex items-center p-4 mb-2 text-sm text-red-800 border border-red-300 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400 dark:border-red-800">
              <AlertCircle className="flex-shrink-0 inline w-5 h-5 mr-3" />
              <div>
                <span className="font-bold">Error:</span> {errorMsg}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            {onCancel && (
              <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
            )}
            <Button
              type="submit"
              variant="primary"
              size="large"
              icon={<Save className="w-5 h-5" />}
              loading={isLoading}
              disabled={(!isEditing && !selectedUnit.finalUnitId) || !docName || !appliedTo}
            >
              {isEditing ? 'Update Document' : 'Create Document'}
            </Button>
          </div>
        </FormActions>
      </form>
    </div>
  )
}

export default CreatePqsForm
