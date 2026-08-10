import { safeInvoke } from "./tauriService";

export interface CreatorAnswerKeyInput {
  subCode: string;
  text: string;
  isRequired: boolean;
}

export interface CreatorMappingImpactItem {
  subQuestionCode: string;
  label: string | null;
  answerKeyCount: number;
  traineeAnswerCount: number;
  assessedAnswerCount: number;
  attachmentCount: number;
  progressRecordCount: number;
}

export interface CreatorMappingImpactReport {
  questionId: string;
  removedCodes: string[];
  items: CreatorMappingImpactItem[];
  answerKeyCount: number;
  traineeAnswerCount: number;
  assessedAnswerCount: number;
  attachmentCount: number;
  progressRecordCount: number;
  requiresConfirmation: boolean;
  isBlocked: boolean;
}

export const creatorQuestionService = {
  async analyzeChange(args: {
    questionId: string;
    documentId: string;
    proposedSubQuestionCodes: string[];
    proposedAnswerKeys: CreatorAnswerKeyInput[];
  }): Promise<CreatorMappingImpactReport> {
    return await safeInvoke("analyze_creator_question_change", { args }) as CreatorMappingImpactReport;
  },
};
