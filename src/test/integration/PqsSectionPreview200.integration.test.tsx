import { invoke } from "@tauri-apps/api/tauri";
import { render, waitFor } from "@testing-library/react";
import React from "react";
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
   * Test: Non-exempted L1 question (2xx.1) SHOULD show answer box
   * Scenario: Section 200 Trainee view, L1 normal question without answer keys
   * Note: showAnswerKey = false for trainee mode, so fallback answer box will render
   */
  it("should show fallback answer box for non-exempted L1 question (2xx.1) in trainee view", async () => {
    const normalQuestion: QuestionDetail = {
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
      question_type: "normal", // ← Not exempted
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
        return [normalQuestion];
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
        mode="trainee" // ← Trainee mode (showAnswerKey = false)
      />
    );

    await waitFor(() => {
      // Should render the fallback TraineeAnswerBox for non-exempted question
      expect(
        container.querySelector('[data-testid="trainee-answer-box-q-1-default"]')
      ).toBeInTheDocument();
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
});
