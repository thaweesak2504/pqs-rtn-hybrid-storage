import type { DeleteAnswerResult } from "../types";
import { safeInvoke } from "./tauriService";

export interface DeleteTraineeAnswerArgs {
  userId: string;
  questionId: string;
  documentId: string;
  subQuestionCode: string;
}

export const traineeAnswerService = {
  async deleteAnswer(args: DeleteTraineeAnswerArgs): Promise<DeleteAnswerResult> {
    return await safeInvoke("delete_trainee_answer", { ...args }) as DeleteAnswerResult;
  },
};
