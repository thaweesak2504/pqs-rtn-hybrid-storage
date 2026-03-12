import { invoke } from "@tauri-apps/api/tauri";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QuestionFormCard from "../../components/editor_v2/QuestionFormCard";
import { SectionReferenceDetail } from "../../types/content";

vi.mock("../../components/editor_v2/AnswerKeyEditor", () => ({
  default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea
      aria-label="answer-key-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
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
    vi.mocked(invoke).mockReset();
    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if (command === "get_section_references") return refsFixture;
      if (command === "replace_question_answer_keys") return null;
      if (command === "update_question") return null;
      if (command === "update_question_score") return null;
      if (command === "get_question_answer_keys") return [];
      return null;
    });
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

    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(screen.getByText("แก้ไขเอกสารอ้างอิง (Update References)")).toBeInTheDocument();
      expect(screen.queryByText("ซ่อนตัวเลือก (Hide Options)")).not.toBeInTheDocument();
      expect(screen.getByText(/เลือกแล้ว 1\/2 รายการ/)).toBeInTheDocument();
    });
  });

  it("blocks save when content is empty", async () => {
    const onSave = vi.fn();
    const onAlert = vi.fn();

    render(<QuestionFormCard {...buildProps({ onSave, onAlert })} />);

    fireEvent.click(screen.getByRole("button", { name: "เพิ่ม" }));

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

    fireEvent.click(screen.getByRole("button", { name: "เพิ่ม" }));

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
    fireEvent.click(screen.getByRole("button", { name: "เพิ่ม" }));

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

    fireEvent.click(screen.getByRole("button", { name: "เพิ่ม" }));

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
});
