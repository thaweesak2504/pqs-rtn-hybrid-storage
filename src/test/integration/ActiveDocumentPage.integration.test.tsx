import { invoke } from "@tauri-apps/api/tauri";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ActiveDocumentPage from "../../components/pages/ActiveDocumentPage";
import { AuthContext } from "../../contexts/AuthContext";
import { ToastProvider } from "../../contexts/ToastContext";

const mockAuthValue = {
  user: { id: '1', username: 'test', email: 'test@test.com', name: 'Test', role: 'admin' },
  isAuthenticated: true,
  isLoading: false,
  signIn: vi.fn().mockResolvedValue({ success: true }),
  signOut: vi.fn(),
  checkAuthStatus: vi.fn(),
  updateAvatar: vi.fn(),
  markPasswordChanged: vi.fn(),
};

describe("ActiveDocumentPage integration", () => {
  type MockSection = {
    id: number;
    document_id: string;
    section_group: number;
    section_number: number;
    title: string;
    title_th?: string;
    menu_label: string;
    display_order: number;
    is_system_defined: boolean;
    created_at: string;
    updated_at: string | null;
  };

  let sectionsState: MockSection[] = [];

  beforeEach(() => {
    sectionsState = [
      {
        id: 101,
        document_id: "DOC-DEL-101",
        section_group: 100,
        section_number: 101,
        title: "",
        title_th: "ข้อควรระมัดระวังอันตรายพื้นฐาน Safety Fundamentals",
        menu_label: "101 Precautions",
        display_order: 1,
        is_system_defined: true,
        created_at: "",
        updated_at: null,
      },
      {
        id: 201,
        document_id: "DOC-DEL-101",
        section_group: 200,
        section_number: 201,
        title: "",
        title_th: "Section 201",
        menu_label: "201 System",
        display_order: 1,
        is_system_defined: true,
        created_at: "",
        updated_at: null,
      },
    ];

    vi.mocked(invoke).mockReset();
    vi.mocked(invoke).mockImplementation(async (command: string, args?: any) => {
      if (command === "get_document_with_hierarchy") {
        return {
          document: {
            id: "DOC-DEL-101",
            name: "Delete Flow Test",
            applied_to: "Test Unit",
            doc_type: "20",
            user_level: "1",
            updated_at: "2026-03-14T00:00:00Z",
            created_at: "2026-03-14T00:00:00Z",
          },
          hierarchy: ["Unit A", "Sub Unit B"],
        };
      }

      if (command === "get_sections_by_document") {
        return sectionsState;
      }

      if (command === "get_document_branch") {
        return {
          occupation_branch_main: null,
          occupation_branch_sub: null,
        };
      }

      if (command === "delete_section") {
        sectionsState = sectionsState.filter((s) => s.id !== args?.id);
        return null;
      }

      return null;
    });
  });

  it("allows deleting section 101 and refreshes sidebar", async () => {
    render(
      <AuthContext.Provider value={mockAuthValue}>
        <ToastProvider>
          <MemoryRouter initialEntries={["/editor/DOC-DEL-101"]}>
            <Routes>
              <Route path="/editor/:docId" element={<ActiveDocumentPage />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>,
    );

    const section101Button = await screen.findByRole("button", { name: /101 Precautions/i });
    const section201Button = await screen.findByRole("button", { name: /201 System/i });

    // Section 101 is deletable now, so lock icon should not appear for this item.
    expect(section101Button).not.toHaveTextContent("🔒");
    // Other system-defined sections remain locked.
    expect(section201Button).toHaveTextContent("🔒");

    const row = section101Button.parentElement;
    const deleteButton = row?.querySelector('button[title="Delete section"]') as HTMLButtonElement | null;
    expect(deleteButton).toBeTruthy();

    fireEvent.click(deleteButton!);

    expect(await screen.findByText("ยืนยันการลบส่วน (Section)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "ลบส่วนนี้" }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("delete_section", { id: 101 });
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /101 Precautions/i })).not.toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /201 System/i })).toBeInTheDocument();
  });
});
