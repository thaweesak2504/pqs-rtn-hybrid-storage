import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/tauri";
import PqsQuestionSection from "../../components/editor_v2/PqsQuestionSection";
import type { QuestionDetail } from "../../types/content";

vi.mock("@tauri-apps/api/tauri", () => ({
  invoke: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../components/editor_v2/QuestionTreeNode", () => ({
  default: ({
    question,
    editingId,
    questionActionId,
    onStartEdit,
    onCancel,
    onDelete,
    onAlert,
  }: {
    question: QuestionDetail;
    editingId: string | null;
    questionActionId?: string;
    onStartEdit: (id: string) => void;
    onCancel: () => void;
    onDelete: (question: QuestionDetail) => void;
    onAlert?: (
      message: string,
      type?: "warning" | "danger",
      onDismiss?: () => void,
      actionLabel?: string,
    ) => void;
  }) => editingId === question.id ? (
    <>
      <button type="button" onClick={onCancel}>ยกเลิกฟอร์ม</button>
      <button
        type="button"
        onClick={() => onAlert?.(
          "กรุณาตรวจสอบข้อมูลต่อไปนี้:\n- เฉลย (Answer Key)",
          "warning",
          () => document.getElementById("mock-invalid-answer")?.focus(),
          "ไปที่เฉลย ข.",
        )}
      >
        จำลอง Validation
      </button>
      <input id="mock-invalid-answer" aria-label="เฉลยที่ต้องแก้ไข" />
    </>
  ) : (
    <>
      <button
        id={questionActionId}
        type="button"
        onClick={() => onStartEdit(question.id)}
      >
        เมนูคำสั่ง ข้อ 101.1
      </button>
      <button type="button" onClick={() => onDelete(question)}>ลบ ข้อ 101.1</button>
    </>
  ),
}));

const question: QuestionDetail = {
  id: "q-101-1",
  document_id: "DOC-1",
  section_id: 101,
  parent_id: null,
  sequence: 1,
  content: "Question 101.1",
  is_header: false,
  description: null,
  answer_type: "text",
  metadata: null,
  score: null,
  question_type: "normal",
  group_score: null,
  display_text: null,
  is_group_header: false,
  is_scored: false,
  choices: [],
  references: [],
  children: [],
};

describe("PqsQuestionSection Creator focus lifecycle", () => {
  it("restores focus to the remounted Question action command after cancel", async () => {
    render(
      <PqsQuestionSection
        docId="DOC-1"
        sectionId={101}
        sectionNumber={101}
        sectionGroup={100}
        initialQuestions={[question]}
        viewMode="edit"
      />,
    );

    const actionButton = await screen.findByRole("button", { name: "เมนูคำสั่ง ข้อ 101.1" });
    fireEvent.click(actionButton);
    fireEvent.click(screen.getByRole("button", { name: "ยกเลิกฟอร์ม" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "เมนูคำสั่ง ข้อ 101.1" })).toHaveFocus();
    });
  });

  it("returns focus to the Question action command when Delete is cancelled", async () => {
    render(
      <PqsQuestionSection
        docId="DOC-1"
        sectionId={101}
        sectionNumber={101}
        sectionGroup={100}
        initialQuestions={[question]}
        viewMode="edit"
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "ลบ ข้อ 101.1" }));
    fireEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "เมนูคำสั่ง ข้อ 101.1" })).toHaveFocus();
    });
  });

  it("focuses the empty-section command after the final Question is deleted", async () => {
    vi.mocked(invoke).mockResolvedValue([]);

    render(
      <PqsQuestionSection
        docId="DOC-1"
        sectionId={101}
        sectionNumber={101}
        sectionGroup={100}
        initialQuestions={[question]}
        viewMode="edit"
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "ลบ ข้อ 101.1" }));
    fireEvent.click(screen.getByRole("button", { name: "ลบคำถาม" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "เพิ่มคำถามแรก Section 101" })).toHaveFocus();
    });
  });

  it("presents save validation as one clear return-to-edit action", async () => {
    render(
      <PqsQuestionSection
        docId="DOC-1"
        sectionId={101}
        sectionNumber={101}
        sectionGroup={100}
        initialQuestions={[question]}
        viewMode="edit"
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "เมนูคำสั่ง ข้อ 101.1" }));
    fireEvent.click(screen.getByRole("button", { name: "จำลอง Validation" }));

    expect(screen.getByRole("dialog", { name: "ยังบันทึกไม่ได้" })).toHaveTextContent(
      "กรุณาแก้ไขข้อมูลต่อไปนี้ก่อนบันทึก",
    );
    expect(screen.queryByRole("button", { name: "ยกเลิก" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ยืนยัน" })).not.toBeInTheDocument();
    const correctionButton = screen.getByRole("button", { name: "ไปที่เฉลย ข." });
    expect(correctionButton).toHaveFocus();
    expect(correctionButton).toHaveClass("bg-amber-500", "text-slate-950");

    fireEvent.click(correctionButton);
    expect(screen.queryByRole("dialog", { name: "ยังบันทึกไม่ได้" })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("textbox", { name: "เฉลยที่ต้องแก้ไข" })).toHaveFocus());
  });
});
