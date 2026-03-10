import { invoke } from "@tauri-apps/api/tauri";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EditMetadataModal from "../../components/modals/EditMetadataModal";

describe("EditMetadataModal integration", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  it("loads document branch and related sub-branches when opened", async () => {
    vi.mocked(invoke).mockImplementation(async (command: string, args?: any) => {
      if (command === "get_occupation_branches") {
        return [
          { code: "02", name: "Mechanical" },
          { code: "03", name: "Electrical" },
        ];
      }

      if (command === "get_document_branch") {
        expect(args).toEqual({ docId: "DOC-1" });
        return {
          occupation_branch_main: "02",
          occupation_branch_sub: "01",
        };
      }

      if (command === "get_occupation_sub_branches") {
        expect(args).toEqual({ branchCode: "02" });
        return [
          { code: "01", branch_code: "02", name: "Engine Room" },
          { code: "02", branch_code: "02", name: "Pump Control" },
        ];
      }

      return null;
    });

    const { container } = render(
      <EditMetadataModal
        isOpen
        onClose={vi.fn()}
        docId="DOC-1"
        initialName="PQS Main"
        initialAppliedTo="Engine Team"
        initialDocType="10"
        initialUserLevel="2"
        onSuccess={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("get_occupation_branches");
      expect(invoke).toHaveBeenCalledWith("get_document_branch", { docId: "DOC-1" });
      expect(invoke).toHaveBeenCalledWith("get_occupation_sub_branches", { branchCode: "02" });
    });

    const selectNodes = container.querySelectorAll("select");
    const mainSelect = selectNodes[2] as HTMLSelectElement;
    const subSelect = selectNodes[3] as HTMLSelectElement;

    expect(mainSelect.value).toBe("02");
    expect(subSelect.value).toBe("01");
  });

  it("submits metadata and selected branch payload", async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    vi.mocked(invoke).mockImplementation(async (command: string, args?: any) => {
      if (command === "get_occupation_branches") {
        return [
          { code: "02", name: "Mechanical" },
          { code: "03", name: "Electrical" },
        ];
      }

      if (command === "get_document_branch") {
        return {
          occupation_branch_main: "02",
          occupation_branch_sub: "01",
        };
      }

      if (command === "get_occupation_sub_branches") {
        if (args?.branchCode === "03") {
          return [{ code: "04", branch_code: "03", name: "Generator" }];
        }
        return [{ code: "01", branch_code: "02", name: "Engine Room" }];
      }

      if (command === "update_document") {
        expect(args).toEqual({
          args: {
            id: "DOC-2",
            name: "Updated PQS",
            applied_to: "Updated Team",
            doc_type: "20",
            user_level: "3",
          },
        });
        return true;
      }

      if (command === "update_document_branch") {
        expect(args).toEqual({
          docId: "DOC-2",
          branchMain: "03",
          branchSub: "04",
        });
        return true;
      }

      return null;
    });

    const { container } = render(
      <EditMetadataModal
        isOpen
        onClose={onClose}
        docId="DOC-2"
        initialName="Old PQS"
        initialAppliedTo="Old Team"
        initialDocType="10"
        initialUserLevel="2"
        onSuccess={onSuccess}
      />,
    );

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("get_document_branch", { docId: "DOC-2" });
    });

    fireEvent.change(screen.getByLabelText(/Document Name/i), {
      target: { value: "Updated PQS" },
    });

    fireEvent.change(screen.getByLabelText(/Applied To/i), {
      target: { value: "Updated Team" },
    });

    fireEvent.change(screen.getByLabelText("ประเภทเอกสาร (Type)"), {
      target: { value: "20" },
    });

    fireEvent.change(screen.getByLabelText("ระดับชั้นผู้ใช้ (User Level)"), {
      target: { value: "3" },
    });

    const selectNodes = container.querySelectorAll("select");
    const mainSelect = selectNodes[2] as HTMLSelectElement;
    const subSelect = selectNodes[3] as HTMLSelectElement;

    fireEvent.change(mainSelect, {
      target: { value: "03" },
    });

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("get_occupation_sub_branches", { branchCode: "03" });
    });

    fireEvent.change(subSelect, {
      target: { value: "04" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("update_document", {
        args: {
          id: "DOC-2",
          name: "Updated PQS",
          applied_to: "Updated Team",
          doc_type: "20",
          user_level: "3",
        },
      });
      expect(invoke).toHaveBeenCalledWith("update_document_branch", {
        docId: "DOC-2",
        branchMain: "03",
        branchSub: "04",
      });
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows branch-lock error when backend blocks branch update", async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    vi.mocked(invoke).mockImplementation(async (command: string, args?: any) => {
      if (command === "get_occupation_branches") {
        return [{ code: "02", name: "Mechanical" }];
      }

      if (command === "get_document_branch") {
        return {
          occupation_branch_main: "02",
          occupation_branch_sub: "01",
        };
      }

      if (command === "get_occupation_sub_branches") {
        return [{ code: "01", branch_code: "02", name: "Engine Room" }];
      }

      if (command === "update_document") {
        expect(args).toEqual({
          args: {
            id: "DOC-LOCK",
            name: "Locked PQS",
            applied_to: "Locked Team",
            doc_type: "10",
            user_level: "2",
          },
        });
        return true;
      }

      if (command === "update_document_branch") {
        throw new Error("Cannot change document branch after evaluation has started");
      }

      return null;
    });

    render(
      <EditMetadataModal
        isOpen
        onClose={onClose}
        docId="DOC-LOCK"
        initialName="Locked PQS"
        initialAppliedTo="Locked Team"
        initialDocType="10"
        initialUserLevel="2"
        onSuccess={onSuccess}
      />,
    );

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("get_document_branch", { docId: "DOC-LOCK" });
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(
      await screen.findByText(/Failed to update: Error: Cannot change document branch after evaluation has started/i),
    ).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
