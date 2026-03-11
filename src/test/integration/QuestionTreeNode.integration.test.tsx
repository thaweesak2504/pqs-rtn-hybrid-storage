import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QuestionTreeNode from "../../components/editor_v2/QuestionTreeNode";
import { QuestionDetail } from "../../types/content";

vi.mock("../../components/editor_v2/QuestionDisplayCard", () => ({
  default: ({
    question,
    canAddSub,
    canInsertSibling,
  }: {
    question: QuestionDetail;
    canAddSub: boolean;
    canInsertSibling?: boolean;
  }) => (
    <div data-testid={`display-${question.id}`}>
      <span>{question.content}</span>
      {canAddSub && <button>{`add-sub-${question.id}`}</button>}
      {canInsertSibling !== false && <button>{`insert-after-${question.id}`}</button>}
    </div>
  ),
}));

vi.mock("../../components/editor_v2/QuestionFormCard", () => ({
  default: ({ prefix }: { prefix: string }) => <div data-testid="question-form-card">{`form:${prefix}`}</div>,
}));

const makeQuestion = (overrides: Partial<QuestionDetail> = {}): QuestionDetail => ({
  id: "q-1",
  document_id: "DOC-1",
  section_id: 301,
  parent_id: null,
  sequence: 1,
  content: "Root Question",
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

const buildProps = (overrides: Partial<React.ComponentProps<typeof QuestionTreeNode>> = {}) => ({
  question: makeQuestion(),
  level: 0,
  sectionNumber: 301,
  sectionGroup: 300 as const,
  parentSequence: null,
  readOnly: false,
  editingId: null,
  isCreating: false,
  creatingAtParent: null,
  insertingAfterId: null,
  onStartEdit: vi.fn(),
  onUpdate: vi.fn(),
  onDelete: vi.fn(),
  onStartCreate: vi.fn(),
  onStartInsertAfter: vi.fn(),
  onCreate: vi.fn(),
  onCancel: vi.fn(),
  onMoveUp: vi.fn(),
  onMoveDown: vi.fn(),
  siblings: [makeQuestion()],
  isFirst: true,
  isLast: true,
  documentId: "DOC-1",
  sectionId: 301,
  onImageClick: vi.fn(),
  onAlert: vi.fn(),
  parentLayout: "list" as const,
  parentSubQuestionList: undefined,
  sectionOccupationBranches: undefined,
  sectionSelectedBranch: undefined,
  collapsedIds: new Set<string>(),
  onToggleCollapse: vi.fn(),
  isParentDefault300L1: false,
  onRefresh: vi.fn(),
  onQuestionsUpdated: vi.fn(),
  usageRefreshKey: 0,
  viewMode: "edit" as const,
  traineeAnswer: undefined,
  answerMap: new Map(),
  ...overrides,
});

describe("QuestionTreeNode integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders inline score form when editingId matches and useInlineScoreForm=true", () => {
    render(
      <QuestionTreeNode
        {...buildProps({
          level: 1,
          parentSequence: 6,
          editingId: "q-1",
          question: makeQuestion({
            question_type: "required_instance",
            parent_id: "q-parent",
            is_scored: true,
            score: 5,
          }),
        })}
      />,
    );

    expect(screen.getByText("✏️ แก้ไขคะแนน")).toBeInTheDocument();
    expect(screen.queryByTestId("question-form-card")).not.toBeInTheDocument();
  });

  it("renders QuestionFormCard when editingId matches normal question", () => {
    render(
      <QuestionTreeNode
        {...buildProps({
          editingId: "q-1",
          question: makeQuestion({ question_type: "standard" }),
        })}
      />,
    );

    expect(screen.getByTestId("question-form-card")).toBeInTheDocument();
  });

  it("renders QuestionDisplayCard when editingId does not match", () => {
    render(
      <QuestionTreeNode
        {...buildProps({
          editingId: "another-id",
          question: makeQuestion({ content: "Display Node" }),
        })}
      />,
    );

    expect(screen.getByTestId("display-q-1")).toBeInTheDocument();
    expect(screen.getByText("Display Node")).toBeInTheDocument();
  });

  it("shows insert-after QuestionFormCard when insertingAfterId matches", () => {
    render(
      <QuestionTreeNode
        {...buildProps({
          isCreating: true,
          insertingAfterId: "q-1",
          question: makeQuestion({ sequence: 1 }),
        })}
      />,
    );

    expect(screen.getByTestId("question-form-card")).toBeInTheDocument();
  });

  it("shows add-sub QuestionFormCard when creatingAtParent matches", () => {
    render(
      <QuestionTreeNode
        {...buildProps({
          isCreating: true,
          creatingAtParent: "q-1",
          question: makeQuestion({ children: [] }),
        })}
      />,
    );

    expect(screen.getByTestId("question-form-card")).toBeInTheDocument();
  });

  it("does not render children when node is collapsed", () => {
    const child = makeQuestion({ id: "q-child", content: "Child Node", parent_id: "q-1", sequence: 1 });

    render(
      <QuestionTreeNode
        {...buildProps({
          collapsedIds: new Set(["q-1"]),
          question: makeQuestion({ children: [child] }),
        })}
      />,
    );

    expect(screen.queryByTestId("display-q-child")).not.toBeInTheDocument();
  });

  it("renders child recursively when expanded", () => {
    const child = makeQuestion({ id: "q-child", content: "Child Node", parent_id: "q-1", sequence: 1 });

    render(
      <QuestionTreeNode
        {...buildProps({
          question: makeQuestion({ children: [child] }),
        })}
      />,
    );

    expect(screen.getByTestId("display-q-child")).toBeInTheDocument();
    expect(screen.getByText("Child Node")).toBeInTheDocument();
  });

  it("suppresses children for exempted 3xx.3/3xx.4/3xx.5 L2 even when expanded", () => {
    const child = makeQuestion({ id: "q-child", content: "Hidden Child", parent_id: "q-1", sequence: 1 });

    render(
      <QuestionTreeNode
        {...buildProps({
          level: 1,
          parentSequence: 1,
          question: makeQuestion({
            sequence: 3,
            question_type: "exempted",
            parent_id: "q-parent",
            children: [child],
          }),
        })}
      />,
    );

    expect(screen.queryByTestId("display-q-child")).not.toBeInTheDocument();
  });

  it("does not allow add-sub for locked 300 L1 (seq=1 and seq=7)", () => {
    const { rerender } = render(
      <QuestionTreeNode
        {...buildProps({
          question: makeQuestion({ sequence: 1, id: "q-seq1" }),
        })}
      />,
    );

    expect(screen.queryByText("add-sub-q-seq1")).not.toBeInTheDocument();

    rerender(
      <QuestionTreeNode
        {...buildProps({
          question: makeQuestion({ sequence: 7, id: "q-seq7" }),
        })}
      />,
    );

    expect(screen.queryByText("add-sub-q-seq7")).not.toBeInTheDocument();
  });

  it("does not allow insert-after for required_instance child", () => {
    render(
      <QuestionTreeNode
        {...buildProps({
          level: 1,
          parentSequence: 6,
          question: makeQuestion({
            id: "q-ri",
            parent_id: "q-parent",
            question_type: "required_instance",
          }),
        })}
      />,
    );

    expect(screen.queryByText("insert-after-q-ri")).not.toBeInTheDocument();
  });
});
