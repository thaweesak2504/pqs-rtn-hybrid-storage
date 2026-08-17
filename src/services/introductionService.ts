import type {
  UpdateDocumentAppliedToArgs,
  UpdateDocumentAppliedToResult,
} from "../types";
import { safeInvoke } from "./tauriService";

export const introductionService = {
  async updateAppliedTo(
    args: UpdateDocumentAppliedToArgs,
  ): Promise<UpdateDocumentAppliedToResult> {
    return await safeInvoke("update_document_applied_to", { args }) as UpdateDocumentAppliedToResult;
  },
};
