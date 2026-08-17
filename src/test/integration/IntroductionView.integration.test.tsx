import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { introductionService } from "../../services/introductionService";
import IntroductionView from "../../components/views/IntroductionView";

vi.mock("../../services/introductionService", () => ({
  introductionService: {
    updateAppliedTo: vi.fn(),
  },
}));

const baseProps = {
  documentId: "22730203001",
  appliedTo: "ผู้ปฏิบัติหน้าที่เดิม",
  viewMode: "edit" as const,
  isSimulation: false,
};

const IntroductionHarness = () => {
  const [appliedTo, setAppliedTo] = useState(baseProps.appliedTo);
  return (
    <IntroductionView
      {...baseProps}
      appliedTo={appliedTo}
      onAppliedToUpdated={setAppliedTo}
    />
  );
};

describe("IntroductionView applied-to workflow", () => {
  beforeEach(() => {
    vi.mocked(introductionService.updateAppliedTo).mockReset();
  });

  it("offers one focused edit command only for a Creator Source Document", () => {
    render(<IntroductionView {...baseProps} />);

    expect(screen.getByRole("button", { name: "แก้ไขการประยุกต์ใช้" })).toBeInTheDocument();
    expect(screen.getAllByText("ข้อมูลเฉพาะเอกสาร")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /แก้ไขมาตรฐานกำลังพล/ })).not.toBeInTheDocument();
  });

  it.each([
    ["qualifier", false],
    ["trainee", false],
    ["visitor", false],
    ["print", true],
  ] as const)("keeps %s mode read-only", (viewMode, isPreviewMode) => {
    render(
      <IntroductionView
        {...baseProps}
        viewMode={viewMode}
        isPreviewMode={isPreviewMode}
      />,
    );

    expect(screen.queryByRole("button", { name: "แก้ไขการประยุกต์ใช้" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "การประยุกต์ใช้" })).not.toBeInTheDocument();
  });

  it("keeps an edit-mode Simulation read-only", () => {
    render(<IntroductionView {...baseProps} isSimulation />);

    expect(screen.queryByRole("button", { name: "แก้ไขการประยุกต์ใช้" })).not.toBeInTheDocument();
  });

  it("does not carry an unsaved draft into another document", async () => {
    const { rerender } = render(<IntroductionView {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: "แก้ไขการประยุกต์ใช้" }));
    fireEvent.change(screen.getByRole("textbox", { name: "การประยุกต์ใช้" }), {
      target: { value: "Draft ของเอกสารเดิม" },
    });

    rerender(
      <IntroductionView
        {...baseProps}
        documentId="22730203002"
        appliedTo="ผู้ปฏิบัติหน้าที่เอกสารใหม่"
      />,
    );

    await waitFor(() => {
      expect(screen.queryByRole("textbox", { name: "การประยุกต์ใช้" })).not.toBeInTheDocument();
    });
    expect(screen.getByText(/มาตรฐานกำลังพล เล่มนี้ ใช้กับ ผู้ปฏิบัติหน้าที่เอกสารใหม่/)).toBeInTheDocument();
    expect(screen.queryByText("Draft ของเอกสารเดิม")).not.toBeInTheDocument();
  });

  it("moves focus into the field and clean Cancel restores the invoking command", async () => {
    render(<IntroductionView {...baseProps} />);
    const command = screen.getByRole("button", { name: "แก้ไขการประยุกต์ใช้" });

    fireEvent.click(command);
    const field = screen.getByRole("textbox", { name: "การประยุกต์ใช้" });
    expect(field).toHaveFocus();
    expect(field).toHaveAccessibleDescription(/ข้อมูลเฉพาะเอกสารและต้องไม่เว้นว่าง/);
    expect(screen.getByRole("button", { name: "บันทึก" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));
    await waitFor(() => expect(
      screen.getByRole("button", { name: "แก้ไขการประยุกต์ใช้" }),
    ).toHaveFocus());
    expect(screen.queryByRole("textbox", { name: "การประยุกต์ใช้" })).not.toBeInTheDocument();
  });

  it("guards a dirty Cancel, lets Escape return to the draft, and restores focus after discard", async () => {
    render(<IntroductionView {...baseProps} />);
    const command = screen.getByRole("button", { name: "แก้ไขการประยุกต์ใช้" });
    fireEvent.click(command);
    const field = screen.getByRole("textbox", { name: "การประยุกต์ใช้" });
    fireEvent.change(field, { target: { value: "ข้อความฉบับแก้ไข" } });

    expect(screen.getByText("มีการแก้ไขที่ยังไม่ได้บันทึก")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));
    expect(screen.getByRole("dialog", { name: "การแก้ไขยังไม่ได้บันทึก" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "แก้ไขต่อ" })).toHaveFocus());

    fireEvent.keyDown(screen.getByRole("button", { name: "แก้ไขต่อ" }), { key: "Escape" });
    await waitFor(() => expect(field).toHaveFocus());
    expect(field).toHaveValue("ข้อความฉบับแก้ไข");

    fireEvent.keyDown(field, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "ละทิ้งการแก้ไข" }));
    await waitFor(() => expect(
      screen.getByRole("button", { name: "แก้ไขการประยุกต์ใช้" }),
    ).toHaveFocus());
    expect(screen.getByText(/มาตรฐานกำลังพล เล่มนี้ ใช้กับ ผู้ปฏิบัติหน้าที่เดิม/)).toBeInTheDocument();
  });

  it("saves with physical KeyS on a Thai layout and announces the result", async () => {
    vi.mocked(introductionService.updateAppliedTo).mockResolvedValue({
      documentId: baseProps.documentId,
      appliedTo: "ผู้ปฏิบัติหน้าที่ใหม่",
    });
    render(<IntroductionHarness />);
    const command = screen.getByRole("button", { name: "แก้ไขการประยุกต์ใช้" });
    fireEvent.click(command);
    const field = screen.getByRole("textbox", { name: "การประยุกต์ใช้" });
    fireEvent.change(field, { target: { value: "  ผู้ปฏิบัติหน้าที่ใหม่  " } });

    fireEvent.keyDown(field, { key: "ห", code: "KeyS", ctrlKey: true });

    await waitFor(() => {
      expect(introductionService.updateAppliedTo).toHaveBeenCalledWith({
        documentId: baseProps.documentId,
        appliedTo: "ผู้ปฏิบัติหน้าที่ใหม่",
      });
    });
    await waitFor(() => expect(
      screen.getByRole("button", { name: "แก้ไขการประยุกต์ใช้" }),
    ).toHaveFocus());
    expect(screen.getByText("บันทึกการประยุกต์ใช้แล้ว")).toBeInTheDocument();
    expect(screen.getByText(/มาตรฐานกำลังพล เล่มนี้ ใช้กับ ผู้ปฏิบัติหน้าที่ใหม่/)).toBeInTheDocument();
  });

  it("links blank validation to the field and keeps the draft open", async () => {
    render(<IntroductionView {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: "แก้ไขการประยุกต์ใช้" }));
    const field = screen.getByRole("textbox", { name: "การประยุกต์ใช้" });
    fireEvent.change(field, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "บันทึก" }));

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("กรุณาระบุข้อความการประยุกต์ใช้ก่อนบันทึก");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription(/กรุณาระบุข้อความการประยุกต์ใช้ก่อนบันทึก/);
    expect(field).toHaveFocus();
    expect(introductionService.updateAppliedTo).not.toHaveBeenCalled();
  });

  it("keeps the draft and linked error available when the backend rejects Save", async () => {
    vi.mocked(introductionService.updateAppliedTo).mockRejectedValue(new Error("source document required"));
    render(<IntroductionView {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: "แก้ไขการประยุกต์ใช้" }));
    const field = screen.getByRole("textbox", { name: "การประยุกต์ใช้" });
    fireEvent.change(field, { target: { value: "ข้อความที่ต้องคงไว้" } });
    fireEvent.click(screen.getByRole("button", { name: "บันทึก" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("source document required");
    expect(field).toHaveValue("ข้อความที่ต้องคงไว้");
    expect(field).toHaveFocus();
  });
});
