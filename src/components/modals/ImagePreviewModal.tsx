import React, { useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  altText?: string;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  altText = 'Image Preview'
}) => {
  const [scale, setScale] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);

  // Reset zoom/rotation when image changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, imageSrc]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/90 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Full-screen container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-auto max-w-[95vw] transform rounded-lg bg-transparent text-left shadow-xl transition-all">

          {/* Toolbar */}
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            <button
              onClick={() => setScale(s => Math.min(s + 0.25, 3))}
              className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={() => setScale(s => Math.max(s - 0.25, 0.5))}
              className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={() => setRotation(r => r + 90)}
              className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              title="Rotate"
            >
              <RotateCw className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/50 text-white hover:bg-red-900/80 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Image Container */}
          <div className="flex items-center justify-center max-h-[90vh] overflow-hidden">
            <img
              src={imageSrc}
              alt={altText}
              className="max-w-full max-h-[90vh] object-contain transition-transform duration-200"
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg)`,
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Caption (optional) */}
          {altText && (
            <div className="text-center mt-4 text-white/80 text-sm pointer-events-none relative z-10">
              {altText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewModal;
