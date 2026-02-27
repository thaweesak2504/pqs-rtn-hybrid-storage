import { Check, Edit2, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

type SectionTheme = 'blue' | 'green' | 'orange' | 'purple';

interface PqsHeaderProps {
  section: string;
  title: string;
  subTitle?: string;
  onTitleChange?: (newTitle: string) => void;
  onSubTitleChange?: (newSubTitle: string) => void;
  readOnly?: boolean;
  prefix?: string;
  metadata?: {
    id: string;
    unit_code: string;
    updated_at?: string;
  };
  className?: string;
}

const PqsHeader: React.FC<PqsHeaderProps> = ({
  section,
  title,
  subTitle,
  onTitleChange,
  onSubTitleChange,
  readOnly = false,
  prefix = "",
  metadata,
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const [isEditingSubTitle, setIsEditingSubTitle] = useState(false);
  const [tempSubTitle, setTempSubTitle] = useState(subTitle || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const subTitleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempTitle(title);
  }, [title]);

  useEffect(() => {
    setTempSubTitle(subTitle || '');
  }, [subTitle]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditingSubTitle && subTitleInputRef.current) {
      subTitleInputRef.current.focus();
    }
  }, [isEditingSubTitle]);

  const getTheme = (sec: string): SectionTheme => {
    if (sec.startsWith('1')) return 'green';
    if (sec.startsWith('2')) return 'orange';
    if (sec.startsWith('3')) return 'purple';
    return 'blue';
  };

  const toThaiNumerals = (num: string | number): string => {
    const thaiMap = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    return num.toString().replace(/[0-9]/g, (match) => thaiMap[parseInt(match)]);
  };

  const theme = getTheme(section);

  const themeStyles = {
    blue: {
      gradient: 'from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-900',
      text: 'text-blue-50',
      badge: 'bg-blue-500/30 text-blue-100',
      hover: 'hover:bg-blue-500/20'
    },
    green: {
      gradient: 'from-green-600 to-green-700 dark:from-green-700 dark:to-green-900',
      text: 'text-green-50',
      badge: 'bg-green-500/30 text-green-100',
      hover: 'hover:bg-green-500/20'
    },
    orange: {
      gradient: 'from-orange-600 to-orange-700 dark:from-orange-700 dark:to-orange-900',
      text: 'text-orange-50',
      badge: 'bg-orange-500/30 text-orange-100',
      hover: 'hover:bg-orange-500/20'
    },
    purple: {
      gradient: 'from-purple-600 to-purple-700 dark:from-purple-700 dark:to-purple-900',
      text: 'text-purple-50',
      badge: 'bg-purple-500/30 text-purple-100',
      hover: 'hover:bg-purple-500/20'
    }
  };

  const currentStyle = themeStyles[theme];

  const handleSave = () => {
    if (tempTitle.trim()) {
      onTitleChange?.(tempTitle);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setTempTitle(title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  const handleSubTitleSave = () => {
    onSubTitleChange?.(tempSubTitle);
    setIsEditingSubTitle(false);
  };

  const handleSubTitleCancel = () => {
    setTempSubTitle(subTitle || '');
    setIsEditingSubTitle(false);
  };

  const handleSubTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubTitleSave();
    if (e.key === 'Escape') handleSubTitleCancel();
  };



  return (
    <div className={`relative overflow-hidden rounded-xl shadow-md transition-all duration-500 group select-none ${className}`}>
      {/* Slim Dynamic Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-r ${currentStyle.gradient} opacity-95`}></div>

      {/* Subtle Texture Overlay */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]"></div>

      <div className="relative z-10 px-4 py-3 flex items-center justify-between gap-4 text-white">

        {/* Left: Combined L0 Number & Title Group */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="flex flex-col min-w-0 gap-1 mt-0.5 w-full">
            {/* ID Badge Row */}
            {metadata && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold opacity-80 uppercase tracking-wider bg-black/20 px-1.5 py-0.5 rounded">
                  {metadata.unit_code || "DRAFT"} • {metadata.id}
                </span>
              </div>
            )}

            {/* Combined Title Row: [Number] [Title] */}
            <div className="group/title relative flex items-baseline gap-2">
              {/* Static L0 Number */}
              <span className="text-lg md:text-xl font-bold font-sarabun text-white drop-shadow-md leading-tight shrink-0 select-none">
                {toThaiNumerals(section)}
              </span>

              {/* Editable Title Part */}
              {isEditing ? (
                <div className="flex-1 animate-in fade-in zoom-in-95 duration-200 flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full text-lg md:text-xl font-bold font-sarabun bg-white/10 text-white border-b border-white/40 focus:border-white outline-none px-1 rounded leading-tight"
                    placeholder="Enter title..."
                  />
                  <button onClick={handleSave} className="p-1 bg-green-500 hover:bg-green-400 rounded text-white shadow-sm shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={handleCancel} className="p-1 bg-white/10 hover:bg-white/20 rounded text-white backdrop-blur-sm shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  className={`flex items-baseline gap-2 px-1 -ml-1 rounded transition-colors flex-1 min-w-0 ${!readOnly ? 'cursor-pointer hover:bg-white/5' : ''}`}
                  onClick={!readOnly ? () => setIsEditing(true) : undefined}
                >
                  <h1 className="text-lg md:text-xl font-bold font-sarabun tracking-tight leading-tight truncate text-white drop-shadow-md">
                    {prefix}{title || "Untitled Document"}
                  </h1>
                  {!readOnly && <Edit2 className="w-3.5 h-3.5 opacity-0 group-hover/title:opacity-70 transition-opacity text-white/80 shrink-0 self-center" />}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Subtitle & Status */}
        <div className="flex flex-col items-end gap-1 shrink-0">

          {/* SubTitle: English Menu Name — editable inline */}
          {(subTitle !== undefined || onSubTitleChange) && (
            <div className="group/subtitle">
              {isEditingSubTitle && !readOnly ? (
                <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150">
                  <input
                    ref={subTitleInputRef}
                    type="text"
                    value={tempSubTitle}
                    onChange={(e) => setTempSubTitle(e.target.value)}
                    onKeyDown={handleSubTitleKeyDown}
                    maxLength={40}
                    className="text-xs bg-white/10 text-white border-b border-white/40 focus:border-white outline-none px-1 rounded w-32"
                    placeholder="English Menu Name"
                  />
                  <button onClick={handleSubTitleSave} className="p-0.5 bg-green-500 hover:bg-green-400 rounded text-white shadow-sm">
                    <Check className="w-3 h-3" />
                  </button>
                  <button onClick={handleSubTitleCancel} className="p-0.5 bg-white/10 hover:bg-white/20 rounded text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div
                  className={`flex items-center gap-1 px-1 -mr-1 rounded transition-colors ${!readOnly && onSubTitleChange ? 'cursor-pointer hover:bg-white/10' : ''}`}
                  onClick={!readOnly && onSubTitleChange ? () => setIsEditingSubTitle(true) : undefined}
                  title={!readOnly && onSubTitleChange ? 'คลิกเพื่อแก้ไข English Menu Name' : undefined}
                >
                  <span className="text-xs md:text-sm font-light text-white/90 border-l border-white/20 pl-3">
                    {subTitle || (onSubTitleChange ? <span className="italic text-white/40">คลิกเพื่อใส่ชื่อเมนู</span> : null)}
                  </span>
                  {!readOnly && onSubTitleChange && <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover/subtitle:opacity-60 transition-opacity text-white/70 shrink-0" />}
                </div>
              )}
            </div>
          )}

          {metadata?.updated_at && (
            <span className="text-[10px] text-white/60 font-mono">
              Updated: {new Date(metadata.updated_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

      </div>
    </div>
  );
};

export default PqsHeader;
