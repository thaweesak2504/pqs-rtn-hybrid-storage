import { beforeEach, describe, expect, it, vi } from "vitest";
import { introductionService } from "../../services/introductionService";
import { safeInvoke } from "../../services/tauriService";

vi.mock("../../services/tauriService", () => ({
  safeInvoke: vi.fn(),
}));

describe("introductionService", () => {
  beforeEach(() => {
    vi.mocked(safeInvoke).mockReset();
  });

  it("uses the narrow applied-to command and returns its authoritative value", async () => {
    vi.mocked(safeInvoke).mockResolvedValue({
      documentId: "22730203001",
      appliedTo: "ผู้ปฏิบัติหน้าที่ทดสอบ",
    });

    const result = await introductionService.updateAppliedTo({
      documentId: "22730203001",
      appliedTo: "ผู้ปฏิบัติหน้าที่ทดสอบ",
    });

    expect(safeInvoke).toHaveBeenCalledWith("update_document_applied_to", {
      args: {
        documentId: "22730203001",
        appliedTo: "ผู้ปฏิบัติหน้าที่ทดสอบ",
      },
    });
    expect(result).toEqual({
      documentId: "22730203001",
      appliedTo: "ผู้ปฏิบัติหน้าที่ทดสอบ",
    });
  });
});
