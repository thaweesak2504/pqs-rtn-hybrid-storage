import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface VideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoSrc: string;
}

const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({
  isOpen,
  onClose,
  videoSrc,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      // Pause video when modal closes
      if (videoRef.current) videoRef.current.pause();
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/90 transition-opacity" onClick={onClose} aria-hidden="true" />

      {/* Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-auto max-w-[90vw] transform rounded-lg bg-transparent shadow-xl transition-all">
          {/* Close button */}
          <div className="absolute -top-3 -right-3 z-50">
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/60 text-white hover:bg-red-900/80 transition-colors shadow-lg"
              title="ปิด"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Video Player */}
          <video
            ref={videoRef}
            controls
            autoPlay
            preload="metadata"
            className="max-w-[85vw] max-h-[80vh] rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <source src={videoSrc} />
          </video>
        </div>
      </div>
    </div>
  );
};

export default VideoPreviewModal;
