import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React, { useState } from "react";
import WorkflowModal from "./WorkflowModal";

const WorkflowModalHarness: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div
      onKeyDown={(event) => {
        if (event.key === "Escape") event.stopPropagation();
      }}
    >
      <button type="button" onClick={() => setIsOpen(true)}>เปิด Modal</button>
      <button type="button">คำสั่งนอก Modal</button>
      <WorkflowModal
        isOpen={isOpen}
        title="ยืนยันการเปลี่ยนแปลง"
        message="รายละเอียดการดำเนินการ"
        onClose={() => setIsOpen(false)}
        actions={[
          { id: "continue", label: "แก้ไขต่อ", onSelect: () => setIsOpen(false) },
          { id: "discard", label: "ละทิ้งการแก้ไข", onSelect: () => setIsOpen(false), variant: "danger" },
        ]}
      />
    </div>
  );
};

describe("WorkflowModal focus lifecycle", () => {
  it("moves focus into the dialog and keeps Tab/Shift+Tab within its controls", async () => {
    render(<WorkflowModalHarness />);
    const trigger = screen.getByRole("button", { name: "เปิด Modal" });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "ยืนยันการเปลี่ยนแปลง" });
    const closeButton = screen.getByRole("button", { name: "ปิด" });
    const continueButton = screen.getByRole("button", { name: "แก้ไขต่อ" });
    const discardButton = screen.getByRole("button", { name: "ละทิ้งการแก้ไข" });

    await waitFor(() => expect(continueButton).toHaveFocus());
    expect(continueButton).toHaveClass("focus:ring-1", "focus:ring-blue-500");
    discardButton.focus();
    fireEvent.keyDown(discardButton, { key: "Tab" });
    expect(closeButton).toHaveFocus();
    fireEvent.keyDown(closeButton, { key: "Tab", shiftKey: true });
    expect(discardButton).toHaveFocus();
    expect(screen.queryByRole("button", { name: "ปิดหน้าต่าง" })).not.toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("closes on Escape and restores focus to the invoking control", async () => {
    render(<WorkflowModalHarness />);
    const trigger = screen.getByRole("button", { name: "เปิด Modal" });
    trigger.focus();
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole("button", { name: "แก้ไขต่อ" })).toHaveFocus());

    // Dispatch from a dialog action to prove a parent form cannot consume the
    // key before the document-capture modal handler receives it.
    fireEvent.keyDown(screen.getByRole("button", { name: "แก้ไขต่อ" }), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("recovers focus into the dialog when a WebView moves it outside", async () => {
    render(<WorkflowModalHarness />);
    const trigger = screen.getByRole("button", { name: "เปิด Modal" });
    const outsideButton = screen.getByRole("button", { name: "คำสั่งนอก Modal" });
    trigger.focus();
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole("button", { name: "แก้ไขต่อ" })).toHaveFocus());

    outsideButton.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(screen.getByRole("button", { name: "ปิด" })).toHaveFocus();

    outsideButton.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(screen.getByRole("button", { name: "ละทิ้งการแก้ไข" })).toHaveFocus();
  });

  it("renders a blocking warning action with readable amber contrast", () => {
    render(
      <WorkflowModal
        isOpen
        title="ยังบันทึกไม่ได้"
        message="กรุณาระบุคำเฉลย"
        onClose={() => undefined}
        actions={[
          {
            id: "go-to-answer-key",
            label: "ไปที่เฉลย ข.",
            variant: "warning",
            onSelect: () => undefined,
          },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "ไปที่เฉลย ข." })).toHaveClass(
      "bg-amber-500",
      "text-slate-950",
    );
  });

  it("focuses typed confirmation and enables the destructive action only for an exact match", async () => {
    const onConfirm = vi.fn();
    render(
      <WorkflowModal
        isOpen
        title="ล้างข้อมูล Trainee"
        message="ตรวจสอบขอบเขตก่อนล้าง"
        onClose={() => undefined}
        typedConfirmation={{
          expectedValue: "DOC-SIM-013",
          label: "พิมพ์รหัสรอบจำลองเพื่อยืนยัน",
          instruction: "พิมพ์ DOC-SIM-013 ให้ตรงกันทุกตัวอักษร",
        }}
        actions={[
          {
            id: "clear",
            label: "ล้างข้อมูล Trainee ของรอบนี้",
            variant: "danger",
            requiresTypedConfirmation: true,
            onSelect: onConfirm,
          },
        ]}
      />,
    );

    const input = screen.getByRole("textbox", { name: "พิมพ์รหัสรอบจำลองเพื่อยืนยัน" });
    const clearButton = screen.getByRole("button", { name: "ล้างข้อมูล Trainee ของรอบนี้" });
    await waitFor(() => expect(input).toHaveFocus());
    expect(clearButton).toBeDisabled();

    fireEvent.change(input, { target: { value: "DOC-SIM-01" } });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("รหัสที่พิมพ์ยังไม่ตรงกับรอบจำลอง")).toBeInTheDocument();
    expect(clearButton).toBeDisabled();

    fireEvent.change(input, { target: { value: "DOC-SIM-013" } });
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(clearButton).toBeEnabled();
    fireEvent.click(clearButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("blocks duplicate actions, Escape, and backdrop close while an action is pending", async () => {
    let resolveAction: (() => void) | undefined;
    const onClose = vi.fn();
    const onSelect = vi.fn(() => new Promise<void>((resolve) => {
      resolveAction = resolve;
    }));
    render(
      <WorkflowModal
        isOpen
        title="กำลังล้างข้อมูล"
        message="โปรดรอ"
        onClose={onClose}
        actions={[{ id: "clear", label: "ล้างข้อมูล", variant: "danger", onSelect }]}
      />,
    );

    const actionButton = screen.getByRole("button", { name: "ล้างข้อมูล" });
    fireEvent.click(actionButton);
    expect(screen.getByRole("button", { name: "กำลังดำเนินการ..." })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "กำลังดำเนินการ..." }));
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(document.querySelector("[data-workflow-backdrop]")!);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    resolveAction?.();
    await waitFor(() => expect(screen.getByRole("button", { name: "ล้างข้อมูล" })).toBeEnabled());
  });

  it("keeps an action failure in context with retry and copy-details controls", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const onSelect = vi.fn().mockRejectedValue(new Error("ทดสอบ backend failure"));
    render(
      <WorkflowModal
        isOpen
        title="ล้างข้อมูล Trainee"
        message="ตรวจสอบก่อนดำเนินการ"
        onClose={() => undefined}
        copyActionError
        actions={[
          {
            id: "clear",
            label: "ล้างข้อมูล",
            retryLabel: "ลองล้างอีกครั้ง",
            variant: "danger",
            onSelect,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "ล้างข้อมูล" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("ทดสอบ backend failure");
    expect(screen.getByRole("button", { name: "ลองล้างอีกครั้ง" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "คัดลอกรายละเอียด" }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining("ทดสอบ backend failure"));
      expect(screen.getByRole("status")).toHaveTextContent("คัดลอกรายละเอียดแล้ว");
    });
  });
});
