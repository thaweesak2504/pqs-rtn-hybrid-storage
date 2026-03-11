import { invoke } from "@tauri-apps/api/tauri";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DevProgressVerificationTable from "../../components/editor_v2/DevProgressVerificationTable";

describe("DevProgressVerificationTable", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
    vi.mocked(invoke).mockResolvedValue({
      total_questions_raw: 60,
      total_leaf_questions: 50,
      total_exempted: 3,
      total_required_questions: 47,
      total_with_answer_keys: 47,
      total_sub_questions: 12,
      total_answer_targets: 47,
      total_answers: 35,
      answers_assessed: 27,
      answers_passed: 22,
      answers_pending: 5,
      answers_needs_improvement: 8,
    });
  });

  it("renders รอประเมิน / รอดำเนินการ label (not รอตรวจ)", async () => {
    render(<DevProgressVerificationTable documentId="DOC-1" sectionId={301} />);

    fireEvent.click(screen.getByText("Developer Verification Metrics"));

    expect(await screen.findByText("รอประเมิน / รอดำเนินการ")).toBeInTheDocument();
    expect(screen.queryByText("รอตรวจ")).not.toBeInTheDocument();
  });

  it("shows expanded verification metrics values", async () => {
    render(<DevProgressVerificationTable documentId="DOC-1" sectionId={301} />);

    fireEvent.click(screen.getByText("Developer Verification Metrics"));

    expect(await screen.findByText("ความคืบหน้าการตรวจ")).toBeInTheDocument();
    expect(screen.getByText("คำถามที่ต้องประเมินจริง")).toBeInTheDocument();
    expect(screen.getAllByText("47").length).toBeGreaterThan(0);
    expect(screen.getByText("22")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("re-fetches metrics when refresh button is clicked", async () => {
    render(<DevProgressVerificationTable documentId="DOC-1" sectionId={301} />);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByTitle("Refresh Metrics"));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledTimes(2);
    });
  });
});
