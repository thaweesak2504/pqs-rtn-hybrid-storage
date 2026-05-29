import { convertFileSrc, invoke } from "@tauri-apps/api/tauri";
import React, { useEffect, useState } from "react";
import Tooltip from "../ui/Tooltip";
import { logger } from '../../utils/logger';

interface AsyncImagePreviewProps {
  path: string;
  className?: string;
  onImageClick?: (src: string) => void;
}

const AsyncImagePreview: React.FC<AsyncImagePreviewProps> = ({ path, className, onImageClick }) => {
  const [src, setSrc] = useState<string>("");
  const [resolvedPath, setResolvedPath] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        if (!path) return;
        if (path.startsWith("http") || path.startsWith("asset")) {
          setSrc(path);
          return;
        }

        // Use backend to get base64 data directly (Reliable method)
        const base64Data = await invoke<string>("get_question_image_base64", { path });
        setSrc(base64Data);
        setResolvedPath(path); // Keep original path for opening
      } catch (e) {
        logger.error("Failed to load image preview", e);
        // Fallback
        setSrc(convertFileSrc(path));
      }
    }
    load();
  }, [path]);

  if (!src) return <div className={`animate-pulse bg-gray-200 dark:bg-slate-700 ${className}`} />;

  return (
    <Tooltip content="คลิกเพื่อเปิดรูปภาพขยาย">
      <img
        src={src}
        alt="Preview"
        className={`cursor-pointer ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          if (onImageClick) {
            onImageClick(src);
          } else if (resolvedPath) {
            invoke("open_path", { path: resolvedPath });
          }
        }}
        onError={() => {
          logger.error("Image load error for src:", src);
        }}
      />
    </Tooltip>
  );
};

export default AsyncImagePreview;
