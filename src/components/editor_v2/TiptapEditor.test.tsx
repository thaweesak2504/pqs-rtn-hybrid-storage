import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TiptapEditor from "./TiptapEditor";

const tiptapMocks = vi.hoisted(() => {
  const editors = new Map<string, ReturnType<typeof createEditorMock>>();

  function createEditorMock(from: number, to: number) {
    const dom = document.createElement("div");
    const textNode = document.createTextNode("Test answer-key selection");
    dom.appendChild(textNode);
    const chain = {
      focus: vi.fn(),
      setTextSelection: vi.fn(),
      setColor: vi.fn(),
      unsetColor: vi.fn(),
      run: vi.fn(() => true),
    };
    chain.focus.mockReturnValue(chain);
    chain.setTextSelection.mockReturnValue(chain);
    chain.setColor.mockReturnValue(chain);
    chain.unsetColor.mockReturnValue(chain);

    return {
      state: {
        selection: { from, to },
        doc: { content: { size: 100 } },
      },
      view: {
        dom,
        posAtDOM: vi.fn((_node: Node, offset: number) => offset),
      },
      chain: vi.fn(() => chain),
      commands: { focus: vi.fn() },
      isActive: vi.fn(() => false),
      destroy: vi.fn(),
      chainCommands: chain,
      textNode,
    };
  }

  return { editors, createEditorMock };
});

vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn((options: { content: string }) => tiptapMocks.editors.get(options.content)),
  EditorContent: ({ editor }: { editor: unknown }) => (
    <div data-testid="editor-content" data-has-editor={String(Boolean(editor))} />
  ),
}));

describe("TiptapEditor toolbar selection ownership", () => {
  beforeEach(() => {
    tiptapMocks.editors.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("applies a color to the selected range in the editor whose palette was used", () => {
    const sourceEditor = tiptapMocks.createEditorMock(10, 18);
    // ProseMirror still reports the previous whole-line selection, while the
    // browser already shows the newly dragged substring after paste.
    const targetEditor = tiptapMocks.createEditorMock(1, 30);
    tiptapMocks.editors.set("source answer", sourceEditor);
    tiptapMocks.editors.set("pasted target answer", targetEditor);
    vi.spyOn(window, "getSelection").mockReturnValue({
      anchorNode: targetEditor.textNode,
      focusNode: targetEditor.textNode,
      anchorOffset: 4,
      focusOffset: 13,
    } as unknown as Selection);

    render(
      <>
        <TiptapEditor initialContent="source answer" onChange={vi.fn()} autoFocus={false} />
        <TiptapEditor initialContent="pasted target answer" onChange={vi.fn()} autoFocus={false} />
      </>,
    );

    const palettes = screen.getAllByRole("button", { name: "เลือกสีข้อความ" });
    expect(palettes).toHaveLength(2);
    const targetPalette = palettes[1]!;
    fireEvent.mouseDown(targetPalette);
    fireEvent.click(targetPalette);
    fireEvent.mouseDown(screen.getByRole("button", { name: "สีเหลืองส้ม (Warning)" }));
    fireEvent.click(screen.getByRole("button", { name: "สีเหลืองส้ม (Warning)" }));

    expect(targetEditor.chainCommands.setTextSelection).toHaveBeenCalledWith({ from: 4, to: 13 });
    expect(targetEditor.chainCommands.setColor).toHaveBeenCalledWith("var(--color-warning)");
    expect(targetEditor.chainCommands.run).toHaveBeenCalledOnce();
    expect(sourceEditor.chain).not.toHaveBeenCalled();
  });
});
