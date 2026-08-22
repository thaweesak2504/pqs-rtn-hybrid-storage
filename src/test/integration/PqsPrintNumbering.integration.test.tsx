import { invoke } from "@tauri-apps/api/tauri";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PqsSectionPreview100 from "../../components/editor_v2/PqsSectionPreview100";
import PqsSectionPreview200 from "../../components/editor_v2/PqsSectionPreview200";
import PqsSectionPreview300 from "../../components/editor_v2/PqsSectionPreview300";
import { QuestionDetail } from "../../types/content";

const question = (overrides: Partial<QuestionDetail>): QuestionDetail => ({
  id: "question",
  document_id: "DOC-1",
  section_id: 101,
  parent_id: null,
  sequence: 1,
  content: "Question",
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
  ...overrides,
});

const expectArabicPrintNumbering = async (container: HTMLElement, expected: string[]) => {
  await waitFor(() => {
    const text = container.textContent || "";
    expected.forEach((number) => expect(text).toContain(number));
    expect(text).not.toMatch(/[๐-๙]/);
  });
};

describe("PQS Print Layout numbering", () => {
  let questions: QuestionDetail[] = [];

  beforeEach(() => {
    questions = [];
    vi.clearAllMocks();
    vi.mocked(invoke).mockImplementation(async (command) => {
      if (command === "get_document_questions_with_details") return questions;
      if (command === "get_document_branch") return {};
      if (command === "get_question_answer_keys") return [];
      return [];
    });
  });

  it("uses Arabic section and question numbers in Section 100", async () => {
    questions = [question({ id: "q-101", section_id: 101, content: "Section 100 question" })];

    const { container } = render(
      <PqsSectionPreview100
        docId="DOC-1"
        sectionId={101}
        sectionNumber={101}
        title="Section 101"
        references={[]}
        sectionGroup={100}
        mode="print"
      />,
    );

    await expectArabicPrintNumbering(container, ["101", "101.1"]);
  });

  it("uses Arabic numbers at both structural levels in Section 200", async () => {
    questions = [
      question({ id: "q-201-parent", section_id: 201, content: "Section 200 heading", is_header: true }),
      question({
        id: "q-201-child",
        section_id: 201,
        parent_id: "q-201-parent",
        content: "Section 200 question",
      }),
    ];

    const { container } = render(
      <PqsSectionPreview200
        docId="DOC-1"
        sectionId={201}
        sectionNumber={201}
        title="Section 201"
        references={[]}
        sectionGroup={200}
        mode="print"
      />,
    );

    await expectArabicPrintNumbering(container, ["201", "201.1", "201.1.1"]);
  });

  it("uses Arabic numbers in Section 300 and normalizes legacy Thai reference numbers", async () => {
    questions = [
      question({ id: "q-301-parent", section_id: 301, content: "Section 300 heading", is_header: true }),
      question({
        id: "q-301-child",
        section_id: 301,
        parent_id: "q-301-parent",
        content: "Section 300 question",
      }),
      question({
        id: "q-301-reference",
        section_id: 301,
        parent_id: "q-301-child",
        content: "Referenced section",
        metadata: JSON.stringify({ refSectionNumber: "๒๐๑" }),
      }),
    ];

    const { container } = render(
      <PqsSectionPreview300
        docId="DOC-1"
        sectionId={301}
        sectionNumber={301}
        title="Section 301"
      />,
    );

    await expectArabicPrintNumbering(container, ["301", "301.1", "301.1.1", "201"]);
  });
});
