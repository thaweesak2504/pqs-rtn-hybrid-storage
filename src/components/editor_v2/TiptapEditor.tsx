import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { OrderedList } from "@tiptap/extension-list";
import { Markdown } from "tiptap-markdown";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Bold, Italic, ListOrdered, List, Eraser, Table as TableIcon, Trash, GripHorizontal, GripVertical, Palette, ChevronDown, Plus, Minus } from "lucide-react";
import Tooltip from "../ui/Tooltip";

// ============ Types ============

const NUMBERED_HIERARCHY_STYLE = "numbered-hierarchy";
const NUMBERED_HIERARCHY_MARKER_CLASS = "pqs-numbered-hierarchy-marker";

interface MarkdownListSerializerState {
  write: (content: string) => void;
  repeat: (content: string, count: number) => string;
  renderList: (
    node: ProseMirrorNode,
    space: string,
    renderMarker: (index: number) => string,
  ) => void;
}

interface TiptapEditorProps {
  /** Initial content as Markdown string */
  initialContent: string;
  /** Called whenever content changes — provides Markdown string */
  onChange: (markdown: string) => void;
  /** Placeholder text when editor is empty */
  placeholder?: string;
  /** Color variant for the toolbar/border */
  variant?: "default" | "emerald";
  /** Minimum height of the editor area */
  minHeight?: string;
  /** Auto-focus when mounted */
  autoFocus?: boolean;
}

const TOOLBAR_BTN_BASE = "h-6 px-2 flex items-center justify-center text-xs rounded border transition-colors";
const TOOLBAR_BTN_VARIANTS = {
  default: {
    normal: "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
    active: "border-blue-400 dark:border-blue-600 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  },
  emerald: {
    normal: "border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/30",
    active: "border-emerald-500 dark:border-emerald-500 bg-emerald-200 dark:bg-emerald-800/50 text-emerald-900 dark:text-emerald-100",
  },
};

const findIndexOfAdjacentNode = (
  node: ProseMirrorNode,
  parent: ProseMirrorNode | null | undefined,
  index: number,
) => {
  if (!parent) return 0;

  let i = 0;
  for (; index - i > 0; i++) {
    if (parent.child(index - i - 1).type.name !== node.type.name) {
      break;
    }
  }
  return i;
};

const StyledOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyle: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-list-style") === NUMBERED_HIERARCHY_STYLE ||
          element.classList.contains("numbered-hierarchy-list")
            ? NUMBERED_HIERARCHY_STYLE
            : null,
        renderHTML: (attributes: { listStyle?: string | null }) =>
          attributes.listStyle === NUMBERED_HIERARCHY_STYLE
            ? {
                "data-list-style": NUMBERED_HIERARCHY_STYLE,
                class: "numbered-hierarchy-list",
              }
            : {},
      },
    };
  },
  addStorage() {
    return {
      markdown: {
        serialize(
          state: MarkdownListSerializerState,
          node: ProseMirrorNode,
          parent: ProseMirrorNode | null | undefined,
          index: number,
        ) {
          if (
            node.attrs.listStyle === NUMBERED_HIERARCHY_STYLE &&
            parent?.type?.name !== "listItem"
          ) {
            state.write(`<div class="${NUMBERED_HIERARCHY_MARKER_CLASS}"></div>\n\n`);
          }

          const start = node.attrs.start || 1;
          const maxW = String(start + node.childCount - 1).length;
          const space = state.repeat(" ", maxW + 2);
          const adjacentIndex = findIndexOfAdjacentNode(node, parent, index);
          const separator = adjacentIndex % 2 ? ") " : ". ";

          state.renderList(node, space, (i: number) => {
            const nStr = String(start + i);
            return state.repeat(" ", maxW - nStr.length) + nStr + separator;
          });
        },
        parse: {
          updateDOM(element: HTMLElement) {
            element
              .querySelectorAll(`.${NUMBERED_HIERARCHY_MARKER_CLASS}`)
              .forEach((marker) => {
                const next = marker.nextElementSibling;
                if (next?.tagName.toLowerCase() === "ol") {
                  next.setAttribute("data-list-style", NUMBERED_HIERARCHY_STYLE);
                  next.classList.add("numbered-hierarchy-list");
                }
                marker.remove();
              });
          },
        },
      },
    };
  },
});

// ============ Toolbar Button ============

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
  variant: "default" | "emerald";
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  onClick,
  isActive = false,
  title,
  children,
  variant,
}) => {
  const v = TOOLBAR_BTN_VARIANTS[variant];
  return (
    <Tooltip content={title} position="top">
      <button
        type="button"
        aria-label={title}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }}
        className={`${TOOLBAR_BTN_BASE} ${isActive ? v.active : v.normal}`}
      >
        {children}
      </button>
    </Tooltip>
  );
};

// ============ Dropdown Menu ============

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  variant: "default" | "emerald";
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ trigger, children, variant }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const v = TOOLBAR_BTN_VARIANTS[variant];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
        className={`${TOOLBAR_BTN_BASE} gap-0.5 ${open ? v.active : v.normal}`}
      >
        {trigger}
        <ChevronDown className={`w-2.5 h-2.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-[160px] rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1">
          {children}
        </div>
      )}
    </div>
  );
};

// ============ Dropdown Item ============

interface DropdownItemProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}

const DropdownItem: React.FC<DropdownItemProps> = ({ onClick, icon, label, danger }) => (
  <button
    type="button"
    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors
      ${danger
        ? "text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
      }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

// ============ Toolbar ============

const setOrderedListStyle = (
  editor: NonNullable<ReturnType<typeof useEditor>>,
  listStyle: string | null,
) => {
  if (editor.isActive("orderedList", { listStyle })) {
    editor.chain().focus().liftListItem("listItem").run();
    return;
  }

  if (editor.isActive("orderedList")) {
    editor.chain().focus().updateAttributes("orderedList", { listStyle }).run();
    return;
  }

  editor.chain().focus().toggleList("orderedList", "listItem", false, { listStyle }).run();
};

interface EditorToolbarProps {
  editor: ReturnType<typeof useEditor>;
  variant: "default" | "emerald";
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor, variant }) => {
  if (!editor) return null;

  const toolbarBg =
    variant === "emerald"
      ? "bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-900/30"
      : "bg-slate-50 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-700";

  return (
    <div className={`flex flex-wrap items-center gap-1 px-2 py-1 ${toolbarBg}`}>
      {/* 1. Basic Formatting (most used) */}
      <ToolbarButton
        variant={variant}
        title="ตัวหนา (Bold)"
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
      >
        <Bold className="w-3.5 h-3.5" />
      </ToolbarButton>

      <ToolbarButton
        variant={variant}
        title="ตัวเอียง (Italic)"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
      >
        <Italic className="w-3.5 h-3.5" />
      </ToolbarButton>

      <ToolbarButton
        variant={variant}
        title="ลิสต์หลัก (ก.ข.ค.), กด Tab เพิ่มลิสต์รอง (1.2.3.), กด Shift + Tab เพื่อย้อนกลับ"
        onClick={() => setOrderedListStyle(editor, null)}
        isActive={editor.isActive("orderedList", { listStyle: null })}
      >
        <ListOrdered className="w-3.5 h-3.5" />
      </ToolbarButton>

      <ToolbarButton
        variant={variant}
        title="ลิสต์เลขลำดับชั้น (1., 1.1, 1.2), กด Tab เพิ่มระดับย่อย"
        onClick={() => setOrderedListStyle(editor, NUMBERED_HIERARCHY_STYLE)}
        isActive={editor.isActive("orderedList", { listStyle: NUMBERED_HIERARCHY_STYLE })}
      >
        <ListOrdered className="w-3.5 h-3.5" />
        <span className="ml-1 text-[10px] font-semibold leading-none">1.1</span>
      </ToolbarButton>

      <ToolbarButton
        variant={variant}
        title="ลิสต์จุด (- )"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
      >
        <List className="w-3.5 h-3.5" />
      </ToolbarButton>

      {/* 2. Text Color Dropdown */}
      <DropdownMenu
        variant={variant}
        trigger={<Palette className="w-3.5 h-3.5" />}
      >
        <DropdownItem
          onClick={() => editor.chain().focus().setColor('var(--color-warning)').run()}
          icon={<div className="w-3 h-3 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0" />}
          label="สีเหลืองส้ม (Warning)"
        />
        <DropdownItem
          onClick={() => editor.chain().focus().setColor('var(--color-danger)').run()}
          icon={<div className="w-3 h-3 rounded-full bg-red-500 dark:bg-red-400 shrink-0" />}
          label="สีแดงสว่าง (Danger)"
        />
        <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
        <DropdownItem
          onClick={() => editor.chain().focus().unsetColor().run()}
          icon={<Eraser className="w-3 h-3 shrink-0" />}
          label="ล้างสี (Clear)"
        />
      </DropdownMenu>

      <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1" />

      {/* 3. Table Dropdown */}
      <DropdownMenu
        variant={variant}
        trigger={<TableIcon className="w-3.5 h-3.5" />}
      >
        <DropdownItem
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          icon={<Plus className="w-3 h-3 shrink-0" />}
          label="แทรกตาราง (3×3)"
        />
        <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
        <DropdownItem
          onClick={() => editor.chain().focus().addRowAfter().run()}
          icon={<GripHorizontal className="w-3 h-3 shrink-0" />}
          label="เพิ่มแถว (Row)"
        />
        <DropdownItem
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          icon={<GripVertical className="w-3 h-3 shrink-0" />}
          label="เพิ่มคอลัมน์ (Column)"
        />
        <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
        <DropdownItem
          onClick={() => editor.chain().focus().deleteRow().run()}
          icon={<Minus className="w-3 h-3 shrink-0" />}
          label="ลบแถว (Row)"
          danger
        />
        <DropdownItem
          onClick={() => editor.chain().focus().deleteColumn().run()}
          icon={<Minus className="w-3 h-3 shrink-0" />}
          label="ลบคอลัมน์ (Column)"
          danger
        />
        <DropdownItem
          onClick={() => editor.chain().focus().deleteTable().run()}
          icon={<Trash className="w-3 h-3 shrink-0" />}
          label="ลบตาราง (Table)"
          danger
        />
      </DropdownMenu>
    </div>
  );
};

// ============ Main Component ============

const TiptapEditor: React.FC<TiptapEditorProps> = ({
  initialContent,
  onChange,
  placeholder = "พิมพ์ข้อความที่นี่...",
  variant = "default",
  minHeight = "120px",
  autoFocus = true,
}) => {
  const [, setSelectionUpdate] = React.useState(0);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        orderedList: false,
      }),
      StyledOrderedList,
      TextStyle,
      Color,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Markdown.configure({
        html: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none dark:prose-invert focus:outline-none px-3 py-2 font-['Kanit',sans-serif] text-sm leading-relaxed`,
        style: `min-height: ${minHeight}`,
        "data-placeholder": placeholder,
        role: "textbox",
        "aria-label": placeholder,
      },
    },
    onUpdate: ({ editor: ed }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const md = (ed.storage as any).markdown?.getMarkdown?.() ?? ed.getHTML();
      onChange(md);
    },
    onSelectionUpdate: () => {
      // Force re-render to update toolbar button active states
      setSelectionUpdate((prev) => prev + 1);
    },
    onTransaction: () => {
      setSelectionUpdate((prev) => prev + 1);
    }
  });

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && editor) {
      const timer = setTimeout(() => {
        editor.commands.focus("end");
      }, 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [editor, autoFocus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  const borderClass =
    variant === "emerald"
      ? "border-emerald-200 dark:border-emerald-800/50"
      : "border-slate-200 dark:border-slate-700";

  const bgClass =
    variant === "emerald"
      ? "bg-emerald-50/50 dark:bg-emerald-900/20"
      : "bg-transparent";

  return (
    <div
      className={`rounded-md overflow-hidden border ${borderClass}`}
      onClick={(e) => e.stopPropagation()}
    >
      <EditorToolbar editor={editor} variant={variant} />
      <div className={bgClass}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default TiptapEditor;
