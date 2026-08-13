import { invoke } from "@tauri-apps/api/tauri";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QuestionFormCard from "../../components/editor_v2/QuestionFormCard";
import { SectionReferenceDetail } from "../../types/content";
import { CreatorFormWorkflow } from "../../hooks/useCreatorFormWorkflow";

vi.mock("../../components/editor_v2/questionFormCard/AnswerKeyEditor", () => ({
  default: ({
    value,
    onChange,
    editorId,
    ariaLabel,
    isActive = true,
    onActivate,
  }: {
    value: string;
    onChange: (value: string) => void;
    editorId?: string;
    ariaLabel?: string;
    isActive?: boolean;
    onActivate?: () => void;
  }) => isActive ? (
      <textarea
        id={editorId}
        aria-label="answer-key-editor"
        data-context-label={ariaLabel}
        data-editor-id={editorId}
        value={value}
        onInput={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          onChange(e.target.value);
        }}
      />
    ) : (
      <div data-testid={`answer-key-preview-${editorId}`}>
        <span>{value || "ยังไม่มีคำเฉลย"}</span>
        <button type="button" aria-label={`แก้ไข ${ariaLabel}`} onClick={onActivate}>
          แก้ไขเฉลย
        </button>
      </div>
    ),
}));

vi.mock("../../components/editor_v2/AsyncImagePreview", () => ({
  default: () => <div data-testid="async-image-preview" />,
}));

const refsFixture: SectionReferenceDetail[] = [
  {
    id: 1,
    section_id: 201,
    display_order: 1,
    thai_letter: "ก",
    usage_count: 1,
    reference: {
      id: 11,
      code: "REF-11",
      title: "Reference One",
      category: null,
      classification: null,
      resource_type: "DOCUMENT",
      file_path: null,
    },
  },
  {
    id: 2,
    section_id: 201,
    display_order: 2,
    thai_letter: "ข",
    usage_count: 0,
    reference: {
      id: 12,
      code: "REF-12",
      title: "Reference Two",
      category: null,
      classification: null,
      resource_type: "DOCUMENT",
      file_path: null,
    },
  },
  {
    id: 3,
    section_id: 201,
    display_order: 3,
    thai_letter: "ค",
    usage_count: 0,
    reference: {
      id: 13,
      code: "REF-13",
      title: "Reference Three",
      category: null,
      classification: null,
      resource_type: "DOCUMENT",
      file_path: null,
    },
  },
];

const buildProps = (overrides: Partial<React.ComponentProps<typeof QuestionFormCard>> = {}) => ({
  prefix: "๒๐๑.๑",
  level: 1,
  sectionGroup: 200 as const,
  initialContent: "",
  initialDescription: "",
  initialImage: "",
  initialMetadata: null,
  initialReferences: [],
  onSave: vi.fn(),
  onCancel: vi.fn(),
  onAlert: vi.fn(),
  documentId: "DOC-1",
  sectionId: 201,
  ...overrides,
});

describe("QuestionFormCard integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    CreatorFormWorkflow.reset();
    vi.mocked(invoke).mockReset();
    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if (command === "get_section_references") return refsFixture;
      if (command === "get_occupation_branches") return [];
      if (command === "get_occupation_sub_branches") return [];
      if (command === "get_occupation_sub_questions") return [];
      if (command === "get_all_sub_questions_for_branch") return [];
      if (command === "replace_question_answer_keys") return null;
      if (command === "update_question") return null;
      if (command === "update_question_score") return null;
      if (command === "get_question_answer_keys") return [];
      return null;
    });
  });

  it("switches directly when another Creator form is requested from a clean draft", async () => {
    const onCancel = vi.fn();
    const openNext = vi.fn();
    render(
      <QuestionFormCard
        {...buildProps({
          initialContent: "Persisted question",
          onCancel,
          workflowId: "creator-edit-DOC-1-Q-1",
        })}
      />,
    );

    act(() => {
      CreatorFormWorkflow.requestOpen("creator-edit-DOC-1-Q-2", openNext);
    });

    await waitFor(() => {
      expect(onCancel).toHaveBeenCalledOnce();
      expect(openNext).toHaveBeenCalledOnce();
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("recognizes Ctrl+S by physical key code while a non-Latin keyboard layout is active", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <QuestionFormCard
        {...buildProps({
          initialContent: "Persisted question",
          onSave,
        })}
      />,
    );

    fireEvent.click(screen.getByLabelText(/เอกสารอ้างอิง \(Reference\)/));
    fireEvent.click(screen.getByLabelText(/คำเฉลย \(Answer Key\)/));
    fireEvent.keyDown(screen.getByPlaceholderText("พิมพ์คำถาม..."), {
      key: "ห",
      code: "KeyS",
      ctrlKey: true,
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledOnce();
    });
  });

  it("makes the Save command communicate clean and dirty Question states", () => {
    render(
      <QuestionFormCard
        {...buildProps({
          initialContent: "Persisted question",
          existingId: "Q-SAVE-STATE",
          workflowId: "creator-edit-DOC-1-Q-SAVE-STATE",
        })}
      />,
    );

    expect(screen.getByRole("button", { name: "บันทึก" })).toHaveAttribute("data-state", "clean");

    fireEvent.change(screen.getByPlaceholderText("พิมพ์คำถาม..."), {
      target: { value: "Changed question" },
    });

    const dirtySave = screen.getByRole("button", { name: "บันทึกการแก้ไข" });
    expect(dirtySave).toHaveAttribute("data-state", "dirty");
    expect(dirtySave).toHaveAttribute("aria-describedby", "question-form-dirty-Q-SAVE-STATE");
    expect(screen.getByRole("status")).toHaveTextContent("ยังไม่ได้บันทึก");
  });

  it("keeps a dirty Creator draft open and shows one decision modal", async () => {
    const onCancel = vi.fn();
    const openNext = vi.fn();
    render(
      <QuestionFormCard
        {...buildProps({
          initialContent: "Persisted question",
          onCancel,
          workflowId: "creator-edit-DOC-1-Q-1",
        })}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("พิมพ์คำถาม..."), {
      target: { value: "Unsaved question" },
    });
    act(() => {
      CreatorFormWorkflow.requestOpen("creator-edit-DOC-1-Q-2", openNext);
    });

    expect(screen.getByRole("dialog", { name: "การแก้ไขยังไม่ได้บันทึก" })).toBeInTheDocument();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(onCancel).not.toHaveBeenCalled();
    expect(openNext).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "แก้ไขต่อ" }));
    expect(screen.getByDisplayValue("Unsaved question")).toBeInTheDocument();
    expect(openNext).not.toHaveBeenCalled();

    act(() => {
      CreatorFormWorkflow.requestOpen("creator-edit-DOC-1-Q-2", openNext);
    });
    fireEvent.click(screen.getByRole("button", { name: "ละทิ้งการแก้ไข" }));

    await waitFor(() => {
      expect(onCancel).toHaveBeenCalledOnce();
      expect(openNext).toHaveBeenCalledOnce();
    });
  });

  it("identifies Description as its own unsaved draft area", async () => {
    const openNext = vi.fn();
    render(
      <QuestionFormCard
        {...buildProps({
          initialContent: "Persisted question",
          initialDescription: "Persisted description",
          workflowId: "creator-edit-DOC-1-Q-DESCRIPTION",
        })}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("คำอธิบายเพิ่มเติม (Description)..."), {
      target: { value: "Changed description" },
    });
    act(() => {
      CreatorFormWorkflow.requestOpen("creator-edit-DOC-1-Q-NEXT", openNext);
    });

    const dialog = screen.getByRole("dialog", { name: "การแก้ไขยังไม่ได้บันทึก" });
    expect(dialog).toHaveTextContent("คำอธิบาย (Description)");
    expect(dialog).not.toHaveTextContent("รายละเอียดประกอบ");
    expect(openNext).not.toHaveBeenCalled();
  });

  it("keeps persisted attachment files intact when an attachment draft is discarded", async () => {
    const onCancel = vi.fn();
    const openNext = vi.fn();
    render(
      <QuestionFormCard
        {...buildProps({
          existingId: "Q-ATTACHMENT-DISCARD",
          initialContent: "Persisted question",
          initialMetadata: JSON.stringify({ attachments: ["questions/persisted.pdf"] }),
          onCancel,
          workflowId: "creator-edit-DOC-1-Q-ATTACHMENT-DISCARD",
        })}
      />,
    );

    fireEvent.click(screen.getByTitle("ลบไฟล์แนบ"));
    await screen.findByRole("button", { name: "📎 แนบไฟล์ (0/3)" });
    act(() => {
      CreatorFormWorkflow.requestOpen("creator-edit-DOC-1-Q-NEXT", openNext);
    });

    const dialog = screen.getByRole("dialog", { name: "การแก้ไขยังไม่ได้บันทึก" });
    expect(dialog).toHaveTextContent("ไฟล์แนบ (Attachments)");
    fireEvent.click(within(dialog).getByRole("button", { name: "ละทิ้งการแก้ไข" }));

    await waitFor(() => {
      expect(onCancel).toHaveBeenCalledOnce();
      expect(openNext).toHaveBeenCalledOnce();
    });
    expect(invoke).not.toHaveBeenCalledWith("delete_question_image", expect.anything());
  });

  it("deletes a removed persisted attachment only after the Question save succeeds", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <QuestionFormCard
        {...buildProps({
          existingId: "Q-ATTACHMENT-SAVE",
          sectionGroup: 100,
          level: 0,
          initialContent: "Persisted question",
          initialMetadata: JSON.stringify({ attachments: ["questions/persisted.pdf"] }),
          onSave,
        })}
      />,
    );

    fireEvent.click(screen.getByLabelText(/เอกสารอ้างอิง \(Reference\)/));
    fireEvent.click(screen.getByLabelText(/คำเฉลย \(Answer Key\)/));
    fireEvent.click(screen.getByTitle("ลบไฟล์แนบ"));
    await screen.findByRole("button", { name: "📎 แนบไฟล์ (0/3)" });
    expect(invoke).not.toHaveBeenCalledWith("delete_question_image", expect.anything());

    fireEvent.click(screen.getByRole("button", { name: /^บันทึก/ }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        metadata: expect.not.stringContaining("persisted.pdf"),
      }));
      expect(invoke).toHaveBeenCalledWith("delete_question_image", {
        path: "questions/persisted.pdf",
      });
    });
  });

  it("treats clearing only the Answer Key editor as a dirty required draft", async () => {
    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if (command === "get_section_references") return refsFixture;
      if (command === "get_question_answer_keys") {
        return [{
          id: 1,
          question_id: "Q-1",
          sub_question_code: "",
          answer_key_text: "Persisted answer key",
          is_required: true,
          order_index: 0,
        }];
      }
      return [];
    });
    const openNext = vi.fn();
    render(
      <QuestionFormCard
        {...buildProps({
          existingId: "Q-1",
          initialContent: "Persisted question",
          workflowId: "creator-edit-DOC-1-Q-1",
        })}
      />,
    );

    const answerEditor = await screen.findByLabelText("answer-key-editor");
    expect(answerEditor).toHaveValue("Persisted answer key");
    fireEvent.change(answerEditor, { target: { value: "" } });
    act(() => {
      CreatorFormWorkflow.requestOpen("creator-edit-DOC-1-Q-2", openNext);
    });

    expect(screen.getByRole("dialog", { name: "การแก้ไขยังไม่ได้บันทึก" })).toBeInTheDocument();
    expect(openNext).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "บันทึกแล้วไปข้อใหม่" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("เฉลย (Answer Key)");
    expect(openNext).not.toHaveBeenCalled();
  });

  it("saves the dirty Creator draft before opening the requested form", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();
    const openNext = vi.fn();
    render(
      <QuestionFormCard
        {...buildProps({
          initialContent: "Persisted question",
          onSave,
          onCancel,
          workflowId: "creator-edit-DOC-1-Q-1",
        })}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("พิมพ์คำถาม..."), {
      target: { value: "Saved before switching" },
    });
    fireEvent.click(screen.getByLabelText(/เอกสารอ้างอิง \(Reference\)/));
    fireEvent.change(screen.getByLabelText("answer-key-editor"), {
      target: { value: "Saved answer key" },
    });
    act(() => {
      CreatorFormWorkflow.requestOpen("creator-edit-DOC-1-Q-2", openNext);
    });

    fireEvent.click(screen.getByRole("button", { name: "บันทึกแล้วไปข้อใหม่" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        content: "Saved before switching",
        answerKeys: [expect.objectContaining({ text: "Saved answer key" })],
      }));
      expect(onCancel).toHaveBeenCalledOnce();
      expect(openNext).toHaveBeenCalledOnce();
    });
  });

  it("keeps one workflow modal open when save-before-switch validation fails", async () => {
    const onAlert = vi.fn();
    const openNext = vi.fn();
    render(
      <QuestionFormCard
        {...buildProps({
          initialContent: "Persisted question",
          onAlert,
          workflowId: "creator-edit-DOC-1-Q-1",
        })}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("พิมพ์คำถาม..."), {
      target: { value: "" },
    });
    act(() => {
      CreatorFormWorkflow.requestOpen("creator-edit-DOC-1-Q-2", openNext);
    });
    fireEvent.click(screen.getByRole("button", { name: "บันทึกแล้วไปข้อใหม่" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("คำถาม (Question)");
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(onAlert).not.toHaveBeenCalled();
    expect(openNext).not.toHaveBeenCalled();
  });

  it("opens and closes reference selector", async () => {
    render(<QuestionFormCard {...buildProps()} />);

    const opener = await screen.findByText("+ เพิ่มเอกสารอ้างอิง (Add References)");
    fireEvent.click(opener);

    expect(screen.getByText("ซ่อนตัวเลือก (Hide Options)")).toBeInTheDocument();

    fireEvent.click(screen.getByText("ซ่อนตัวเลือก (Hide Options)"));
    expect(screen.getByText("+ เพิ่มเอกสารอ้างอิง (Add References)")).toBeInTheDocument();
  });

  it("toggles draft references and enforces max 2 selections", async () => {
    const onAlert = vi.fn();
    render(<QuestionFormCard {...buildProps({ onAlert })} />);

    fireEvent.click(await screen.findByText("+ เพิ่มเอกสารอ้างอิง (Add References)"));

    fireEvent.click(screen.getByText("Reference One"));
    fireEvent.click(screen.getByText("Reference Two"));
    expect(screen.getByText(/เลือกแล้ว 2\/2 รายการ/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Reference Three"));
    expect(onAlert).toHaveBeenCalledWith("เลือกเอกสารอ้างอิงได้สูงสุด 2 รายการ", "warning");

    fireEvent.click(screen.getByText("Reference Two"));
    expect(screen.getByText(/เลือกแล้ว 1\/2 รายการ/)).toBeInTheDocument();
  });

  it("shows Thai page format error for invalid page", async () => {
    render(<QuestionFormCard {...buildProps()} />);

    fireEvent.click(await screen.findByText("+ เพิ่มเอกสารอ้างอิง (Add References)"));
    fireEvent.click(screen.getByText("Reference One"));

    fireEvent.change(screen.getByPlaceholderText("5 หรือ 2-56"), {
      target: { value: "abc" },
    });

    expect(
      screen.getByText("รูปแบบเลขหน้าไม่ถูกต้อง: ใช้เลขอารบิก และ - เท่านั้น เช่น 5 หรือ 2-56 ฯ"),
    ).toBeInTheDocument();
  });

  it("clears page format error for valid page", async () => {
    render(<QuestionFormCard {...buildProps()} />);

    fireEvent.click(await screen.findByText("+ เพิ่มเอกสารอ้างอิง (Add References)"));
    fireEvent.click(screen.getByText("Reference One"));

    const pageInput = screen.getByPlaceholderText("5 หรือ 2-56");
    fireEvent.change(pageInput, { target: { value: "abc" } });
    expect(
      screen.getByText("รูปแบบเลขหน้าไม่ถูกต้อง: ใช้เลขอารบิก และ - เท่านั้น เช่น 5 หรือ 2-56 ฯ"),
    ).toBeInTheDocument();

    fireEvent.change(pageInput, { target: { value: "2-56" } });
    await waitFor(() => {
      expect(
        screen.queryByText("รูปแบบเลขหน้าไม่ถูกต้อง: ใช้เลขอารบิก และ - เท่านั้น เช่น 5 หรือ 2-56 ฯ"),
      ).not.toBeInTheDocument();
    });
  });

  it("saves selected references and closes reference editor", async () => {
    render(<QuestionFormCard {...buildProps()} />);

    fireEvent.click(await screen.findByText("+ เพิ่มเอกสารอ้างอิง (Add References)"));
    fireEvent.click(screen.getByText("Reference One"));
    fireEvent.change(screen.getByPlaceholderText("5 หรือ 2-56"), {
      target: { value: "5" },
    });

    fireEvent.click(screen.getByRole("button", { name: "เสร็จสิ้น (Done)" }));

    await waitFor(() => {
      expect(screen.getByText("ตรวจสอบ/แก้ไขเอกสารอ้างอิง (Edit References)")).toBeInTheDocument();
      expect(screen.queryByText("ซ่อนตัวเลือก (Hide Options)")).not.toBeInTheDocument();
      expect(screen.getByText(/เลือกแล้ว 1\/2 รายการ/)).toBeInTheDocument();
    });
  });

  it("saves the current reference draft without requiring the Done button", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const openNext = vi.fn();
    const initialReferences = refsFixture.slice(0, 2).map((item, index) => ({
      id: index + 1,
      question_id: "Q-REF-DRAFT",
      reference_id: item.reference.id,
      reference: item.reference,
      location_text: index === 0 ? "35" : "30",
      display_order: index + 1,
      thai_letter: item.thai_letter,
    }));
    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if (command === "get_section_references") return refsFixture;
      if (command === "get_question_answer_keys") {
        return [{
          id: 1,
          question_id: "Q-REF-DRAFT",
          sub_question_code: "",
          answer_key_text: "Persisted answer key",
          is_required: true,
          order_index: 0,
        }];
      }
      return [];
    });

    render(
      <QuestionFormCard
        {...buildProps({
          existingId: "Q-REF-DRAFT",
          initialContent: "Persisted question",
          initialReferences,
          onSave,
          workflowId: "creator-edit-DOC-1-Q-REF-DRAFT",
        })}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("พิมพ์คำถาม..."), {
      target: { value: "Changed question" },
    });
    fireEvent.click(await screen.findByText("ตรวจสอบ/แก้ไขเอกสารอ้างอิง (Edit References)"));
    fireEvent.click(screen.getByText("Reference Two"));

    act(() => {
      CreatorFormWorkflow.requestOpen("creator-edit-DOC-1-Q-NEXT", openNext);
    });

    const dialog = await screen.findByRole("dialog", { name: "การแก้ไขยังไม่ได้บันทึก" });
    expect(dialog).toHaveTextContent("คำถาม (Question)");
    expect(dialog).toHaveTextContent("เอกสารอ้างอิง (References)");
    fireEvent.click(within(dialog).getByRole("button", { name: "บันทึกแล้วไปข้อใหม่" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        content: "Changed question",
        references: [expect.objectContaining({ reference_id: 11, location_text: "35" })],
      }));
      expect(openNext).toHaveBeenCalledOnce();
    });
  });

  it("blocks save when content is empty", async () => {
    const onSave = vi.fn();
    const onAlert = vi.fn();

    render(<QuestionFormCard {...buildProps({ onSave, onAlert })} />);

    fireEvent.click(screen.getByRole("button", { name: /^เพิ่ม/ }));

    expect(onSave).not.toHaveBeenCalled();
    expect(onAlert).toHaveBeenCalledWith(expect.stringContaining("คำถาม (Question)"), "warning");
  });

  it("blocks save when requireRef=true and no linked refs", async () => {
    const onSave = vi.fn();
    const onAlert = vi.fn();

    render(
      <QuestionFormCard
        {...buildProps({
          onSave,
          onAlert,
          initialContent: "Valid question",
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^เพิ่ม/ }));

    expect(onSave).not.toHaveBeenCalled();
    expect(onAlert).toHaveBeenCalledWith(
      expect.stringContaining("เอกสารอ้างอิง (References)"),
      "warning",
    );
  });

  it("blocks save when requireAnswerKey=true and answer key is empty", async () => {
    const onSave = vi.fn();
    const onAlert = vi.fn();

    render(
      <QuestionFormCard
        {...buildProps({
          onSave,
          onAlert,
          initialContent: "Valid question",
        })}
      />,
    );

    fireEvent.click(screen.getByLabelText(/เอกสารอ้างอิง \(Reference\)/));
    fireEvent.click(screen.getByRole("button", { name: /^เพิ่ม/ }));

    expect(onSave).not.toHaveBeenCalled();
    expect(onAlert).toHaveBeenCalledWith(expect.stringContaining("เฉลย (Answer Key)"), "warning");
  });

  it("calls onSave with expected payload for valid data", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <QuestionFormCard
        {...buildProps({
          onSave,
          initialContent: "",
        })}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("พิมพ์คำถาม..."), {
      target: { value: "Question content" },
    });

    fireEvent.click(screen.getByLabelText(/เอกสารอ้างอิง \(Reference\)/));
    fireEvent.change(screen.getByLabelText("answer-key-editor"), {
      target: { value: "Correct answer" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^เพิ่ม/ }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "Question content",
          id: expect.any(String),
          references: [],
          metadata: expect.any(String),
        }),
      );
    });
  });

  it("hides reference section in sectionGroup=300", () => {
    render(
      <QuestionFormCard
        {...buildProps({
          sectionGroup: 300,
          level: 0,
          prefix: "๓๐๑.๒",
          questionSequence: 2,
          sectionId: undefined,
        })}
      />,
    );

    expect(screen.queryByText("เอกสารอ้างอิง (References)")).not.toBeInTheDocument();
  });

  it("hides answer key section in sectionGroup=300", () => {
    render(
      <QuestionFormCard
        {...buildProps({
          sectionGroup: 300,
          level: 0,
          prefix: "๓๐๑.๒",
          questionSequence: 2,
          sectionId: undefined,
        })}
      />,
    );

    expect(screen.queryByText("เฉลย (Answer Key)")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("answer-key-editor")).not.toBeInTheDocument();
  });

  it("keeps score input hidden when is_scored=false and shows it when checked", () => {
    render(
      <QuestionFormCard
        {...buildProps({
          sectionGroup: 300,
          level: 0,
          prefix: "๓๐๑.๒",
          questionSequence: 2,
          initialIsScored: false,
          initialQuestionType: "normal",
          sectionId: undefined,
        })}
      />,
    );

    expect(screen.getByText("มีคะแนน (is_scored)")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("0")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("มีคะแนน (is_scored)"));
    expect(screen.getByDisplayValue("0")).toBeInTheDocument();
  });

  it("hides scoring controls when score type changes to exempted", () => {
    render(
      <QuestionFormCard
        {...buildProps({
          sectionGroup: 300,
          level: 0,
          prefix: "๓๐๑.๒",
          questionSequence: 2,
          initialQuestionType: "normal",
          sectionId: undefined,
        })}
      />,
    );

    expect(screen.getByText("มีคะแนน (is_scored)")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("ไม่ต้องปฏิบัติ"));

    expect(screen.queryByText("มีคะแนน (is_scored)")).not.toBeInTheDocument();
  });

  it("shows exempted toggle for 2xx.1 but keeps sub-question editor hidden when activated", () => {
    render(
      <QuestionFormCard
        {...buildProps({
          sectionGroup: 200,
          level: 0,
          prefix: "๒๐๑.๑",
          questionSequence: 1,
          existingId: "q-201-1",
          initialContent: "หน้าที่",
          initialQuestionType: "exempted",
          initialDisplayText: "(ไม่ต้องอธิบาย)",
          sectionId: 201,
        })}
      />,
    );

    const exemptedToggle = screen.getByLabelText("ไม่ต้องอธิบาย");
    expect(exemptedToggle).toBeInTheDocument();
    expect(screen.queryByText("รายการคำถามย่อย (SubQuestion List)")).not.toBeInTheDocument();

    fireEvent.click(exemptedToggle);

    expect(screen.queryByText("รายการคำถามย่อย (SubQuestion List)")).not.toBeInTheDocument();
  });

  it("shows only auto code prefix for selected branch/sub", () => {
    render(
      <QuestionFormCard
        {...buildProps({
          sectionGroup: 200,
          level: 0,
          prefix: "๒๐๑.๒",
          questionSequence: 2,
          existingId: "q-201-2",
          initialContent: "หัวข้อทดสอบ",
          initialQuestionType: "normal",
          initialMetadata: JSON.stringify({
            useSubQuestions: true,
            selectedBranch: { main: "1", sub: "2" },
          }),
          sectionId: 201,
        })}
      />,
    );

    const autoLabel = screen.getByText("รหัส (Auto)");
    const autoContainer = autoLabel.parentElement;
    expect(autoContainer).not.toBeNull();
    expect(within(autoContainer as HTMLElement).getByText("220102")).toBeInTheDocument();
    expect(within(autoContainer as HTMLElement).queryByText("เต็ม")).not.toBeInTheDocument();
  });

  it("shows exempted checkbox toggle for Section 300 prerequisite parent questions (3xx.1.1 and 3xx.1.2)", () => {
    render(
      <QuestionFormCard
        {...buildProps({
          sectionGroup: 300,
          level: 1,
          prefix: "๓๐๑.๑.๑",
          questionSequence: 1,
          isInsidePrerequisiteDoc: true,
          initialQuestionType: "normal",
        })}
      />,
    );
    expect(screen.getByLabelText("ไม่ต้องปฏิบัติ")).toBeInTheDocument();
  });

  it("hides exempted checkbox toggle for Section 300 prerequisite sub-levels", () => {
    render(
      <QuestionFormCard
        {...buildProps({
          sectionGroup: 300,
          level: 2,
          prefix: "ก.",
          questionSequence: 1,
          isInsidePrerequisiteDoc: true,
          initialQuestionType: "normal",
        })}
      />,
    );
    expect(screen.queryByLabelText("ไม่ต้องปฏิบัติ")).not.toBeInTheDocument();
  });

  it("shows Section 200 mapping impact and saves only after explicit confirmation", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if (command === "get_section_references") return [];
      if (command === "get_question_answer_keys") {
        return [
          { id: 1, question_id: "Q-200", sub_question_code: "20000001", answer_key_text: "Alpha key", is_required: true, order_index: 0 },
          { id: 2, question_id: "Q-200", sub_question_code: "20000002", answer_key_text: "Bravo key", is_required: true, order_index: 1 },
        ];
      }
      if (command === "analyze_creator_question_change") {
        return {
          questionId: "Q-200",
          removedCodes: ["20000002"],
          items: [{
            subQuestionCode: "20000002", label: "Bravo", answerKeyCount: 1,
            traineeAnswerCount: 0, assessedAnswerCount: 0, attachmentCount: 0,
            progressRecordCount: 0,
          }],
          answerKeyCount: 1, traineeAnswerCount: 0, assessedAnswerCount: 0,
          attachmentCount: 0, progressRecordCount: 0,
          requiresConfirmation: true, isBlocked: false,
        };
      }
      if (command === "get_sub_question_usage_counts") return { usage_map: {}, total_children: 1 };
      return null;
    });

    render(
      <QuestionFormCard {...buildProps({
        existingId: "Q-200",
        parentId: "Q-PARENT",
        initialContent: "Persisted child",
        initialMetadata: JSON.stringify({
          requireRef: false,
          selectedSubQuestions: ["20000001", "20000002"],
        }),
        parentSubQuestionList: [
          { code: "20000001", text: "Alpha" },
          { code: "20000002", text: "Bravo" },
        ],
        onSave,
      })} />,
    );

    await waitFor(() => expect(screen.getByRole("checkbox", { name: /Bravo/ })).toBeChecked());
    fireEvent.click(screen.getByRole("checkbox", { name: /Bravo/ }));
    fireEvent.click(screen.getByRole("button", { name: /^บันทึก/ }));

    expect(await screen.findByRole("dialog", { name: /ยืนยันการนำคำถามย่อยออกจากข้อ/ })).toBeInTheDocument();
    expect(screen.getByText(/คำถามย่อย ข\. Bravo/)).toBeInTheDocument();
    expect(screen.getByText(/ยังเป็นเพียง Draft และยังไม่มีข้อมูลถูกนำออก/)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "กลับไปตรวจสอบ" }));
    expect(screen.queryByRole("dialog", { name: /ยืนยันการนำคำถามย่อยออกจากข้อ/ })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Bravo/ })).not.toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: /Bravo/ }));
    expect(screen.getByText("Bravo key")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /Bravo/ }));
    fireEvent.click(screen.getByRole("button", { name: /^บันทึก/ }));
    await screen.findByRole("dialog", { name: /ยืนยันการนำคำถามย่อยออกจากข้อ/ });
    fireEvent.click(screen.getByRole("button", { name: "นำออกและบันทึก" }));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ confirmMappingChange: true }));
    });
  });

  it("mounts one Section 200 Answer Key editor and preserves every draft while switching rows", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if (command === "get_section_references") return [];
      if (command === "get_question_answer_keys") {
        return [
          { id: 1, question_id: "Q-MULTI-AK", sub_question_code: "20000001", answer_key_text: "Alpha key", is_required: true, order_index: 0 },
          { id: 2, question_id: "Q-MULTI-AK", sub_question_code: "20000002", answer_key_text: "Bravo key", is_required: true, order_index: 1 },
          { id: 3, question_id: "Q-MULTI-AK", sub_question_code: "20000003", answer_key_text: "Charlie key", is_required: true, order_index: 2 },
        ];
      }
      if (command === "get_sub_question_usage_counts") return { usage_map: {}, total_children: 1 };
      if (command === "analyze_creator_question_change") {
        return {
          questionId: "Q-MULTI-AK",
          removedCodes: [],
          items: [],
          answerKeyCount: 0,
          traineeAnswerCount: 0,
          assessedAnswerCount: 0,
          attachmentCount: 0,
          progressRecordCount: 0,
          requiresConfirmation: false,
          isBlocked: false,
        };
      }
      return null;
    });

    render(
      <QuestionFormCard {...buildProps({
        existingId: "Q-MULTI-AK",
        parentId: "Q-PARENT",
        initialContent: "Persisted child",
        initialMetadata: JSON.stringify({
          requireRef: false,
          selectedSubQuestions: ["20000003", "20000001", "20000002"],
        }),
        parentSubQuestionList: [
          { code: "20000001", text: "Alpha" },
          { code: "20000002", text: "Bravo" },
          { code: "20000003", text: "Charlie" },
        ],
        onSave,
      })} />,
    );

    await waitFor(() => expect(screen.getAllByLabelText("answer-key-editor")).toHaveLength(1));
    let activeEditor = screen.getByLabelText("answer-key-editor");
    expect(activeEditor).toHaveAttribute("data-context-label", "เฉลย ข้อ ๒๐๑.๑ คำถามย่อย ก");
    expect(activeEditor).toHaveValue("Alpha key");
    expect(
      screen.getAllByText("Alpha").find((element) => element.hasAttribute("data-answer-key-context-state")),
    ).toHaveAttribute("data-answer-key-context-state", "active");
    expect(
      screen.getAllByText("Bravo").find((element) => element.hasAttribute("data-answer-key-context-state")),
    ).toHaveAttribute("data-answer-key-context-state", "inactive");

    fireEvent.change(activeEditor, { target: { value: "Alpha draft" } });
    fireEvent.click(screen.getByRole("button", { name: "แก้ไข เฉลย ข้อ ๒๐๑.๑ คำถามย่อย ข" }));

    expect(screen.getAllByLabelText("answer-key-editor")).toHaveLength(1);
    activeEditor = screen.getByLabelText("answer-key-editor");
    expect(activeEditor).toHaveAttribute("data-context-label", "เฉลย ข้อ ๒๐๑.๑ คำถามย่อย ข");
    expect(activeEditor).toHaveValue("Bravo key");
    expect(screen.getByText("Alpha draft")).toBeInTheDocument();
    expect(
      screen.getAllByText("Alpha").find((element) => element.hasAttribute("data-answer-key-context-state")),
    ).toHaveAttribute("data-answer-key-context-state", "inactive");
    expect(
      screen.getAllByText("Bravo").find((element) => element.hasAttribute("data-answer-key-context-state")),
    ).toHaveAttribute("data-answer-key-context-state", "active");

    fireEvent.change(activeEditor, { target: { value: "Bravo draft" } });
    fireEvent.click(screen.getByRole("button", { name: "แก้ไข เฉลย ข้อ ๒๐๑.๑ คำถามย่อย ก" }));

    activeEditor = screen.getByLabelText("answer-key-editor");
    expect(activeEditor).toHaveValue("Alpha draft");
    expect(screen.getByText("Bravo draft")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^บันทึก/ }));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        answerKeys: [
          { subCode: "20000001", text: "Alpha draft", isRequired: true },
          { subCode: "20000002", text: "Bravo draft", isRequired: true },
          { subCode: "20000003", text: "Charlie key", isRequired: true },
        ],
      }));
    });
  });

  it("keeps a long Section 200 Answer Key list to one mounted editor", async () => {
    const items = Array.from({ length: 12 }, (_, index) => ({
      code: `2000${String(index + 1).padStart(4, "0")}`,
      text: `Sub-question ${index + 1}`,
    }));
    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if (command === "get_section_references") return [];
      if (command === "get_question_answer_keys") {
        return items.map((item, index) => ({
          id: index + 1,
          question_id: "Q-LONG-AK",
          sub_question_code: item.code,
          answer_key_text: `Answer ${index + 1}`,
          is_required: true,
          order_index: index,
        }));
      }
      if (command === "get_sub_question_usage_counts") return { usage_map: {}, total_children: 1 };
      return null;
    });

    render(
      <QuestionFormCard {...buildProps({
        existingId: "Q-LONG-AK",
        parentId: "Q-PARENT",
        initialContent: "Long Answer Key question",
        initialMetadata: JSON.stringify({
          requireRef: false,
          selectedSubQuestions: items.map((item) => item.code).reverse(),
        }),
        parentSubQuestionList: items,
      })} />,
    );

    await waitFor(() => expect(screen.getAllByLabelText("answer-key-editor")).toHaveLength(1));
    expect(screen.getByLabelText("answer-key-editor")).toHaveAttribute(
      "data-context-label",
      "เฉลย ข้อ ๒๐๑.๑ คำถามย่อย ก",
    );
    expect(screen.getAllByRole("button", { name: /^แก้ไข เฉลย ข้อ/ })).toHaveLength(11);
  });

  it("opens the first inactive Answer Key that fails validation", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onAlert = vi.fn();
    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if (command === "get_section_references") return [];
      if (command === "get_question_answer_keys") {
        return [
          { id: 1, question_id: "Q-AK-VALIDATION", sub_question_code: "20000001", answer_key_text: "Alpha key", is_required: true, order_index: 0 },
          { id: 2, question_id: "Q-AK-VALIDATION", sub_question_code: "20000002", answer_key_text: "", is_required: true, order_index: 1 },
          { id: 3, question_id: "Q-AK-VALIDATION", sub_question_code: "20000003", answer_key_text: "", is_required: true, order_index: 2 },
        ];
      }
      if (command === "get_sub_question_usage_counts") return { usage_map: {}, total_children: 1 };
      return null;
    });

    render(
      <QuestionFormCard {...buildProps({
        existingId: "Q-AK-VALIDATION",
        parentId: "Q-PARENT",
        initialContent: "Persisted child",
        initialMetadata: JSON.stringify({
          requireRef: false,
          selectedSubQuestions: ["20000001", "20000002", "20000003"],
        }),
        parentSubQuestionList: [
          { code: "20000001", text: "Alpha" },
          { code: "20000002", text: "Bravo" },
          { code: "20000003", text: "Charlie" },
        ],
        onSave,
        onAlert,
      })} />,
    );

    await waitFor(() => expect(screen.getByLabelText("answer-key-editor")).toHaveValue("Alpha key"));
    fireEvent.click(screen.getByRole("button", { name: /^บันทึก/ }));

    await waitFor(() => {
      expect(screen.getByLabelText("answer-key-editor")).toHaveAttribute(
        "data-context-label",
        "เฉลย ข้อ ๒๐๑.๑ คำถามย่อย ข",
      );
    });
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("ยังไม่มีคำเฉลย")).toBeInTheDocument();
    expect(onAlert).toHaveBeenCalledWith(
      expect.stringMatching(
        /คำเฉลยที่ยังว่าง 2 รายการ:[\s\S]*เฉลย ข\. — Bravo[\s\S]*เฉลย ค\. — Charlie/,
      ),
      "warning",
      expect.any(Function),
      "ไปที่เฉลย ข.",
    );

    const focusAfterDismiss = onAlert.mock.calls[0]?.[2] as (() => void) | undefined;
    focusAfterDismiss?.();
    await waitFor(() => expect(screen.getByLabelText("answer-key-editor")).toHaveFocus());
  });

  it("blocks Section 200 mapping removal when Trainee work exists", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if (command === "get_section_references") return [];
      if (command === "get_question_answer_keys") {
        return [
          { id: 1, question_id: "Q-200", sub_question_code: "20000001", answer_key_text: "Alpha key", is_required: true, order_index: 0 },
          { id: 2, question_id: "Q-200", sub_question_code: "20000002", answer_key_text: "Bravo key", is_required: true, order_index: 1 },
        ];
      }
      if (command === "analyze_creator_question_change") {
        return {
          questionId: "Q-200",
          removedCodes: ["20000002"],
          items: [{
            subQuestionCode: "20000002", label: "Bravo", answerKeyCount: 1,
            traineeAnswerCount: 1, assessedAnswerCount: 1, attachmentCount: 2,
            progressRecordCount: 1,
          }],
          answerKeyCount: 1, traineeAnswerCount: 1, assessedAnswerCount: 1,
          attachmentCount: 2, progressRecordCount: 1,
          requiresConfirmation: true, isBlocked: true,
        };
      }
      if (command === "get_sub_question_usage_counts") return { usage_map: {}, total_children: 1 };
      return null;
    });

    render(
      <QuestionFormCard {...buildProps({
        existingId: "Q-200",
        parentId: "Q-PARENT",
        initialContent: "Persisted child",
        initialMetadata: JSON.stringify({
          requireRef: false,
          selectedSubQuestions: ["20000001", "20000002"],
        }),
        parentSubQuestionList: [
          { code: "20000001", text: "Alpha" },
          { code: "20000002", text: "Bravo" },
        ],
        onSave,
      })} />,
    );

    await waitFor(() => expect(screen.getByRole("checkbox", { name: /Bravo/ })).toBeChecked());
    fireEvent.click(screen.getByRole("checkbox", { name: /Bravo/ }));
    fireEvent.click(screen.getByRole("button", { name: /^บันทึก/ }));

    expect(await screen.findByRole("dialog", { name: "ไม่สามารถนำคำถามย่อยนี้ออกได้" })).toBeInTheDocument();
    expect(screen.getByText(/คำตอบ Trainee 1 · ผลประเมิน 1 · ไฟล์แนบ 2/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "นำออกและบันทึก" })).not.toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
