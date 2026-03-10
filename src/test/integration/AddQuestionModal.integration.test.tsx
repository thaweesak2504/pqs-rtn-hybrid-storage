import { invoke } from "@tauri-apps/api/tauri";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AddQuestionModal from "../../components/modals/AddQuestionModal";

describe("AddQuestionModal integration", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  it("shows normalized section 300 answer-key policy error", async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if (command === "get_section_references") {
        return [];
      }

      if (command === "create_question") {
        return true;
      }

      if (command === "replace_question_answer_keys") {
        throw new Error("Answer keys not supported for section group 300");
      }

      return null;
    });

    render(
      <AddQuestionModal
        isOpen
        onClose={onClose}
        sectionId={301}
        docId="DOC-300"
        onSuccess={onSuccess}
        nextSeq={1}
        sectionNumber={301}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("พิมพ์รายละเอียดคำถามที่นี่..."), {
      target: { value: "Section 300 question content" },
    });

    fireEvent.change(screen.getByPlaceholderText("พิมพ์คำตอบที่ถูกต้องที่นี่..."), {
      target: { value: "Restricted answer key" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save question/i }));

    expect(
      await screen.findByText("Section 300 policy: answer keys are not allowed for this flow."),
    ).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows normalized section 300 reference policy error", async () => {
    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if (command === "get_section_references") {
        return [];
      }

      if (command === "create_question") {
        throw new Error("References are not supported in section group 300");
      }

      return null;
    });

    render(
      <AddQuestionModal
        isOpen
        onClose={vi.fn()}
        sectionId={301}
        docId="DOC-300"
        onSuccess={vi.fn()}
        nextSeq={2}
        sectionNumber={301}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("พิมพ์รายละเอียดคำถามที่นี่..."), {
      target: { value: "Section 300 question content" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save question/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Section 300 policy: references are not allowed for this flow."),
      ).toBeInTheDocument();
    });
  });
});
