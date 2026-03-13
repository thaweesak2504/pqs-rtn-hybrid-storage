import { invoke } from "@tauri-apps/api/tauri";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QuestionDisplayCard from "../../components/editor_v2/QuestionDisplayCard";
import { QuestionDetail } from "../../types/content";

vi.mock("../../components/ui/DropdownMenu", () => ({
  default: ({ trigger, items }: { trigger: React.ReactNode; items: Array<{ label: string }> }) => (
    <div data-testid="dropdown-menu">
      <div>{trigger}</div>
      <div>{items.map((item) => item.label).join("|")}</div>
    </div>
  ),
}));

vi.mock("../../components/editor_v2/QuestionMetadataDisplay", () => ({
  default: () => <div data-testid="question-metadata-display" />,
}));

vi.mock("../../components/editor_v2/OralAssessmentBox", () => ({
  default: () => <div data-testid="oral-assessment-box" />,
}));

const createQuestion = (overrides: Partial<QuestionDetail> = {}): QuestionDetail => ({
  id: "q-1",
  document_id: "DOC-1",
  section_id: 301,
  parent_id: null,
  sequence: 1,
  content: "Sample question",
  is_header: false,
  description: null,
  answer_type: "text",
  metadata: null,
  score: null,
  question_type: "standard",
  group_score: null,
  display_text: null,
  is_group_header: false,
  is_scored: false,
  choices: [],
  references: [],
  children: [],
  ...overrides,
});

const baseProps = {
  prefix: "๓๐๑.๑",
  level: 0,
  sectionGroup: 300 as const,
  readOnly: false,
  isExpanded: true,
  hasChildren: false,
  canAddSub: true,
  canInsertSibling: true,
  isFirst: true,
  isLast: true,
  isDefaultL1: false,
  isDefault300L2: false,
  onToggle: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onAddSub: vi.fn(),
  onInsertAfter: vi.fn(),
  onMoveUp: vi.fn(),
  onMoveDown: vi.fn(),
  onImageClick: vi.fn(),
  parentLayout: "list" as const,
  parentSubQuestionList: undefined,
  traineeAnswer: undefined,
  answerMap: new Map(),
  documentId: "DOC-1",
  onRefresh: vi.fn(),
  usageRefreshKey: 0,
};

describe("QuestionDisplayCard integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invoke).mockReset();
    vi.mocked(invoke).mockResolvedValue(null);
  });

  it("shows action dropdown in edit mode", () => {
    render(
      <QuestionDisplayCard
        {...baseProps}
        viewMode="edit"
        question={createQuestion()}
      />,
    );

    expect(screen.getByTestId("dropdown-menu")).toBeInTheDocument();
  });

  it("hides action dropdown in qualifier mode", () => {
    render(
      <QuestionDisplayCard
        {...baseProps}
        viewMode="qualifier"
        question={createQuestion()}
      />,
    );

    expect(screen.queryByTestId("dropdown-menu")).not.toBeInTheDocument();
  });

  it("renders amber group header badge for L1 with รวม text", () => {
    render(
      <QuestionDisplayCard
        {...baseProps}
        question={createQuestion({
          is_group_header: true,
          group_score: 10,
          parent_id: null,
        })}
      />,
    );

    expect(screen.getByText(/รวม:/)).toBeInTheDocument();
    expect(screen.getByText("10 คะแนน")).toBeInTheDocument();
  });

  it("renders emerald score badge for individual scored question", () => {
    render(
      <QuestionDisplayCard
        {...baseProps}
        level={1}
        question={createQuestion({
          is_group_header: false,
          is_scored: true,
          score: 15,
          parent_id: "q-parent",
        })}
      />,
    );

    expect(screen.getByText("15 คะแนน")).toBeInTheDocument();
  });

  it("renders oral assessment badge pending and passed", () => {
    const pendingQuestion = createQuestion({
      sequence: 2,
      is_group_header: false,
      is_scored: true,
      score: 10,
      parent_id: "q-parent",
    });

    const { rerender } = render(
      <QuestionDisplayCard
        {...baseProps}
        level={1}
        viewMode="trainee"
        prefix="๓๐๑.๒"
        question={pendingQuestion}
      />,
    );

    expect(screen.getByText("รอประเมิน")).toBeInTheDocument();

    rerender(
      <QuestionDisplayCard
        {...baseProps}
        level={1}
        viewMode="trainee"
        prefix="๓๐๑.๒"
        question={pendingQuestion}
        traineeAnswer={{
          user_id: "T-001",
          question_id: "q-1",
          document_id: "DOC-1",
          sub_question_code: "",
          answer_text: "ok",
          status: "passed",
          feedback: null,
          assessed_at: null,
          assessed_by: null,
          updated_at: "2026-03-11",
        }}
      />,
    );

    expect(screen.getByText("ผ่าน")).toBeInTheDocument();
  });

  it("renders exempted badge text", () => {
    render(
      <QuestionDisplayCard
        {...baseProps}
        question={createQuestion({ question_type: "exempted", display_text: null })}
      />,
    );

    expect(screen.getByText("(ไม่ต้องปฏิบัติ)")).toBeInTheDocument();
  });

  it("shows edit-only menu for exempted 200 L1 questions", () => {
    render(
      <QuestionDisplayCard
        {...baseProps}
        sectionGroup={200}
        prefix="๒๐๑.๑"
        isDefaultL1
        canAddSub={false}
        question={createQuestion({ question_type: "exempted", display_text: "(ไม่ต้องอธิบาย)" })}
      />,
    );

    expect(screen.getByText("แก้ไข (Edit)")).toBeInTheDocument();
    expect(screen.queryByText("เพิ่มคำถามย่อย (Add Sub-Question)")).not.toBeInTheDocument();
  });

  it("shows add-sub and edit menu for active 200 L1 questions", () => {
    render(
      <QuestionDisplayCard
        {...baseProps}
        sectionGroup={200}
        prefix="๒๐๑.๑"
        isDefaultL1
        canAddSub
        question={createQuestion({ question_type: "normal" })}
      />,
    );

    expect(screen.getByText("เพิ่มคำถามย่อย (Add Sub-Question)|แก้ไข (Edit)")).toBeInTheDocument();
  });

  it("renders section selector warning when no children linked", () => {
    render(
      <QuestionDisplayCard
        {...baseProps}
        level={1}
        prefix="๓๐๑.๑.๓"
        hasChildren={false}
        question={createQuestion({
          sequence: 3,
          question_type: "standard",
          parent_id: "q-parent",
        })}
      />,
    );

    expect(screen.getByText("⚠ ยังไม่ได้เลือก Section")).toBeInTheDocument();
  });

  it("renders inline sub-question checkboxes with Thai alphabet labels", () => {
    render(
      <QuestionDisplayCard
        {...baseProps}
        level={1}
        sectionGroup={200}
        prefix="๒๐๑.๑"
        parentSubQuestionList={[
          { code: "A1", text: "Sub 1" },
          { code: "A2", text: "Sub 2" },
        ]}
        question={createQuestion({
          parent_id: "q-parent",
          metadata: JSON.stringify({ selectedSubQuestions: ["A1"] }),
        })}
      />,
    );

    expect(screen.getByText("ก.")).toBeInTheDocument();
    expect(screen.getByText("ข.")).toBeInTheDocument();
  });

  it("toggle button is visible only when hasChildren=true", () => {
    const { container, rerender } = render(
      <QuestionDisplayCard
        {...baseProps}
        hasChildren={false}
        question={createQuestion()}
      />,
    );

    const hiddenToggle = container.querySelector("button.w-5.h-5");
    expect(hiddenToggle?.className).toContain("invisible");

    rerender(
      <QuestionDisplayCard
        {...baseProps}
        hasChildren
        question={createQuestion()}
      />,
    );

    const visibleToggle = container.querySelector("button.w-5.h-5");
    expect(visibleToggle?.className).not.toContain("invisible");
  });

  it("shows L1 sub-question usage badges only in edit mode", async () => {
    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if (command === "get_all_sub_questions_for_branch") {
        return [{ id: 1, code: "32111", text: "SubQ", always_checked: false }];
      }
      if (command === "get_sub_question_usage_counts") {
        return { usage_map: { "32111": 1 }, total_children: 2 };
      }
      return null;
    });

    const question = createQuestion({
      sequence: 2,
      metadata: JSON.stringify({
        useSubQuestions: true,
        activeSubQuestions: ["32111"],
        selectedBranch: { main: "1", sub: "1" },
      }),
    });

    const { rerender } = render(
      <QuestionDisplayCard
        {...baseProps}
        sectionGroup={300}
        level={0}
        viewMode="edit"
        question={question}
      />,
    );

    expect(await screen.findByText("Used: 1/2")).toBeInTheDocument();

    rerender(
      <QuestionDisplayCard
        {...baseProps}
        sectionGroup={300}
        level={0}
        viewMode="trainee"
        question={question}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText("Used: 1/2")).not.toBeInTheDocument();
    });
  });

  it("renders linked section progress block in trainee mode", async () => {
    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if (command === "get_section_progress") {
        return {
          earned_score: 7,
          max_score: 10,
          completion_percentage: 70,
          is_passed: false,
          passing_score: 100,
          total_questions: 10,
          answered_questions: 8,
          passed_questions: 7,
          pending_with_answer: 1,
          needs_improvement_questions: 0,
        };
      }
      return null;
    });

    render(
      <QuestionDisplayCard
        {...baseProps}
        level={1}
        viewMode="trainee"
        prefix="๓๐๑.๑.๔"
        question={createQuestion({
          sequence: 4,
          parent_id: "q-parent",
          metadata: JSON.stringify({ refSectionId: 120, refSectionNumber: 200 }),
        })}
      />,
    );

    expect(await screen.findByText(/Progress/)).toBeInTheDocument();
    expect(screen.getByText(/70%/)).toBeInTheDocument();
  });

  it("renders description only for allowed level/section combinations", () => {
    const { rerender } = render(
      <QuestionDisplayCard
        {...baseProps}
        sectionGroup={100}
        level={1}
        question={createQuestion({ description: "Hidden description" })}
      />,
    );

    expect(screen.queryByText("Hidden description")).not.toBeInTheDocument();

    rerender(
      <QuestionDisplayCard
        {...baseProps}
        sectionGroup={200}
        level={1}
        question={createQuestion({ description: "Shown description" })}
      />,
    );

    expect(screen.getByText("Shown description")).toBeInTheDocument();
  });
});
