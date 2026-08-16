import { safeInvoke } from "./tauriService";
import type { ClearAnswersResult } from "../types";

export interface SimulationDocumentSummary {
  simulation_document_id: string;
  template_document_id: string;
  trainee_id: string;
  created_at: string;
  latest_activity_at: string;
  answered_count: number;
  assessed_count: number;
  passed_count: number;
  needs_improvement_count: number;
  attachment_count: number;
  progress_record_count: number;
  attachment_directory: string;
}

export const simulationService = {
  async listForTemplate(templateDocumentId: string): Promise<SimulationDocumentSummary[]> {
    return await safeInvoke("list_template_simulation_documents", {
      templateDocumentId,
    }) as SimulationDocumentSummary[];
  },

  async deleteSimulation(documentId: string): Promise<void> {
    await safeInvoke("delete_simulation_document", { documentId });
  },

  async clearAnswers(documentId: string): Promise<ClearAnswersResult> {
    return await safeInvoke("clear_simulation_document_answers", {
      documentId,
    }) as ClearAnswersResult;
  },

  async openAttachmentDirectory(relativePath: string): Promise<void> {
    await safeInvoke("open_path", { path: relativePath });
  },
};
