import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SimulationListModal from "../../components/modals/SimulationListModal";
import { simulationService, type SimulationDocumentSummary } from "../../services/simulationService";

vi.mock("../../services/simulationService", () => ({
  simulationService: {
    listForTemplate: vi.fn(),
    deleteSimulation: vi.fn(),
    openAttachmentDirectory: vi.fn(),
  },
}));

const sim004: SimulationDocumentSummary = {
  simulation_document_id: "22724201001-SIM-004",
  template_document_id: "22724201001",
  trainee_id: "T-001",
  created_at: "2026-08-09 11:00:00",
  latest_activity_at: "2026-08-09 11:50:00",
  answered_count: 2,
  assessed_count: 1,
  passed_count: 0,
  needs_improvement_count: 1,
  attachment_count: 2,
  progress_record_count: 1,
  attachment_directory: "data/22724201001-SIM-004/trainee-attachments",
};

describe("SimulationListModal integration", () => {
  beforeEach(() => {
    vi.mocked(simulationService.listForTemplate).mockReset().mockResolvedValue([sim004]);
    vi.mocked(simulationService.deleteSimulation).mockReset().mockResolvedValue(undefined);
    vi.mocked(simulationService.openAttachmentDirectory).mockReset().mockResolvedValue(undefined);
  });

  it("shows the real copy count, work summary, storage path, and opens a selected simulation", async () => {
    const onOpenSimulation = vi.fn();
    const onCountChange = vi.fn();
    render(
      <SimulationListModal
        isOpen
        templateDocumentId="22724201001"
        onClose={vi.fn()}
        onOpenSimulation={onOpenSimulation}
        onCountChange={onCountChange}
      />,
    );

    expect(await screen.findByText("มีรอบจำลองที่ยังอยู่จริง 1 รอบ")).toBeInTheDocument();
    expect(screen.getByText("22724201001-SIM-004")).toBeInTheDocument();
    expect(screen.getByText("ต้องปรับปรุง")).toBeInTheDocument();
    expect(screen.getByTitle(sim004.attachment_directory)).toHaveTextContent(sim004.attachment_directory);
    expect(onCountChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole("button", { name: "เปิดโฟลเดอร์ไฟล์" }));
    expect(simulationService.openAttachmentDirectory).toHaveBeenCalledWith(sim004.attachment_directory);

    fireEvent.click(screen.getByRole("button", { name: "เปิดรอบนี้" }));
    expect(onOpenSimulation).toHaveBeenCalledWith("22724201001-SIM-004");
  });

  it("deletes only after confirmation and reloads the existing-copy count", async () => {
    vi.mocked(simulationService.listForTemplate)
      .mockResolvedValueOnce([sim004])
      .mockResolvedValueOnce([]);
    const onCountChange = vi.fn();
    render(
      <SimulationListModal
        isOpen
        templateDocumentId="22724201001"
        onClose={vi.fn()}
        onOpenSimulation={vi.fn()}
        onCountChange={onCountChange}
      />,
    );

    await screen.findByText("22724201001-SIM-004");
    fireEvent.click(screen.getByRole("button", { name: "ลบ" }));
    expect(await screen.findByText("ลบรอบจำลองที่เลือก")).toBeInTheDocument();
    expect(simulationService.deleteSimulation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "ลบรอบนี้" }));
    await waitFor(() => {
      expect(simulationService.deleteSimulation).toHaveBeenCalledWith("22724201001-SIM-004");
      expect(onCountChange).toHaveBeenLastCalledWith(0);
    });
    expect(await screen.findByText("ยังไม่มีรอบจำลองที่เก็บอยู่")).toBeInTheDocument();
  });
});
