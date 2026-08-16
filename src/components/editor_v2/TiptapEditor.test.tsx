import { fireEvent, render, screen } from "@testing-library/react";
import { useEditor } from "@tiptap/react";
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
      commands: { focus: vi.fn(), setContent: vi.fn() },
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

  it("applies color to the newly mounted editor after the active Answer Key switches", () => {
    const firstEditor = tiptapMocks.createEditorMock(2, 7);
    const secondEditor = tiptapMocks.createEditorMock(1, 20);
    tiptapMocks.editors.set("first answer", firstEditor);
    tiptapMocks.editors.set("second answer", secondEditor);
    vi.spyOn(window, "getSelection").mockReturnValue({
      anchorNode: secondEditor.textNode,
      focusNode: secondEditor.textNode,
      anchorOffset: 5,
      focusOffset: 11,
    } as unknown as Selection);

    const { rerender } = render(
      <TiptapEditor
        key="first"
        initialContent="first answer"
        onChange={vi.fn()}
        autoFocus={false}
        editorId="answer-key-first"
        ariaLabel="เฉลย คำถามย่อย ก"
      />,
    );

    rerender(
      <TiptapEditor
        key="second"
        initialContent="second answer"
        onChange={vi.fn()}
        autoFocus
        editorId="answer-key-second"
        ariaLabel="เฉลย คำถามย่อย ข"
      />,
    );

    expect(screen.getAllByRole("button", { name: "เลือกสีข้อความ" })).toHaveLength(1);
    const palette = screen.getByRole("button", { name: "เลือกสีข้อความ" });
    fireEvent.mouseDown(palette);
    fireEvent.click(palette);
    const warningColor = screen.getByRole("button", { name: "สีเหลืองส้ม (Warning)" });
    fireEvent.mouseDown(warningColor);
    fireEvent.click(warningColor);

    expect(secondEditor.chainCommands.setTextSelection).toHaveBeenCalledWith({ from: 5, to: 11 });
    expect(secondEditor.chainCommands.setColor).toHaveBeenCalledWith("var(--color-warning)");
    expect(secondEditor.chainCommands.run).toHaveBeenCalledOnce();
    expect(firstEditor.chain).not.toHaveBeenCalled();
  });

  it("exposes the caller's stable textbox id and contextual accessible name", () => {
    const editor = tiptapMocks.createEditorMock(0, 0);
    tiptapMocks.editors.set("answer key", editor);

    render(
      <TiptapEditor
        initialContent="answer key"
        onChange={vi.fn()}
        autoFocus={false}
        editorId="answer-key-q-101-main"
        ariaLabel="เฉลย ข้อ 101.1"
      />,
    );

    const options = vi.mocked(useEditor).mock.calls.at(-1)?.[0];
    expect(options?.editorProps?.attributes).toMatchObject({
      id: "answer-key-q-101-main",
      role: "textbox",
      "aria-label": "เฉลย ข้อ 101.1",
    });
  });

  it("normalizes rich clipboard HTML before ProseMirror parses it", () => {
    const editor = tiptapMocks.createEditorMock(0, 0);
    tiptapMocks.editors.set("answer key", editor);

    render(
      <TiptapEditor
        initialContent="answer key"
        onChange={vi.fn()}
        autoFocus={false}
      />,
    );

    const options = vi.mocked(useEditor).mock.calls.at(-1)?.[0];
    const transformPastedHTML = options?.editorProps?.transformPastedHTML as
      | ((html: string) => string)
      | undefined;
    expect(
      transformPastedHTML?.(
        '<p><span style="color:rgb(226,232,240)"><strong>คำถามที่คัดลอก</strong></span></p>',
      ),
    ).toBe("<p>คำถามที่คัดลอก</p>");
  });

  it("applies a newer authoritative snapshot only when the caller declares the draft clean", () => {
    const editor = tiptapMocks.createEditorMock(0, 0);
    tiptapMocks.editors.set("draft", editor);
    const { rerender } = render(
      <TiptapEditor
        initialContent="draft"
        onChange={vi.fn()}
        autoFocus={false}
        externalContent="draft"
        externalContentVersion="revision-1"
        canSyncExternalContent
      />,
    );

    rerender(
      <TiptapEditor
        initialContent="draft"
        onChange={vi.fn()}
        autoFocus={false}
        externalContent="authoritative refresh"
        externalContentVersion="revision-2"
        canSyncExternalContent
      />,
    );
    expect(editor.commands.setContent).toHaveBeenCalledWith("authoritative refresh", { emitUpdate: false });

    rerender(
      <TiptapEditor
        initialContent="draft"
        onChange={vi.fn()}
        autoFocus={false}
        externalContent="must keep local draft"
        externalContentVersion="revision-3"
        canSyncExternalContent={false}
      />,
    );
    expect(editor.commands.setContent).toHaveBeenCalledTimes(1);
  });
});
