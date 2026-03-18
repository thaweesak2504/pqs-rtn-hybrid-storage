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
      await screen.findByText(/Section 300 policy: cannot change document branch after evaluation has started\./i),
    ).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("defaults sub-branch to ต้นแบบมาตรฐาน when main is set but sub is null", async () => {
    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if (command === "get_occupation_branches") {
        return [{ code: "1", name: "ต้นแบบมาตรฐาน" }];
      }
      if (command === "get_document_branch") {
        return { occupation_branch_main: "1", occupation_branch_sub: null };
      }
      if (command === "get_occupation_sub_branches") {
        return [
          { code: "1", branch_code: "1", name: "ต้นแบบมาตรฐาน" },
          { code: "2", branch_code: "1", name: "สาขาย่อยอื่น" },
        ];
      }
      return null;
    });

    const { container } = render(
      <EditMetadataModal
        isOpen
        onClose={vi.fn()}
        docId="DOC-NULL-SUB"
        initialName="Test Doc"
        initialAppliedTo="Test"
        initialDocType="10"
        initialUserLevel="2"
        onSuccess={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("get_occupation_sub_branches", { branchCode: "1" });
    });

    const selectNodes = container.querySelectorAll("select");
    const subSelect = selectNodes[3] as HTMLSelectElement;

    expect(subSelect.value).toBe("1");
  });

  // Career Branch Protection Tests
  describe("Career Branch Protection", () => {
    it("detects conflict when changing branch with existing SubQ usage", async () => {
      vi.mocked(invoke).mockImplementation(async (command: string, args?: any) => {
        if (command === "get_occupation_branches") {
          return [
            { code: "1", name: "ต้นแบบมาตรฐาน" },
            { code: "2", name: "สาขาใหม่" },
          ];
        }
        if (command === "get_document_branch") {
          return { occupation_branch_main: "1", occupation_branch_sub: "1" };
        }
        if (command === "get_occupation_sub_branches") {
          if (args?.branchCode === "1") {
            return [{ code: "1", branch_code: "1", name: "ต้นแบบมาตรฐาน" }];
          }
          if (args?.branchCode === "2") {
            return [{ code: "2", branch_code: "2", name: "สาขาย่อยใหม่" }];
          }
        }
        if (command === "check_career_branch_usage") {
          return {
            has_conflict: true,
            affected_question_count: 2,
            affected_section_groups: [200, 300],
          };
        }
        return null;
      });

      const { container } = render(
        <EditMetadataModal
          isOpen
          onClose={vi.fn()}
          docId="DOC-CONFLICT"
          initialName="Test Doc"
          initialAppliedTo="Test"
          initialDocType="10"
          initialUserLevel="2"
          onSuccess={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("get_document_branch", { docId: "DOC-CONFLICT" });
      });

      const selectNodes = container.querySelectorAll("select");
      const mainSelect = selectNodes[2] as HTMLSelectElement;

      // Change branch
      fireEvent.change(mainSelect, { target: { value: "2" } });

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("check_career_branch_usage", { docId: "DOC-CONFLICT" });
      });

      // Should show warning banner
      expect(await screen.findByText(/พบข้อมูล Sub-Question ที่ผูกกับสาขาเดิม 2 ข้อ/i)).toBeInTheDocument();
    });

    it("shows no conflict message when branch change has no SubQ usage", async () => {
      vi.mocked(invoke).mockImplementation(async (command: string, args?: any) => {
        if (command === "get_occupation_branches") {
          return [
            { code: "1", name: "ต้นแบบมาตรฐาน" },
            { code: "2", name: "สาขาใหม่" },
          ];
        }
        if (command === "get_document_branch") {
          return { occupation_branch_main: "1", occupation_branch_sub: "1" };
        }
        if (command === "get_occupation_sub_branches") {
          if (args?.branchCode === "2") {
            return [{ code: "2", branch_code: "2", name: "สาขาย่อยใหม่" }];
          }
          return [{ code: "1", branch_code: "1", name: "ต้นแบบมาตรฐาน" }];
        }
        if (command === "check_career_branch_usage") {
          return {
            has_conflict: false,
            affected_question_count: 0,
            affected_section_groups: [],
          };
        }
        return null;
      });

      const { container } = render(
        <EditMetadataModal
          isOpen
          onClose={vi.fn()}
          docId="DOC-NO-CONFLICT"
          initialName="Test Doc"
          initialAppliedTo="Test"
          initialDocType="10"
          initialUserLevel="2"
          onSuccess={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("get_document_branch", { docId: "DOC-NO-CONFLICT" });
      });

      const selectNodes = container.querySelectorAll("select");
      const mainSelect = selectNodes[2] as HTMLSelectElement;
      const subSelect = selectNodes[3] as HTMLSelectElement;

      // Change both main and sub branch
      fireEvent.change(mainSelect, { target: { value: "2" } });

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("get_occupation_sub_branches", { branchCode: "2" });
      });

      fireEvent.change(subSelect, { target: { value: "2" } });

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("check_career_branch_usage", { docId: "DOC-NO-CONFLICT" });
      });

      expect(await screen.findByText(/ไม่พบข้อมูลที่ขัดแย้ง — สามารถเปลี่ยนสาขาได้/i)).toBeInTheDocument();
    });

    it("shows confirmation dialog and calls reset_and_update_career_branch on confirm", async () => {
      const onSuccess = vi.fn();
      const onClose = vi.fn();

      vi.mocked(invoke).mockImplementation(async (command: string, args?: any) => {
        if (command === "get_occupation_branches") {
          return [
            { code: "1", name: "ต้นแบบมาตรฐาน" },
            { code: "2", name: "สาขาใหม่" },
          ];
        }
        if (command === "get_document_branch") {
          return { occupation_branch_main: "1", occupation_branch_sub: "1" };
        }
        if (command === "get_occupation_sub_branches") {
          if (args?.branchCode === "2") {
            return [{ code: "2", branch_code: "2", name: "สาขาย่อยใหม่" }];
          }
          return [{ code: "1", branch_code: "1", name: "ต้นแบบมาตรฐาน" }];
        }
        if (command === "check_career_branch_usage") {
          return {
            has_conflict: true,
            affected_question_count: 1,
            affected_section_groups: [200],
          };
        }
        if (command === "update_document") {
          return true;
        }
        if (command === "reset_and_update_career_branch") {
          expect(args).toEqual({
            docId: "DOC-RESET",
            newMain: "2",
            newSub: "2",
          });
          return {
            subq_links_deleted: 5,
            answer_keys_deleted: 3,
            user_answers_deleted: 2,
            questions_reset: 1,
          };
        }
        return null;
      });

      const { container } = render(
        <EditMetadataModal
          isOpen
          onClose={onClose}
          docId="DOC-RESET"
          initialName="Test Doc"
          initialAppliedTo="Test"
          initialDocType="10"
          initialUserLevel="2"
          onSuccess={onSuccess}
        />,
      );

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("get_document_branch", { docId: "DOC-RESET" });
      });

      const selectNodes = container.querySelectorAll("select");
      const mainSelect = selectNodes[2] as HTMLSelectElement;
      const subSelect = selectNodes[3] as HTMLSelectElement;

      // Change branch
      fireEvent.change(mainSelect, { target: { value: "2" } });

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("get_occupation_sub_branches", { branchCode: "2" });
      });

      fireEvent.change(subSelect, { target: { value: "2" } });

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("check_career_branch_usage", { docId: "DOC-RESET" });
      });

      // Click Save - should show confirmation dialog
      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

      // Should show confirmation dialog
      expect(await screen.findByText(/ยืนยันการเปลี่ยนสาขาอาชีพ/i)).toBeInTheDocument();
      expect(screen.getByText(/ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนได้/i)).toBeInTheDocument();

      // Click confirm button
      fireEvent.click(screen.getByRole("button", { name: /ยืนยัน เปลี่ยนสาขาและล้างข้อมูล/i }));

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("update_document", expect.any(Object));
        expect(invoke).toHaveBeenCalledWith("reset_and_update_career_branch", {
          docId: "DOC-RESET",
          newMain: "2",
          newSub: "2",
        });
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("reverts to original branch when user cancels confirmation dialog", async () => {
      const onSuccess = vi.fn();
      const onClose = vi.fn();

      vi.mocked(invoke).mockImplementation(async (command: string, args?: any) => {
        if (command === "get_occupation_branches") {
          return [
            { code: "1", name: "ต้นแบบมาตรฐาน" },
            { code: "2", name: "สาขาใหม่" },
          ];
        }
        if (command === "get_document_branch") {
          return { occupation_branch_main: "1", occupation_branch_sub: "1" };
        }
        if (command === "get_occupation_sub_branches") {
          if (args?.branchCode === "2") {
            return [{ code: "2", branch_code: "2", name: "สาขาย่อยใหม่" }];
          }
          return [{ code: "1", branch_code: "1", name: "ต้นแบบมาตรฐาน" }];
        }
        if (command === "check_career_branch_usage") {
          return {
            has_conflict: true,
            affected_question_count: 1,
            affected_section_groups: [200],
          };
        }
        return null;
      });

      const { container } = render(
        <EditMetadataModal
          isOpen
          onClose={onClose}
          docId="DOC-CANCEL"
          initialName="Test Doc"
          initialAppliedTo="Test"
          initialDocType="10"
          initialUserLevel="2"
          onSuccess={onSuccess}
        />,
      );

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("get_document_branch", { docId: "DOC-CANCEL" });
      });

      const selectNodes = container.querySelectorAll("select");
      const mainSelect = selectNodes[2] as HTMLSelectElement;
      const subSelect = selectNodes[3] as HTMLSelectElement;

      // Change branch
      fireEvent.change(mainSelect, { target: { value: "2" } });

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("get_occupation_sub_branches", { branchCode: "2" });
      });

      fireEvent.change(subSelect, { target: { value: "2" } });

      // Click Save
      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

      // Should show confirmation dialog
      expect(await screen.findByText(/ยืนยันการเปลี่ยนสาขาอาชีพ/i)).toBeInTheDocument();

      // Click cancel button
      fireEvent.click(screen.getByRole("button", { name: /ยกเลิก/i }));

      await waitFor(() => {
        // Confirmation dialog should close
        expect(screen.queryByText(/ยืนยันการเปลี่ยนสาขาอาชีพ/i)).not.toBeInTheDocument();
      });

      // Main branch should revert to original
      await waitFor(() => {
        expect(mainSelect.value).toBe("1");
      });

      // Should not call update functions
      expect(invoke).not.toHaveBeenCalledWith("update_document", expect.any(Object));
      expect(invoke).not.toHaveBeenCalledWith("reset_and_update_career_branch", expect.any(Object));
      expect(onSuccess).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it("uses normal update_document_branch when no conflict exists", async () => {
      const onSuccess = vi.fn();
      const onClose = vi.fn();

      vi.mocked(invoke).mockImplementation(async (command: string, args?: any) => {
        if (command === "get_occupation_branches") {
          return [
            { code: "1", name: "ต้นแบบมาตรฐาน" },
            { code: "2", name: "สาขาใหม่" },
          ];
        }
        if (command === "get_document_branch") {
          return { occupation_branch_main: "1", occupation_branch_sub: "1" };
        }
        if (command === "get_occupation_sub_branches") {
          if (args?.branchCode === "2") {
            return [{ code: "2", branch_code: "2", name: "สาขาย่อยใหม่" }];
          }
          return [{ code: "1", branch_code: "1", name: "ต้นแบบมาตรฐาน" }];
        }
        if (command === "check_career_branch_usage") {
          return {
            has_conflict: false,
            affected_question_count: 0,
            affected_section_groups: [],
          };
        }
        if (command === "update_document") {
          return true;
        }
        if (command === "update_document_branch") {
          expect(args).toEqual({
            docId: "DOC-NORMAL",
            branchMain: "2",
            branchSub: "2",
          });
          return true;
        }
        return null;
      });

      const { container } = render(
        <EditMetadataModal
          isOpen
          onClose={onClose}
          docId="DOC-NORMAL"
          initialName="Test Doc"
          initialAppliedTo="Test"
          initialDocType="10"
          initialUserLevel="2"
          onSuccess={onSuccess}
        />,
      );

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("get_document_branch", { docId: "DOC-NORMAL" });
      });

      const selectNodes = container.querySelectorAll("select");
      const mainSelect = selectNodes[2] as HTMLSelectElement;
      const subSelect = selectNodes[3] as HTMLSelectElement;

      fireEvent.change(mainSelect, { target: { value: "2" } });

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("get_occupation_sub_branches", { branchCode: "2" });
      });

      fireEvent.change(subSelect, { target: { value: "2" } });

      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("update_document", expect.any(Object));
        expect(invoke).toHaveBeenCalledWith("update_document_branch", {
          docId: "DOC-NORMAL",
          branchMain: "2",
          branchSub: "2",
        });
        expect(invoke).not.toHaveBeenCalledWith("reset_and_update_career_branch", expect.any(Object));
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
