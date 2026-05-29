import React from "react";
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  FileDigit,
  FileText,
  Globe,
  ImageIcon,
  LockIcon,
  Mic,
  Plus,
  Shield,
  Video,
} from "lucide-react";
import Button from "../../ui/Button";
import Tooltip from "../../ui/Tooltip";
import { SectionReferenceDetail } from "../../../types/content";

interface ReferenceEditorProps {
  isExpanded: boolean;
  draftSelectedRefIds: string[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  linkedRefs: any[];
  hasError: boolean;
  availableRefs: SectionReferenceDetail[];
  draftPageErrors: Record<string, string>;
  draftPageByRefId: Record<string, string>;
  onToggleExpand: (e: React.MouseEvent) => void;
  onToggleDraftRef: (refId: string) => void;
  onDraftPageChange: (refId: string, page: string) => void;
  onUpdateReferences: () => void;
}

const ReferenceEditor: React.FC<ReferenceEditorProps> = ({
  isExpanded,
  draftSelectedRefIds,
  linkedRefs,
  hasError,
  availableRefs,
  draftPageErrors,
  draftPageByRefId,
  onToggleExpand,
  onToggleDraftRef,
  onDraftPageChange,
  onUpdateReferences,
}) => {
  return (
    <>
      <label className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
        <span>เอกสารอ้างอิง (References)</span>
        <span
          className={`text-xs font-normal ${hasError ? "text-red-500" : "text-slate-500 dark:text-slate-400"}`}
        >
          (เลือกแล้ว {isExpanded ? draftSelectedRefIds.length : linkedRefs.length}/2 รายการ)
        </span>
      </label>

      {/* Collapsible References */}
      <div
        className={`rounded-md overflow-hidden space-y-2 ${hasError ? "p-2 border border-red-500 bg-red-50 dark:bg-red-900/10" : ""}`}
      >
        <div
          className={`border rounded-md transition-all duration-200 ${isExpanded
            ? "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20"
            : "border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50 dark:bg-slate-900/30"
            }`}
        >
          {/* Toggle Header */}
          <div
            className="flex items-center justify-between p-2 cursor-pointer"
            onClick={onToggleExpand}
          >
            <span
              className={`text-xs font-medium ${isExpanded ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"}`}
            >
              {isExpanded
                ? "ซ่อนตัวเลือก (Hide Options)"
                : linkedRefs.length > 0
                  ? "แก้ไขเอกสารอ้างอิง (Update References)"
                  : "+ เพิ่มเอกสารอ้างอิง (Add References)"}
            </span>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-blue-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </div>

          {/* Selector Content */}
          {isExpanded && (
            <div className="p-2 border-t border-blue-100 dark:border-blue-800/50">
              <div className="flex flex-col gap-2 animate-in slide-in-from-top-1">
                <div className="max-h-[150px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-slate-900 p-1 custom-scrollbar">
                  {availableRefs.length === 0 ? (
                    <div className="text-center py-2 text-xs text-gray-400 italic">
                      ไม่มีเอกสารเพิ่มเติม
                    </div>
                  ) : (
                    availableRefs.map((r) => {
                      const refId = r.reference.id.toString();
                      const isSelected = draftSelectedRefIds.includes(refId);
                      const pageError = draftPageErrors[refId];
                      return (
                        <div
                          key={r.reference.id}
                          onClick={() => onToggleDraftRef(refId)}
                          className={`p-2 rounded cursor-pointer transition-colors border-b border-gray-100 dark:border-slate-800/50 last:border-0 ${isSelected ? "bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700" : "hover:bg-gray-50 dark:hover:bg-slate-800 border-transparent"}`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-[10px] font-bold w-5 text-center ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-slate-500 dark:text-slate-400"}`}
                            >
                              {r.thai_letter}.
                            </span>

                            <div
                              className={`shrink-0 w-6 h-6 rounded flex items-center justify-center border cursor-default ${isSelected ? "bg-blue-600 border-blue-600 text-white" : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400"}`}
                            >
                              {isSelected ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <>
                                  {r.reference.resource_type === "WEBLINK" ? (
                                    <Globe className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : r.reference.resource_type === "VIDEO" ? (
                                    <Video className="w-3.5 h-3.5 text-purple-500" />
                                  ) : r.reference.resource_type === "IMAGE" ? (
                                    <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                                  ) : r.reference.resource_type === "AUDIO" ? (
                                    <Mic className="w-3.5 h-3.5 text-orange-500" />
                                  ) : r.reference.resource_type === "TEMPLATE" ? (
                                    <FileDigit className="w-3.5 h-3.5 text-slate-500" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                </>
                              )}
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                                <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded shrink-0">
                                  {r.reference.code}
                                </span>
                                <div className="min-w-0 flex-1 flex items-center gap-2">
                                  <Tooltip content={r.reference.title}>
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                                      {r.reference.title}
                                    </span>
                                  </Tooltip>
                                </div>
                                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Page
                                  </span>
                                  <input
                                    type="text"
                                    value={draftPageByRefId[refId] || ""}
                                    onChange={(e) => onDraftPageChange(refId, e.target.value)}
                                    disabled={!isSelected}
                                    aria-invalid={!!pageError}
                                    placeholder={isSelected ? "5 หรือ 2-56" : "เลือก Ref ก่อน"}
                                    className={`w-28 px-2 py-1 h-8 text-xs text-slate-900 dark:text-slate-100 border rounded bg-white dark:bg-slate-800 focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed dark:disabled:bg-slate-900/40 dark:disabled:text-slate-500 ${pageError ? "border-red-500 dark:border-red-400" : "border-gray-300 dark:border-gray-600"}`}
                                  />
                                </div>
                              </div>
                              {pageError && (
                                <p className="text-[11px] text-red-600 dark:text-red-400">{pageError}</p>
                              )}
                            </div>

                            <div className="shrink-0 flex items-center gap-2">
                              {r.usage_count > 0 ? (
                                <span className="px-2 py-[1px] rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                                  Used: {r.usage_count}
                                </span>
                              ) : (
                                <span className="px-2 py-[1px] rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50 opacity-80">
                                  Unused
                                </span>
                              )}

                              <Tooltip content={r.reference.classification || "Unclassified"}>
                                <div className="flex items-center">
                                  {r.reference.classification === "Confidential" ||
                                    r.reference.classification === "Secret" ? (
                                    <LockIcon className="w-3.5 h-3.5 text-red-500" />
                                  ) : r.reference.classification === "Restricted" ? (
                                    <Shield className="w-3.5 h-3.5 text-blue-500" />
                                  ) : (
                                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                  )}
                                </div>
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    เลือกได้สูงสุด 2 รายการ และแก้ไขเลขหน้าได้พร้อมกันในแต่ละแถว
                  </p>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={onUpdateReferences}
                    disabled={Object.keys(draftPageErrors).length > 0}
                    icon={<Plus className="w-3 h-3" />}
                    className="h-8 text-xs px-3"
                  >
                    Update
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ReferenceEditor;
