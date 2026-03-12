import { invoke } from "@tauri-apps/api/tauri";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PqsSectionPreview200 from "../../components/editor_v2/PqsSectionPreview200";
import { QuestionDetail } from "../../types/content";

// Mock the dependencies
vi.mock("../../components/editor_v2/TraineeAnswerBox", () => ({
  default: ({ questionId, subQuestionCode }: { questionId: string; subQuestionCode?: string }) => (
    <div data-testid={`trainee-answer-box-${questionId}-${subQuestionCode || 'default'}`}>
      TraineeAnswerBox
    </div>
  ),
}));

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

vi.mock("rehype-raw", () => ({
  default: {},
}));

vi.mock("remark-gfm", () => ({
  default: {},
}));

describe("PqsSectionPreview200 - Answer Box Display", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invoke).mockReset();
  });

  /**
   * Test: Exempted L1 questions (2xx.2, 2xx.4) should NOT show answer boxes
   * Scenario: Section 200 Qualifier view, L1 exempted question
   */
  it("should NOT show answer box for exempted L1 question (2xx.2) in qualifier view", async () => {
    const exemptedQuestion: QuestionDetail = {
      id: "q-2",
      document_id: "DOC-1",
      section_id: 201,
      parent_id: null,
      sequence: 2, // 2xx.2
      content: "ส่วนประกอบและชิ้นส่วนในส่วนประกอบของระบบ",
      is_header: true,
      description: null,
      answer_type: "text",
      metadata: JSON.stringify({ useSubQuestions: false }),
      score: null,
      question_type: "exempted", // ← Exempted
      group_score: null,
      display_text: "(ไม่ต้องอธิบาย)",
      is_group_header: false,
      is_scored: false,
      choices: [],
      references: [],
      children: [],
    };

    vi.mocked(invoke).mockImplementation(async (cmd) => {
      if (cmd === "get_document_questions_with_details") {
        return [exemptedQuestion];
      }
      if (cmd === "get_question_answer_keys") {
        return []; // No answer keys
      }
      return null;
    });

    const { container } = render(
      <PqsSectionPreview200
        docId="DOC-1"
        sectionId={201}
        sectionNumber={200}
        title="Section 200"
        references={[]}
        sectionGroup={200}
        mode="qualifier"
      />
    );

    await waitFor(() => {
      // Should NOT render the fallback TraineeAnswerBox for exempted question
      expect(
        container.querySelector('[data-testid*="trainee-answer-box"]')
      ).not.toBeInTheDocument();
    });
  });

  /**
   * Test: Non-exempted L1 question (2xx.1) should also NOT show answer box
   * L1 questions are always section headers regardless of exempted/normal type.
   * Rule: No AnswerKey (L1 questions never have keys) = No Answer Box
   */
  it("should NOT show answer box for non-exempted L1 question (2xx.1) either", async () => {
    const normalL1Question: QuestionDetail = {
      id: "q-1",
      document_id: "DOC-1",
      section_id: 201,
      parent_id: null,
      sequence: 1, // 2xx.1
      content: "หน้าที่",
      is_header: true,
      description: null,
      answer_type: "text",
      metadata: JSON.stringify({ useSubQuestions: false }),
      score: null,
      question_type: "normal", // ← Not exempted, but still L1 header
      group_score: null,
      display_text: null,
      is_group_header: false,
      is_scored: false,
      choices: [],
      references: [],
      children: [],
    };

    vi.mocked(invoke).mockImplementation(async (cmd) => {
      if (cmd === "get_document_questions_with_details") {
        return [normalL1Question];
      }
      if (cmd === "get_question_answer_keys") {
        return []; // No answer keys — L1 questions never have answer keys
      }
      return null;
    });

    const { container } = render(
      <PqsSectionPreview200
        docId="DOC-1"
        sectionId={201}
        sectionNumber={200}
        title="Section 200"
        references={[]}
        sectionGroup={200}
        mode="trainee"
      />
    );

    await waitFor(() => {
      // L1 questions NEVER show answer boxes — regardless of exempted/normal type
      expect(
        container.querySelector('[data-testid*="trainee-answer-box"]')
      ).not.toBeInTheDocument();
    });
  });

  /**
   * Test: Group header L1 question should NOT show answer box
   * Scenario: Section 200 L1 question with is_group_header=true
   */
  it("should NOT show answer box for group header L1 question", async () => {
    const groupHeaderQuestion: QuestionDetail = {
      id: "q-1",
      document_id: "DOC-1",
      section_id: 201,
      parent_id: null,
      sequence: 1,
      content: "หน้าที่",
      is_header: true,
      description: null,
      answer_type: "text",
      metadata: JSON.stringify({ useSubQuestions: false }),
      score: null,
      question_type: "normal",
      group_score: null,
      display_text: null,
      is_group_header: true, // ← Group header
      is_scored: false,
      choices: [],
      references: [],
      children: [],
    };

    vi.mocked(invoke).mockImplementation(async (cmd) => {
      if (cmd === "get_document_questions_with_details") {
        return [groupHeaderQuestion];
      }
      if (cmd === "get_question_answer_keys") {
        return []; // No answer keys
      }
      return null;
    });

    const { container } = render(
      <PqsSectionPreview200
        docId="DOC-1"
        sectionId={201}
        sectionNumber={200}
        title="Section 200"
        references={[]}
        sectionGroup={200}
        mode="qualifier"
      />
    );

    await waitFor(() => {
      // Should NOT render answer box for group header
      expect(
        container.querySelector('[data-testid*="trainee-answer-box"]')
      ).not.toBeInTheDocument();
    });
  });

  /**
   * Test: Exempted question with answer keys should NOT show TraineeAnswerBox before answer key
   * Even if answer keys exist, exempted questions should not have trainee input
   */
  it("should NOT show trainee answer box above answer key for exempted question", async () => {
    const exemptedQuestionWithKeys: QuestionDetail = {
      id: "q-2",
      document_id: "DOC-1",
      section_id: 201,
      parent_id: null,
      sequence: 2, // 2xx.2
      content: "ส่วนประกอบและชิ้นส่วนในส่วนประกอบของระบบ",
      is_header: true,
      description: null,
      answer_type: "text",
      metadata: JSON.stringify({ useSubQuestions: false }),
      score: null,
      question_type: "exempted",
      group_score: null,
      display_text: "(ไม่ต้องอธิบาย)",
      is_group_header: false,
      is_scored: false,
      choices: [],
      references: [],
      children: [],
    };

    vi.mocked(invoke).mockImplementation(async (cmd) => {
      if (cmd === "get_document_questions_with_details") {
        return [exemptedQuestionWithKeys];
      }
      if (cmd === "get_question_answer_keys") {
        return [
          {
            id: 1,
            question_id: "q-2",
            sub_question_code: "",
            answer_key_text: "Reference answer for exempted question",
            is_required: false,
            order_index: 0,
          },
        ];
      }
      return null;
    });

    const { container } = render(
      <PqsSectionPreview200
        docId="DOC-1"
        sectionId={201}
        sectionNumber={200}
        title="Section 200"
        references={[]}
        sectionGroup={200}
        mode="qualifier"
      />
    );

    await waitFor(() => {
      // Should NOT render TraineeAnswerBox even though answer key exists
      // because question is exempted
      expect(
        container.querySelector('[data-testid*="trainee-answer-box"]')
      ).not.toBeInTheDocument();
    });
  });

  /**
   * Test: Trainee view should also respect exempted flag
   * Exempted questions should never show answer boxes in any mode
   */
  it("should NOT show answer box for exempted question in trainee view", async () => {
    const exemptedQuestion: QuestionDetail = {
      id: "q-2",
      document_id: "DOC-1",
      section_id: 201,
      parent_id: null,
      sequence: 2,
      content: "ส่วนประกอบและชิ้นส่วนในส่วนประกอบของระบบ",
      is_header: true,
      description: null,
      answer_type: "text",
      metadata: JSON.stringify({ useSubQuestions: false }),
      score: null,
      question_type: "exempted",
      group_score: null,
      display_text: "(ไม่ต้องอธิบาย)",
      is_group_header: false,
      is_scored: false,
      choices: [],
      references: [],
      children: [],
    };

    vi.mocked(invoke).mockImplementation(async (cmd) => {
      if (cmd === "get_document_questions_with_details") {
        return [exemptedQuestion];
      }
      if (cmd === "get_question_answer_keys") {
        return [];
      }
      return null;
    });

    const { container } = render(
      <PqsSectionPreview200
        docId="DOC-1"
        sectionId={201}
        sectionNumber={200}
        title="Section 200"
        references={[]}
        sectionGroup={200}
        mode="trainee" // ← Trainee view
      />
    );

    await waitFor(() => {
      expect(
        container.querySelector('[data-testid*="trainee-answer-box"]')
      ).not.toBeInTheDocument();
    });
  });

  /**
   * Test: L2 question (level 1, non-exempted, no children) SHOULD show fallback answer box
   * L2 questions are real questions — they require answers from trainees
   */
  it("should show fallback answer box for L2 non-exempted question in trainee mode", async () => {
    const l1Question: QuestionDetail = {
      id: "q-1",
      document_id: "DOC-1",
      section_id: 201,
      parent_id: null,
      sequence: 1, // L1 header
      content: "หน้าที่",
      is_header: true,
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
      children: [], // will be populated below
    };

    const l2Question: QuestionDetail = {
      id: "q-1-1",
      document_id: "DOC-1",
      section_id: 201,
      parent_id: "q-1",
      sequence: 1, // L2 question
      content: "ระบบนี้ทำหน้าที่อะไร",
      is_header: false,
      description: null,
      answer_type: "text",
      metadata: null,
      score: 10,
      question_type: "normal",
      group_score: null,
      display_text: null,
      is_group_header: false,
      is_scored: true,
      choices: [],
      references: [],
      children: [], // no children — eligible for fallback answer box
    };

    l1Question.children = [l2Question];

    vi.mocked(invoke).mockImplementation(async (cmd) => {
      if (cmd === "get_document_questions_with_details") {
        return [l1Question, l2Question];
      }
      if (cmd === "get_question_answer_keys") {
        return []; // No answer keys yet
      }
      return null;
    });

    const { container } = render(
      <PqsSectionPreview200
        docId="DOC-1"
        sectionId={201}
        sectionNumber={200}
        title="Section 200"
        references={[]}
        sectionGroup={200}
        mode="trainee"
      />
    );

    await waitFor(() => {
      // L2 question with no answer key and no children → should show fallback answer box
      expect(
        container.querySelector('[data-testid="trainee-answer-box-q-1-1-default"]')
      ).toBeInTheDocument();
    });
  });
});
