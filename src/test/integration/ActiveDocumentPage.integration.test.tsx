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
      {
        id: 102,
        document_id: "DOC-DEL-101",
        section_group: 100,
        section_number: 102,
        title: "",
        title_th: "Section 102",
        menu_label: "102 User Section",
        display_order: 2,
        is_system_defined: false,
        created_at: "",
        updated_at: null,
      },
    ];

    vi.mocked(invoke).mockReset();
    vi.mocked(invoke).mockImplementation(async (command: string, args?: Record<string, unknown>) => {
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

  const renderPage = () => render(
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

  it("protects section 101 and other system-defined sections in edit mode", async () => {
    renderPage();

    const section101Button = await screen.findByRole("button", { name: /101 Precautions/i });
    const section201Button = await screen.findByRole("button", { name: /201 System/i });
    const section102Button = await screen.findByRole("button", { name: /102 User Section/i });

    expect(section101Button.querySelector('[aria-label="Protected section"]')).toBeTruthy();
    expect(section201Button.querySelector('[aria-label="Protected section"]')).toBeTruthy();
    expect(section101Button.parentElement?.querySelector('button[title="Delete section"]')).toBeNull();
    expect(section201Button.parentElement?.querySelector('button[title="Delete section"]')).toBeNull();

    const deleteButton = section102Button.parentElement?.querySelector('button[title="Delete section"]') as HTMLButtonElement | null;
    expect(deleteButton).toBeTruthy();
    fireEvent.click(deleteButton!);
    fireEvent.click(await screen.findByRole("button", { name: "ลบส่วนนี้" }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("delete_section", { id: 102 });
    });
    expect(invoke).not.toHaveBeenCalledWith("delete_section", { id: 101 });
  });

  it("hides delete controls outside edit mode", async () => {
    renderPage();

    const section102Button = await screen.findByRole("button", { name: /102 User Section/i });
    expect(section102Button.parentElement?.querySelector('button[title="Delete section"]')).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /View As/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Visitor (Questions Only)" }));

    await waitFor(() => {
      expect(section102Button.parentElement?.querySelector('button[title="Delete section"]')).toBeNull();
    });
  });

  it("clears answers only for the active document", async () => {
    renderPage();

    await screen.findByRole("button", { name: /101 Precautions/i });
    fireEvent.click(screen.getByRole("button", { name: /View As/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Clear Answers (Current Document)" }));

    expect(await screen.findByText("ยืนยันการลบคำตอบ")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ลบคำตอบของเล่มนี้" }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("clear_document_trainee_answers", {
        documentId: "DOC-DEL-101",
      });
    });
  });
});
