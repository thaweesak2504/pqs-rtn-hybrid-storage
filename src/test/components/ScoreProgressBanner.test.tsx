import { invoke } from "@tauri-apps/api/tauri";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ScoreProgressBanner from "../../components/editor_v2/ScoreProgressBanner";

describe("ScoreProgressBanner", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  it("renders pending label as รอประเมิน (not รอตรวจ)", async () => {
    vi.mocked(invoke).mockResolvedValue({
      earned_score: 12,
      max_score: 20,
      completion_percentage: 60,
      is_passed: false,
      passing_score: 100,
      total_questions: 10,
      answered_questions: 8,
      passed_questions: 5,
      pending_with_answer: 2,
      needs_improvement_questions: 1,
    });

    render(<ScoreProgressBanner documentId="DOC-1" sectionId={301} sectionGroup={300} />);

    expect(await screen.findByText("รอประเมิน:")).toBeInTheDocument();
    expect(screen.queryByText("รอตรวจ:")).not.toBeInTheDocument();
  });

  it("renders ผ่าน, ปรับปรุง, ส่งคำตอบ, คะแนนสะสม labels", async () => {
    vi.mocked(invoke).mockResolvedValue({
      earned_score: 12,
      max_score: 20,
      completion_percentage: 60,
      is_passed: false,
      passing_score: 100,
      total_questions: 10,
      answered_questions: 8,
      passed_questions: 5,
      pending_with_answer: 2,
      needs_improvement_questions: 1,
    });

    render(<ScoreProgressBanner documentId="DOC-1" sectionId={201} sectionGroup={200} />);

    expect(await screen.findByText("คะแนนสะสม:")).toBeInTheDocument();
    expect(screen.getByText("ส่งคำตอบ:")).toBeInTheDocument();
    expect(screen.getByText("ผ่าน:")).toBeInTheDocument();
    expect(screen.getByText("ปรับปรุง:")).toBeInTheDocument();
  });

  it("renders headline and progress values with Arabic numerals", async () => {
    vi.mocked(invoke).mockResolvedValue({
      earned_score: 12,
      max_score: 20,
      completion_percentage: 60,
      is_passed: false,
      passing_score: 100,
      total_questions: 10,
      answered_questions: 8,
      passed_questions: 5,
      pending_with_answer: 2,
      needs_improvement_questions: 1,
    });

    render(<ScoreProgressBanner documentId="DOC-1" sectionId={101} sectionGroup={100} />);

    expect(await screen.findByText("12/20")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("renders count mode values correctly for all counters", async () => {
    vi.mocked(invoke).mockResolvedValue({
      earned_score: 0,
      max_score: 0,
      completion_percentage: 0,
      is_passed: false,
      passing_score: 100,
      total_questions: 10,
      answered_questions: 8,
      passed_questions: 5,
      pending_with_answer: 2,
      needs_improvement_questions: 1,
    });

    render(<ScoreProgressBanner documentId="DOC-1" sectionId={301} sectionGroup={300} />);

    expect(await screen.findByText("คะแนน:")).toBeInTheDocument();
    expect(screen.getByText("8/10")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("derives needs improvement when value is not provided", async () => {
    vi.mocked(invoke).mockResolvedValue({
      earned_score: 0,
      max_score: 0,
      completion_percentage: 0,
      is_passed: false,
      passing_score: 100,
      total_questions: 10,
      answered_questions: 8,
      passed_questions: 5,
      pending_with_answer: 2,
    });

    render(<ScoreProgressBanner documentId="DOC-1" sectionId={302} sectionGroup={300} />);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalled();
    });

    expect(await screen.findByText("1")).toBeInTheDocument();
  });
});
