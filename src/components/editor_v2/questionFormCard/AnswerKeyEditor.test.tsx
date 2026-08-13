import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AnswerKeyEditor from "./AnswerKeyEditor";

vi.mock("../TiptapEditor", () => ({
  default: ({ initialContent, ariaLabel, autoFocus }: {
    initialContent: string;
    ariaLabel: string;
    autoFocus: boolean;
  }) => (
    <div role="textbox" aria-label={ariaLabel} data-auto-focus={String(autoFocus)}>
      {initialContent}
    </div>
  ),
}));

describe("AnswerKeyEditor mount-on-edit", () => {
  it("renders formatted preview and an explicit command without mounting Tiptap while inactive", () => {
    const onActivate = vi.fn();
    render(
      <AnswerKeyEditor
        value="**Persisted answer**"
        onChange={vi.fn()}
        editorId="answer-key-q-1-a"
        ariaLabel="เฉลย ข้อ 201.1 คำถามย่อย ก"
        isActive={false}
        onActivate={onActivate}
      />,
    );

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("Persisted answer")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "แก้ไข เฉลย ข้อ 201.1 คำถามย่อย ก" }));
    expect(onActivate).toHaveBeenCalledOnce();
  });

  it("mounts Tiptap only for the active row and forwards explicit focus ownership", () => {
    render(
      <AnswerKeyEditor
        value="Active draft"
        onChange={vi.fn()}
        editorId="answer-key-q-1-b"
        ariaLabel="เฉลย ข้อ 201.1 คำถามย่อย ข"
        isActive
        autoFocus
      />,
    );

    expect(screen.getByRole("textbox", { name: "เฉลย ข้อ 201.1 คำถามย่อย ข" })).toHaveAttribute(
      "data-auto-focus",
      "true",
    );
    expect(screen.queryByRole("button", { name: /แก้ไขเฉลย/ })).not.toBeInTheDocument();
  });
});
