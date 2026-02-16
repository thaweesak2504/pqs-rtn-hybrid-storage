import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import { FormInput } from '../ui/Form';

interface EditMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  docId: string;
  initialName: string;
  initialAppliedTo: string;
  onSuccess: () => void;
}

const EditMetadataModal: React.FC<EditMetadataModalProps> = ({
  isOpen,
  onClose,
  docId,
  initialName,
  initialAppliedTo,
  onSuccess
}) => {
  const [name, setName] = useState(initialName);
  const [appliedTo, setAppliedTo] = useState(initialAppliedTo);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await invoke('update_document', {
        args: {
          id: docId,
          name,
          applied_to: appliedTo
        }
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to update document:', err);
      setErrorMsg(`Failed to update: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-github-bg-secondary border border-github-border-primary rounded-lg shadow-xl max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-github-border-primary">
          <h2 className="text-xl font-bold text-github-text-primary">Edit Document Metadata</h2>
          <button
            onClick={onClose}
            className="text-github-text-secondary hover:text-github-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded">
              {errorMsg}
            </div>
          )}

          <div>
            <FormInput
              name="name"
              label="Document Name"
              placeholder="Enter document name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <FormInput
              name="appliedTo"
              label="Applied To (การประยุกต์ใช้)"
              placeholder="e.g., เรือทุกลำที่ติดตั้งระบบ CIWS MK15"
              value={appliedTo}
              onChange={(e) => setAppliedTo(e.target.value)}
              required
            />
            <p className="text-xs text-github-text-secondary mt-1">
              This content will be displayed in the Introduction section (ข้อ ๒).
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !name.trim() || !appliedTo.trim()}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMetadataModal;
