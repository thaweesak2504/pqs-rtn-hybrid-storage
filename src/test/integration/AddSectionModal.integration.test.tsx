import { invoke } from "@tauri-apps/api/tauri";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AddSectionModal from "../../components/modals/AddSectionModal";

describe("AddSectionModal integration", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  it("blocks section 101 for section group 100", async () => {
    render(
      <AddSectionModal
        isOpen
        onClose={vi.fn()}
        documentId="DOC-100"
        sectionGroup={100}
        existingNumbers={[]}
        onSuccess={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "101" },
    });

    expect(await screen.findByText("Section 101 is system-defined and auto-created")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Section" })).toBeDisabled();
  });

  it("creates section 300 with expected payload and callbacks", async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    vi.mocked(invoke).mockResolvedValue({ id: 301 });

    render(
      <AddSectionModal
        isOpen
        onClose={onClose}
        documentId="DOC-300"
        sectionGroup={300}
        existingNumbers={[302]}
        onSuccess={onSuccess}
      />,
    );

    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "301" },
    });

    fireEvent.change(screen.getByPlaceholderText(/Gunner Mate Watch Station/i), {
      target: { value: "การปฏิบัติหน้าที่ในตำแหน่ง" },
    });

    fireEvent.change(screen.getByPlaceholderText("เช่น Gunner Mate"), {
      target: { value: "Gunner Mate" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Section" }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("create_section", {
        request: {
          document_id: "DOC-300",
          section_group: 300,
          section_number: 301,
          title_th: "การปฏิบัติหน้าที่ในตำแหน่ง",
          menu_label: "301 Gunner Mate",
        },
      });
    });

    expect(onSuccess).toHaveBeenCalledWith(301);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
