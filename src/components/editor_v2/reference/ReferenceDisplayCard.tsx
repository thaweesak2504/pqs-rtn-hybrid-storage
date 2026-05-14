import React from 'react';
import { CheckCircle, Edit, Globe, Image as ImageIcon, Lock, Mic, Shield, Trash2, Video, FileDigit, FileText } from 'lucide-react';
import { invoke, convertFileSrc } from '@tauri-apps/api/tauri';
import { join } from '@tauri-apps/api/path';
import Tooltip from '../../ui/Tooltip';
import { ReferenceDoc, AlertVariant } from './types';
import { logger } from '../../../utils/logger';

interface ReferenceDisplayCardProps {
  data: ReferenceDoc;
  index: number;
  readOnly?: boolean;
  compact?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAlert?: (message: string, variant?: AlertVariant, title?: string) => void;
  onImageClick?: (src: string) => void;
}

const ReferenceDisplayCard: React.FC<ReferenceDisplayCardProps> = ({
  data, index, readOnly, compact, onEdit, onDelete, onAlert, onImageClick
}) => {
  // Convert index to Thai Alphabet (ก., ข., ค., ...)
  const getThaiLetter = (i: number) => {
    const thaiChars = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ', 'ฌ', 'ญ', 'ฎ', 'ฏ', 'ฐ', 'ฑ', 'ฒ', 'ณ', 'ด', 'ต', 'ถ', 'ท', 'ธ', 'น', 'บ', 'ป', 'ผ', 'ฝ', 'พ', 'ฟ', 'ภ', 'ม', 'ย', 'ร', 'ล', 'ว', 'ศ', 'ษ', 'ส', 'ห', 'ฬ', 'อ', 'ฮ'];
    if (i < thaiChars.length) return `${thaiChars[i]}.`;
    return `${i + 1}.`; // Fallback for very long lists
  };

  const handleOpenResource = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!data.file_path) return;

    // Check if it is an image or explicitly set as IMAGE resource type
    const isImage = data.resource_type === 'IMAGE' ||
      ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].some(ext => data.file_path?.toLowerCase().endsWith(ext));

    if (isImage && onImageClick) {
      // Resolve absolute path if relative
      let fullPath = data.file_path || '';
      // Check if path is relative (not http, not absolute win/nix)
      const isRelative = fullPath && !fullPath.startsWith('http') && !fullPath.match(/^[a-zA-Z]:/) && !fullPath.startsWith('/');

      if (isRelative) {
        try {
          // Get authoritative media path from Rust (e.g., .../pqs-rtn-hybrid-storage/media)
          // This avoids guessing bundle IDs or AppData paths which can vary
          const mediaPath = await invoke<string>('get_media_directory_path');

          // We need to go up one level from 'media' to get the root 'pqs-rtn-hybrid-storage'
          const rootPath = await join(mediaPath, '..');

          fullPath = await join(rootPath, data.file_path || '');
        } catch (err) {
          logger.error("Failed to resolve path:", err);
        }
      }

      // Use convertFileSrc to generate a valid src for the <img> tag in the modal
      const assetSrc = convertFileSrc(fullPath);
      onImageClick(assetSrc);
    } else {
      try {
        await invoke('open_path', { path: data.file_path });
      } catch (err) {
        logger.error("Failed to open resource:", err);
        if (onAlert) {
          onAlert("ไม่สามารถเปิดลิงก์หรือไฟล์ได้: " + err, 'warning');
        }
      }
    }
  };

  return (
    <div className="group relative flex items-center justify-between gap-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 px-3 py-2 transition-colors">

      {/* LEFT: Index | Title | Category */}
      <div className="flex items-center gap-3 flex-1 overflow-hidden">
        {/* 1. Thai Alphabet */}
        <span className="font-bold text-sm text-slate-500 dark:text-slate-400 min-w-[20px]">
          {getThaiLetter(index)}
        </span>

        {/* 2. Title */}
        <Tooltip content={data.title}>
          <span className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">
            {data.title}
          </span>
        </Tooltip>

        {/* 3. Category Badge — hidden in compact mode */}
        {!compact && data.category && (
          <span className="shrink-0 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">
            {data.category === 'MANUAL' ? 'MANUAL' :
              data.category === 'PROC' ? 'PROCEDURE' :
                data.category === 'TM' ? 'TECH MANUAL' :
                  data.category === 'SAFETY' ? 'SAFETY' :
                    data.category === 'DIAGRAM' ? 'DIAGRAM' :
                      data.category === 'OTHER' ? 'OTHER' : data.category}
          </span>
        )}

        {/* Usage Badge — hidden in compact mode */}
        {!compact && ((data.usage_count || 0) > 0 ? (
          <Tooltip content={`ถูกอ้างอิงในคำถาม ${data.usage_count} ข้อ`}>
            <span className="shrink-0 px-2 py-[1px] rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
              Used: {data.usage_count}
            </span>
          </Tooltip>
        ) : (
          <Tooltip content="ยังไม่ได้ถูกอ้างอิง">
            <span className="shrink-0 px-2 py-[1px] rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50 opacity-80">
              Unused
            </span>
          </Tooltip>
        ))}
      </div>

      {/* RIGHT: Code | Icon | File | Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* 4. Code Badge — hidden in compact mode */}
        {!compact && (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            {data.code}
          </span>
        )}

        {/* 5. Resource Icon */}
        <Tooltip content={data.file_path ? (data.resource_type === 'WEBLINK' ? `Open: ${data.file_path}` : 'Open File') : 'No file linked'}>
          <div
            className={`flex items-center transition-transform ${data.file_path ? 'cursor-pointer hover:scale-110' : 'cursor-default opacity-40'}`}
            onClick={data.file_path ? handleOpenResource : undefined}
          >
            {data.resource_type === 'WEBLINK' ? (
              <Globe className="w-4 h-4 text-emerald-500" />
            ) : data.resource_type === 'VIDEO' ? (
              <Video className="w-4 h-4 text-purple-500" />
            ) : data.resource_type === 'IMAGE' ? (
              <ImageIcon className="w-4 h-4 text-blue-500" />
            ) : data.resource_type === 'AUDIO' ? (
              <Mic className="w-4 h-4 text-orange-500" />
            ) : data.resource_type === 'TEMPLATE' ? (
              <FileDigit className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            ) : (
              <FileText className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </Tooltip>

        {/* 6. Classification Icon */}
        <Tooltip content={data.classification || 'Unclassified'}>
          <div className="flex items-center">
            {data.classification === 'Confidential' || data.classification === 'Secret' ? (
              <Lock className="w-4 h-4 text-red-500" />
            ) : data.classification === 'Restricted' ? (
              <Shield className="w-4 h-4 text-blue-500" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
          </div>
        </Tooltip>

        {/* 7. Actions */}
        {!readOnly && (
          <div className="flex gap-1 pl-2 border-l border-slate-200 dark:border-slate-700">
            <Tooltip content="แก้ไข" position="top">
              <button onClick={onEdit} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded">
                <Edit className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="ลบ" position="top">
              <button onClick={onDelete} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferenceDisplayCard;
