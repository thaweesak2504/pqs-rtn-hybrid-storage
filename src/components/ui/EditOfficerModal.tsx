import React, { useState, useEffect } from 'react';
import Button from './Button';
import { X, Save, User, Briefcase, Globe } from 'lucide-react';
import { FormInput, FormSelect, FormGroup, FormActions } from './Form';
import { CustomSelect } from './CustomSelect';

interface HighRankingOfficer {
  id: number;
  thai_name: string;
  position_thai: string;
  position_english: string;
  order_index: number;
}

interface EditOfficerModalProps {
  isOpen: boolean;
  onClose: () => void;
  officer: HighRankingOfficer | null;
  onSave: (updatedOfficer: HighRankingOfficer) => void;
}

const EditOfficerModal: React.FC<EditOfficerModalProps> = ({
  isOpen,
  onClose,
  officer,
  onSave
}) => {
  const [formData, setFormData] = useState({
    thai_name: '',
    position_thai: '',
    position_english: '',
    order_index: 1
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update form data when officer changes
  useEffect(() => {
    if (officer) {
      setFormData({
        thai_name: officer.thai_name,
        position_thai: officer.position_thai,
        position_english: officer.position_english,
        order_index: officer.order_index
      });
    }
  }, [officer]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!officer) return;

    // Validation
    if (!formData.thai_name.trim()) {
      setError('กรุณากรอกชื่อภาษาไทย');
      return;
    }
    if (!formData.position_thai.trim()) {
      setError('กรุณากรอกตำแหน่งภาษาไทย');
      return;
    }
    if (!formData.position_english.trim()) {
      setError('กรุณากรอกตำแหน่งภาษาอังกฤษ');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updatedOfficer: HighRankingOfficer = {
        ...officer,
        thai_name: formData.thai_name.trim(),
        position_thai: formData.position_thai.trim(),
        position_english: formData.position_english.trim(),
        order_index: formData.order_index
      };

      onSave(updatedOfficer);
      onClose();
    } catch (error) {
      setError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      console.error('Failed to save officer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  if (!isOpen || !officer) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-github-bg-primary dark:bg-github-bg-primary border border-github-border-primary rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-github-border-primary">
          <h2 className="text-xl font-bold text-github-text-primary flex items-center gap-2">
            <User className="w-5 h-5 text-github-accent-warning" />
            แก้ไขข้อมูลผู้บังคับบัญชา
          </h2>
          <button
            onClick={handleClose}
            className="text-github-text-secondary hover:text-github-text-primary transition-colors p-1 rounded-lg hover:bg-github-bg-tertiary"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 relative">
          <FormGroup>
            <FormInput
              name="thai_name"
              value={formData.thai_name}
              onChange={(e) => handleInputChange('thai_name', e.target.value)}
              label="ชื่อภาษาไทย"
              placeholder="กรอกชื่อภาษาไทย"
              icon={User}
              required
            />

            <FormInput
              name="position_thai"
              value={formData.position_thai}
              onChange={(e) => handleInputChange('position_thai', e.target.value)}
              label="ตำแหน่งภาษาไทย"
              placeholder="กรอกตำแหน่งภาษาไทย"
              icon={Briefcase}
              required
            />

            <FormInput
              name="position_english"
              value={formData.position_english}
              onChange={(e) => handleInputChange('position_english', e.target.value)}
              label="ตำแหน่งภาษาอังกฤษ"
              placeholder="Enter position in English"
              icon={Globe}
              required
            />

            <CustomSelect
              name="order_index"
              value={formData.order_index.toString()}
              onChange={(e) => handleInputChange('order_index', parseInt(e.target.value))}
              label="ลำดับการแสดงผล"
              options={[
                { value: '1', label: '1 - แสดงแรก' },
                { value: '2', label: '2 - แสดงที่สอง' },
                { value: '3', label: '3 - แสดงที่สาม' }
              ]}
            />
          </FormGroup>

          {/* Error Message */}
          {error && (
            <div className="bg-github-accent-danger/10 border border-github-accent-danger/30 rounded-lg p-3">
              <p className="text-github-accent-danger text-sm font-medium">{error}</p>
            </div>
          )}

          <FormActions>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 border-github-border-primary text-github-text-primary hover:bg-github-bg-tertiary hover:border-github-accent-warning"
              disabled={isLoading}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={isLoading}
              icon={<Save className="w-4 h-4" />}
            >
              {isLoading ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </FormActions>
        </form>
      </div>
    </div>
  );
};

export default EditOfficerModal;
