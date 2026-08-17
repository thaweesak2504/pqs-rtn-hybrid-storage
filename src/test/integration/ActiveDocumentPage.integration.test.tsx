import { invoke } from "@tauri-apps/api/tauri";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ActiveDocumentPage from "../../components/pages/ActiveDocumentPage";
import { AuthContext } from "../../contexts/AuthContext";
import { ToastProvider } from "../../contexts/ToastContext";
import type { ClearAnswersResult } from "../../types";

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
  const successfulClearResult: ClearAnswersResult = {
    documentId: "DOC-DEL-101",
    database: {
      answerRowsDeleted: 3,
      assessedAnswerRowsDeleted: 1,
      progressRowsDeleted: 2,
      referencedAttachmentPathCount: 2,
      invalidAttachmentMetadataRows: 0,
      committed: true,
    },
    attachments: {
      logicalDirectory: "data/DOC-DEL-101/trainee-attachments",
      dataDirectoryAvailable: true,
      cleanupAttempted: true,
      directoryFound: true,
      managedFilesFound: 2,
      managedFilesDeleted: 2,
      managedFilesRetained: 0,
      managedFilesMissing: 0,
      cleanupComplete: true,
      failures: [],
    },
  };

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
  let simulationInfoState: null | {
    simulation_document_id: string;
    template_document_id: string;
    trainee_id: string;
  } = null;
  let clearAnswersResponse: ClearAnswersResult = successfulClearResult;
  let clearAnswersFailuresRemaining = 0;

  beforeEach(() => {
    simulationInfoState = null;
    clearAnswersResponse = successfulClearResult;
    clearAnswersFailuresRemaining = 0;
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

      if (command === "get_simulation_document_info") {
        return simulationInfoState;
      }

      if (command === "list_template_simulation_documents") {
        return [];
      }

      if (command === "delete_section") {
        sectionsState = sectionsState.filter((s) => s.id !== args?.id);
        return null;
      }

      if (command === "clear_simulation_document_answers") {
        if (clearAnswersFailuresRemaining > 0) {
          clearAnswersFailuresRemaining -= 1;
          throw new Error("database busy for test");
        }
        return clearAnswersResponse;
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

  it("exposes Introduction item 2 editing only in the Source Creator view", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Introduction" }));
    expect(await screen.findByRole("button", { name: "แก้ไขการประยุกต์ใช้" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /View As/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Visitor (Questions Only)" }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "แก้ไขการประยุกต์ใช้" })).not.toBeInTheDocument();
    });
  });

  it("requires the active Simulation ID and presents authoritative clear results", async () => {
    simulationInfoState = {
      simulation_document_id: "DOC-DEL-101",
      template_document_id: "DOC-TEMPLATE",
      trainee_id: "T-001",
    };
    renderPage();

    await screen.findByRole("button", { name: /101 Precautions/i });
    const viewAsButton = screen.getByRole("button", { name: /View As/i });
    fireEvent.click(viewAsButton);
    fireEvent.click(await screen.findByRole("button", { name: "ล้างคำตอบของรอบจำลอง" }));

    expect(await screen.findByRole("dialog", { name: "ล้างข้อมูล Trainee ของรอบจำลอง" })).toBeInTheDocument();
    expect(screen.getByText("ข้อมูลที่จะลบ")).toBeInTheDocument();
    expect(screen.getByText("ข้อมูลที่เก็บไว้")).toBeInTheDocument();
    expect(screen.getByText("Questions และ Answer Keys")).toBeInTheDocument();
    const confirmationInput = screen.getByRole("textbox", { name: "พิมพ์รหัสรอบจำลองเพื่อยืนยัน" });
    const clearButton = screen.getByRole("button", { name: "ล้างข้อมูล Trainee ของรอบนี้" });
    await waitFor(() => expect(confirmationInput).toHaveFocus());
    expect(clearButton).toBeDisabled();

    fireEvent.change(confirmationInput, { target: { value: "DOC-DEL-10" } });
    expect(clearButton).toBeDisabled();
    fireEvent.change(confirmationInput, { target: { value: "DOC-DEL-101" } });
    expect(clearButton).toBeEnabled();
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("clear_simulation_document_answers", {
        documentId: "DOC-DEL-101",
      });
    });

    expect(await screen.findByRole("dialog", { name: "ล้างข้อมูล Trainee เรียบร้อย" })).toBeInTheDocument();
    expect(screen.getByText("คำตอบที่ลบ").parentElement).toHaveTextContent("3");
    expect(screen.getByText("รายการที่เคยประเมิน").parentElement).toHaveTextContent("1");
    expect(screen.getByText("Progress ที่ลบ").parentElement).toHaveTextContent("2");
    expect(screen.getByText("ไฟล์ที่ลบ").parentElement).toHaveTextContent("2");
    expect(screen.getByText("ฐานข้อมูลและการล้างไฟล์แนบเสร็จสมบูรณ์")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "ปิดผลการล้าง" }));
    await waitFor(() => expect(viewAsButton).toHaveFocus());
    expect(viewAsButton).toHaveClass("focus:ring-1", "focus:ring-blue-500");
  });

  it("keeps the clear context for retry after a backend failure", async () => {
    simulationInfoState = {
      simulation_document_id: "DOC-DEL-101",
      template_document_id: "DOC-TEMPLATE",
      trainee_id: "T-001",
    };
    clearAnswersFailuresRemaining = 1;
    renderPage();

    await screen.findByRole("button", { name: /101 Precautions/i });
    fireEvent.click(screen.getByRole("button", { name: /View As/i }));
    fireEvent.click(await screen.findByRole("button", { name: "ล้างคำตอบของรอบจำลอง" }));
    const confirmationInput = screen.getByRole("textbox", { name: "พิมพ์รหัสรอบจำลองเพื่อยืนยัน" });
    fireEvent.change(confirmationInput, { target: { value: "DOC-DEL-101" } });
    fireEvent.click(screen.getByRole("button", { name: "ล้างข้อมูล Trainee ของรอบนี้" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("database busy for test");
    expect(confirmationInput).toHaveValue("DOC-DEL-101");
    expect(screen.getByRole("button", { name: "คัดลอกรายละเอียด" })).toBeInTheDocument();
    const retryButton = screen.getByRole("button", { name: "ลองล้างอีกครั้ง" });
    fireEvent.click(retryButton);

    expect(await screen.findByRole("dialog", { name: "ล้างข้อมูล Trainee เรียบร้อย" })).toBeInTheDocument();
    expect(vi.mocked(invoke).mock.calls.filter(([command]) => command === "clear_simulation_document_answers")).toHaveLength(2);
  });

  it("reports partial attachment cleanup separately from committed database deletion", async () => {
    simulationInfoState = {
      simulation_document_id: "DOC-DEL-101",
      template_document_id: "DOC-TEMPLATE",
      trainee_id: "T-001",
    };
    clearAnswersResponse = {
      ...successfulClearResult,
      attachments: {
        ...successfulClearResult.attachments,
        managedFilesFound: 1,
        managedFilesDeleted: 1,
        managedFilesMissing: 1,
        cleanupComplete: false,
        failures: [{
          logicalPath: "data/DOC-DEL-101/trainee-attachments/missing.pdf",
          message: "Managed attachment file was not found",
        }],
      },
    };
    renderPage();

    await screen.findByRole("button", { name: /101 Precautions/i });
    fireEvent.click(screen.getByRole("button", { name: /View As/i }));
    fireEvent.click(await screen.findByRole("button", { name: "ล้างคำตอบของรอบจำลอง" }));
    fireEvent.change(screen.getByRole("textbox", { name: "พิมพ์รหัสรอบจำลองเพื่อยืนยัน" }), {
      target: { value: "DOC-DEL-101" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ล้างข้อมูล Trainee ของรอบนี้" }));

    expect(await screen.findByRole("dialog", { name: "ล้างข้อมูลแล้ว แต่ไฟล์บางส่วนต้องตรวจสอบ" })).toBeInTheDocument();
    expect(screen.getByText("ฐานข้อมูลล้างสำเร็จแล้ว แต่ไฟล์แนบบางส่วนต้องตรวจสอบเพิ่มเติม")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "รายการไฟล์ที่ต้องตรวจสอบ" })).toHaveTextContent("missing.pdf");
    expect(screen.getByRole("button", { name: "คัดลอกรายละเอียด" })).toBeInTheDocument();
  });
});
