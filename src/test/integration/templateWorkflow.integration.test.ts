import { invoke } from "@tauri-apps/api/tauri";
import { beforeEach, describe, expect, it, vi } from "vitest";

type QuestionType = "standard" | "exempted";

interface WorkflowQuestion {
  id: string;
  sectionId: number;
  parentId: string | null;
  sequence: number;
  questionType: QuestionType;
  isGroupHeader: boolean;
  isScored: boolean;
  score: number;
  groupScore: number;
}

interface WorkflowSection {
  id: number;
  documentId: string;
  sectionGroup: 100 | 200 | 300;
  sectionNumber: number;
  totalScore: number;
}

interface WorkflowDocument {
  id: string;
  occupationBranchMain: string | null;
  occupationBranchSub: string | null;
}

class FakeTemplateBackend {
  private documentCounter = 0;
  private sectionCounter = 0;
  private questionCounter = 0;

  private readonly documents = new Map<string, WorkflowDocument>();
  private readonly sections = new Map<number, WorkflowSection>();
  private readonly questionsById = new Map<string, WorkflowQuestion>();

  async handle(command: string, payload?: any): Promise<any> {
    switch (command) {
      case "create_new_document":
        return this.createDocument();
      case "create_section":
        return this.createSection(payload?.request);
      case "get_document_branch":
        return this.getDocumentBranch(payload?.docId);
      case "update_document_branch":
        return this.updateDocumentBranch(payload);
      case "get_section_questions":
        return this.getSectionQuestions(payload?.sectionId);
      case "update_question_score":
        return this.updateQuestionScore(payload?.args);
      case "get_section_total_score":
        return this.getSectionTotalScore(payload?.sectionId);
      default:
        throw new Error(`Unsupported command in workflow test: ${command}`);
    }
  }

  private createDocument(): WorkflowDocument {
    this.documentCounter += 1;
    const id = `doc-${this.documentCounter}`;
    const doc: WorkflowDocument = {
      id,
      occupationBranchMain: null,
      occupationBranchSub: null,
    };
    this.documents.set(id, doc);
    return doc;
  }

  private createSection(request: {
    document_id: string;
    section_group: 100 | 200 | 300;
    section_number: number;
  }): WorkflowSection {
    this.sectionCounter += 1;
    const section: WorkflowSection = {
      id: this.sectionCounter,
      documentId: request.document_id,
      sectionGroup: request.section_group,
      sectionNumber: request.section_number,
      totalScore: 0,
    };
    this.sections.set(section.id, section);

    if (section.sectionGroup === 300) {
      this.seedSection300Template(section.id);
      this.recalculateSectionTotal(section.id);
    }

    return section;
  }

  private seedSection300Template(sectionId: number): void {
    const l1Ids: string[] = [];

    for (let sequence = 1; sequence <= 7; sequence += 1) {
      const isExemptedGroup = sequence >= 2 && sequence <= 5;
      const l1 = this.insertQuestion({
        sectionId,
        parentId: null,
        sequence,
        questionType: isExemptedGroup ? "exempted" : "standard",
        isGroupHeader: true,
        isScored: false,
      });
      l1Ids.push(l1.id);
    }

    for (let seq = 1; seq <= 5; seq += 1) {
      this.insertQuestion({
        sectionId,
        parentId: l1Ids[0],
        sequence: seq,
        questionType: "standard",
        isGroupHeader: false,
        isScored: seq >= 4,
      });
    }

    for (let seq = 1; seq <= 2; seq += 1) {
      this.insertQuestion({
        sectionId,
        parentId: l1Ids[6],
        sequence: seq,
        questionType: "standard",
        isGroupHeader: false,
        isScored: false,
      });
    }
  }

  private insertQuestion(args: {
    sectionId: number;
    parentId: string | null;
    sequence: number;
    questionType: QuestionType;
    isGroupHeader: boolean;
    isScored: boolean;
  }): WorkflowQuestion {
    this.questionCounter += 1;
    const question: WorkflowQuestion = {
      id: `q-${this.questionCounter}`,
      sectionId: args.sectionId,
      parentId: args.parentId,
      sequence: args.sequence,
      questionType: args.questionType,
      isGroupHeader: args.isGroupHeader,
      isScored: args.isScored,
      score: 0,
      groupScore: 0,
    };
    this.questionsById.set(question.id, question);
    return question;
  }

  private getDocumentBranch(docId: string) {
    const doc = this.documents.get(docId);
    if (!doc) {
      throw new Error(`Document not found: ${docId}`);
    }

    return {
      occupation_branch_main: doc.occupationBranchMain,
      occupation_branch_sub: doc.occupationBranchSub,
    };
  }

  private updateDocumentBranch(payload: {
    docId: string;
    branchMain: string | null;
    branchSub: string | null;
  }) {
    const doc = this.documents.get(payload.docId);
    if (!doc) {
      throw new Error(`Document not found: ${payload.docId}`);
    }

    doc.occupationBranchMain = payload.branchMain;
    doc.occupationBranchSub = payload.branchSub;

    return this.getDocumentBranch(payload.docId);
  }

  private getSectionQuestions(sectionId: number): WorkflowQuestion[] {
    return Array.from(this.questionsById.values())
      .filter((q) => q.sectionId === sectionId)
      .sort((a, b) => {
        if (a.parentId === b.parentId) {
          return a.sequence - b.sequence;
        }
        if (a.parentId === null) return -1;
        if (b.parentId === null) return 1;
        return a.parentId.localeCompare(b.parentId);
      });
  }

  private updateQuestionScore(args: {
    id: string;
    score: number;
    is_scored: boolean;
    question_type: QuestionType;
  }): WorkflowQuestion {
    const question = this.questionsById.get(args.id);
    if (!question) {
      throw new Error(`Question not found: ${args.id}`);
    }

    question.score = args.score;
    question.isScored = args.is_scored;
    question.questionType = args.question_type;

    this.recalculateParentChain(question.parentId);
    this.recalculateSectionTotal(question.sectionId);

    return question;
  }

  private recalculateParentChain(parentId: string | null): void {
    let currentParentId = parentId;

    while (currentParentId) {
      const parent = this.questionsById.get(currentParentId);
      if (!parent) {
        break;
      }

      const childQuestions = Array.from(this.questionsById.values()).filter(
        (q) => q.parentId === currentParentId
      );

      let nextGroupScore = 0;
      for (const child of childQuestions) {
        if (child.questionType === "exempted") {
          continue;
        }

        if (child.isGroupHeader) {
          nextGroupScore += child.groupScore;
        } else if (child.isScored) {
          nextGroupScore += child.score;
        }
      }

      parent.groupScore = nextGroupScore;
      currentParentId = parent.parentId;
    }
  }

  private recalculateSectionTotal(sectionId: number): void {
    const section = this.sections.get(sectionId);
    if (!section) {
      throw new Error(`Section not found: ${sectionId}`);
    }

    const l1Questions = Array.from(this.questionsById.values()).filter(
      (q) => q.sectionId === sectionId && q.parentId === null
    );

    let total = 0;
    for (const q of l1Questions) {
      if (q.questionType === "exempted") {
        continue;
      }

      if (q.isGroupHeader) {
        total += q.groupScore;
      } else if (q.isScored) {
        total += q.score;
      }
    }

    section.totalScore = total;
  }

  private getSectionTotalScore(sectionId: number): number {
    const section = this.sections.get(sectionId);
    if (!section) {
      throw new Error(`Section not found: ${sectionId}`);
    }
    return section.totalScore;
  }
}

describe("template workflow integration", () => {
  let backend: FakeTemplateBackend;

  beforeEach(() => {
    backend = new FakeTemplateBackend();
    vi.mocked(invoke).mockImplementation((command: string, args?: any) => {
      return backend.handle(command, args);
    });
  });

  it("creates section 300 template with expected exempted groups", async () => {
    const doc = await invoke<{ id: string }>("create_new_document", {
      args: {
        name: "Phase C Workflow",
      },
    });

    const section = await invoke<WorkflowSection>("create_section", {
      request: {
        document_id: doc.id,
        section_group: 300,
        section_number: 301,
      },
    });

    const questions = await invoke<WorkflowQuestion[]>("get_section_questions", {
      sectionId: section.id,
    });

    const l1 = questions.filter((q) => q.parentId === null);

    expect(l1).toHaveLength(7);
    expect(l1.filter((q) => q.questionType === "exempted").map((q) => q.sequence)).toEqual([2, 3, 4, 5]);
  });

  it("persists document branch selection for section 300 workflow", async () => {
    const doc = await invoke<{ id: string }>("create_new_document", {
      args: {
        name: "Branch Workflow",
      },
    });

    const before = await invoke<{ occupation_branch_main: string | null; occupation_branch_sub: string | null }>(
      "get_document_branch",
      { docId: doc.id }
    );

    expect(before.occupation_branch_main).toBeNull();
    expect(before.occupation_branch_sub).toBeNull();

    await invoke("update_document_branch", {
      docId: doc.id,
      branchMain: "02",
      branchSub: "01",
    });

    const after = await invoke<{ occupation_branch_main: string | null; occupation_branch_sub: string | null }>(
      "get_document_branch",
      { docId: doc.id }
    );

    expect(after).toEqual({
      occupation_branch_main: "02",
      occupation_branch_sub: "01",
    });
  });

  it("propagates score cascade from 3xx.1 children and validates section total", async () => {
    const doc = await invoke<{ id: string }>("create_new_document", {
      args: {
        name: "Cascade Workflow",
      },
    });

    const section = await invoke<WorkflowSection>("create_section", {
      request: {
        document_id: doc.id,
        section_group: 300,
        section_number: 301,
      },
    });

    const questions = await invoke<WorkflowQuestion[]>("get_section_questions", {
      sectionId: section.id,
    });

    const l1Prereq = questions.find((q) => q.parentId === null && q.sequence === 1);
    expect(l1Prereq).toBeTruthy();

    const scoredChildren = questions
      .filter((q) => q.parentId === l1Prereq?.id)
      .filter((q) => q.sequence === 4 || q.sequence === 5);

    expect(scoredChildren).toHaveLength(2);

    await invoke("update_question_score", {
      args: {
        id: scoredChildren[0].id,
        score: 15,
        is_scored: true,
        question_type: "standard",
      },
    });

    await invoke("update_question_score", {
      args: {
        id: scoredChildren[1].id,
        score: 20,
        is_scored: true,
        question_type: "standard",
      },
    });

    const updatedQuestions = await invoke<WorkflowQuestion[]>("get_section_questions", {
      sectionId: section.id,
    });

    const updatedL1Prereq = updatedQuestions.find((q) => q.id === l1Prereq?.id);
    expect(updatedL1Prereq?.groupScore).toBe(35);

    const totalScore = await invoke<number>("get_section_total_score", {
      sectionId: section.id,
    });

    expect(totalScore).toBe(35);

    const l2Subtotal = scoredChildren.reduce((sum, child) => {
      const updated = updatedQuestions.find((q) => q.id === child.id);
      return sum + (updated?.score ?? 0);
    }, 0);

    expect(l2Subtotal).toBe(35);
    expect(totalScore).toBe(l2Subtotal);
  });
});
