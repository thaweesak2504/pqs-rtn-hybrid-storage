import { open as openDialog } from "@tauri-apps/api/dialog";
import { convertFileSrc, invoke } from "@tauri-apps/api/tauri";
import { FileText, Headphones, Image, Paperclip, Play, Trash2, Upload } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { logger } from "../../utils/logger";

const MAX_ATTACHMENTS = 3;

const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp"];
const PDF_EXTS = ["pdf"];
const VIDEO_EXTS = ["mp4", "webm"];
const AUDIO_EXTS = ["mp3", "wav", "m4a", "ogg"];

type FileCategory = "image" | "pdf" | "video" | "audio" | "unknown";

function categorize(path: string): FileCategory {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  if (IMAGE_EXTS.includes(ext)) return "image";
  if (PDF_EXTS.includes(ext)) return "pdf";
  if (VIDEO_EXTS.includes(ext)) return "video";
  if (AUDIO_EXTS.includes(ext)) return "audio";
  return "unknown";
}

function friendlyName(path: string): string {
  const filename = path.split("/").pop() || path;
  const lastDot = filename.lastIndexOf(".");
  let stem = lastDot !== -1 ? filename.substring(0, lastDot) : filename;
  const ext = lastDot !== -1 ? filename.substring(lastDot) : "";
  
  // Strip trainee suffix: e.g. _T-001_18b15734 or _18b15734
  const suffixRegex = /_T-[a-zA-Z0-9-]+_[a-fA-F0-9]{8}$|_T-[a-zA-Z0-9-]+_[a-fA-F0-9]{4}$|_[a-fA-F0-9]{8}$|_[a-fA-F0-9]{4}$/i;
  stem = stem.replace(suffixRegex, "");
  
  // Strip leading prefix: safePrefix_ or questionId_
  const prefixRegex = /^[a-zA-Z0-9ก-ฮ.-]{1,30}_/;
  stem = stem.replace(prefixRegex, "");
  
  return stem + ext;
}

interface AttachmentPanelProps {
  attachments: string[]; // current list of relative paths
  onAttachmentsChange: (next: string[]) => void;
  documentId: string;
  questionId: string;
  userId: string;
  readOnly?: boolean;
  /** When true, audio files are excluded (for question attachments) */
  excludeAudio?: boolean;
  /** Custom upload handler — if provided, overrides the default trainee upload command.
   *  Should return the relative path of the uploaded file. */
  onUploadFile?: (sourcePath: string) => Promise<string>;
  /** Custom delete handler — if provided, overrides the default trainee delete command. */
  onDeleteFile?: (relPath: string) => Promise<void>;
  onlyImageAndPdf?: boolean;
  filePrefix?: string;
}

const AttachmentPanel: React.FC<AttachmentPanelProps> = ({
  attachments,
  onAttachmentsChange,
  documentId,
  questionId,
  userId,
  readOnly = false,
  excludeAudio = false,
  onUploadFile,
  onDeleteFile,
  onlyImageAndPdf = false,
  filePrefix,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // resolved absolute paths (for audio inline player + open_path)
  const [resolvedPaths, setResolvedPaths] = useState<Record<string, string>>({});
  // base64 data for image thumbnails
  const [imageData, setImageData] = useState<Record<string, string>>({});

  // Resolve paths for display
  useEffect(() => {
    attachments.forEach(async (relPath) => {
      if (resolvedPaths[relPath]) return;
      try {
        const abs = await invoke<string>("resolve_image_path", { path: relPath });
        setResolvedPaths((prev) => ({ ...prev, [relPath]: abs }));
      } catch { /* ignore */ }
    });
  }, [attachments, resolvedPaths]);

  // Load image thumbnails
  useEffect(() => {
    attachments.forEach(async (relPath) => {
      if (imageData[relPath] || categorize(relPath) !== "image") return;
      try {
        const b64 = await invoke<string>("get_question_image_base64", { path: relPath });
        setImageData((prev) => ({ ...prev, [relPath]: b64 }));
      } catch { /* ignore */ }
    });
  }, [attachments, imageData]);

  const handleUpload = useCallback(async () => {
    if (attachments.length >= MAX_ATTACHMENTS) {
      setError(`แนบได้สูงสุด ${MAX_ATTACHMENTS} ไฟล์ต่อข้อ`);
      return;
    }
    setError(null);
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [{
          name: "ไฟล์ที่รองรับ",
          extensions: onlyImageAndPdf 
            ? [...IMAGE_EXTS, ...PDF_EXTS]
            : excludeAudio
              ? [...IMAGE_EXTS, ...PDF_EXTS, ...VIDEO_EXTS]
              : [...IMAGE_EXTS, ...PDF_EXTS, ...VIDEO_EXTS, ...AUDIO_EXTS],
        }],
      });
      if (!selected || Array.isArray(selected)) return;

      setIsUploading(true);
      
      // Calculate hash of the selected file and perform section-wide duplicate check
      try {
        const sourceHash = await invoke<string>("get_file_sha256", { pathStr: selected });
        
        const duplicatePrefix = await invoke<string | null>("check_section_duplicate_file", {
          questionId,
          fileHash: sourceHash,
        });

        if (duplicatePrefix) {
          const friendlyRef = (duplicatePrefix === "Question Attachment" || duplicatePrefix === "Question Image" || duplicatePrefix === "Trainee Attachment")
            ? "ข้ออื่นในหัวข้อนี้"
            : duplicatePrefix;
          setError(`ไฟล์นี้ซ้ำกับไฟล์ในข้อ ${friendlyRef} กรุณาอ้างอิงถึงไฟล์ดังกล่าวแทน`);
          setIsUploading(false);
          return;
        }
      } catch (e) {
        logger.warn("Could not check file hash", e);
      }

      let relPath: string;
      if (onUploadFile) {
        relPath = await onUploadFile(selected);
      } else {
        relPath = await invoke<string>("upload_trainee_attachment", {
          sourcePath: selected,
          documentId,
          questionId,
          userId,
          friendlyPrefix: filePrefix || null,
        });
      }
      onAttachmentsChange([...attachments, relPath]);
    } catch (err) {
      const msg = typeof err === "string" ? err : (err as Error)?.message || "อัปโหลดล้มเหลว";
      setError(msg);
      logger.error("Attachment upload failed:", err);
    } finally {
      setIsUploading(false);
    }
  }, [attachments, documentId, questionId, userId, onAttachmentsChange, excludeAudio, onUploadFile, onlyImageAndPdf, filePrefix]);

  const handleDelete = useCallback(async (relPath: string) => {
    try {
      if (onDeleteFile) {
        await onDeleteFile(relPath);
      } else {
        await invoke("delete_trainee_attachment", { path: relPath });
      }
      onAttachmentsChange(attachments.filter((p) => p !== relPath));
    } catch (err) {
      logger.error("Failed to delete attachment:", err);
    }
  }, [attachments, onAttachmentsChange, onDeleteFile]);

  // PDF, Image, Video → open with Windows default app
  // Audio → has inline player, do nothing on name click
  const handleOpen = useCallback(async (relPath: string) => {
    const cat = categorize(relPath);
    if (cat === "audio") return;
    try {
      const abs = resolvedPaths[relPath] || await invoke<string>("resolve_image_path", { path: relPath });
      await invoke("open_path", { path: abs });
    } catch (err) {
      logger.error("Failed to open file:", err);
    }
  }, [resolvedPaths]);

  const renderItem = (relPath: string) => {
    const cat = categorize(relPath);
    const name = friendlyName(relPath);

    return (
      <div key={relPath} className="group flex items-center gap-2 px-2 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
        {/* Icon */}
        {cat === "image" && <Image className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
        {cat === "pdf" && <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />}
        {cat === "video" && <Play className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
        {cat === "audio" && <Headphones className="w-3.5 h-3.5 text-green-500 shrink-0" />}

        {/* Image thumbnail */}
        {cat === "image" && imageData[relPath] && (
          <img src={imageData[relPath]} alt={name} className="w-8 h-8 rounded object-cover border border-slate-300 dark:border-slate-600 cursor-pointer" onClick={() => handleOpen(relPath)} />
        )}

        {/* Audio inline player (only when audio is allowed) */}
        {!excludeAudio && cat === "audio" && resolvedPaths[relPath] && (
          <audio controls preload="metadata" className="h-6 max-w-[160px]">
            <source src={convertFileSrc(resolvedPaths[relPath])} />
          </audio>
        )}

        {/* File name — clickable for PDF/Image/Video (opens external) */}
        <span
          className={`flex-1 truncate text-slate-600 dark:text-slate-300 ${cat !== "audio" ? "cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:underline" : ""}`}
          title={name}
          onClick={cat !== "audio" ? () => handleOpen(relPath) : undefined}
        >
          {name}
        </span>

        {/* Delete */}
        {!readOnly && (
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(relPath); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600 transition-all"
            title="ลบไฟล์แนบ"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1.5">
      {/* Attachment list */}
      {attachments.length > 0 && (
        <div className="space-y-1">
          {attachments.map(renderItem)}
        </div>
      )}

      {/* Upload button */}
      {!readOnly && (
        <button
          onClick={(e) => { e.stopPropagation(); handleUpload(); }}
          disabled={isUploading || attachments.length >= MAX_ATTACHMENTS}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <><Upload className="w-3.5 h-3.5 animate-pulse" /> กำลังอัปโหลด...</>
          ) : (
            <><Paperclip className="w-3.5 h-3.5" /> 📎 แนบไฟล์ ({attachments.length}/{MAX_ATTACHMENTS})</>
          )}
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="text-[10px] text-red-500 dark:text-red-400 px-1">{error}</div>
      )}
    </div>
  );
};

export default React.memo(AttachmentPanel);
