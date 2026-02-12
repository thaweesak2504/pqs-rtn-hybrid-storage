import React, { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  variant = 'danger'
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setTimeout(() => setIsVisible(false), 300); // Animation delay
    }
  }, [isOpen]);

  if (!isVisible && !isOpen) return null;

  const colorClasses = {
    danger: {
      icon: 'text-red-500 bg-red-100 dark:bg-red-900/30',
      button: 'bg-red-600 hover:bg-red-700 text-white',
      border: 'border-red-500'
    },
    warning: {
      icon: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      border: 'border-yellow-500'
    },
    info: {
      icon: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      border: 'border-blue-500'
    }
  };

  const colors = colorClasses[variant];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`relative bg-white dark:bg-github-bg-secondary rounded-lg shadow-xl w-full max-w-sm border border-github-border-primary transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 text-center">
          {/* Icon */}
          <div className={`mx-auto flex items-center justify-center w-12 h-12 rounded-full mb-4 ${colors.icon}`}>
            <AlertCircle className="w-6 h-6" />
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-github-text-primary mb-2">
            {title}
          </h3>

          {/* Message */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 whitespace-pre-line">
            {message}
          </p>

          {/* Actions */}
          <div className="flex justify-center gap-3">
            {cancelText && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-github-bg-tertiary dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-800 transition-colors"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-4 py-2 text-sm font-medium rounded-md shadow-sm transition-colors ${colors.button}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
