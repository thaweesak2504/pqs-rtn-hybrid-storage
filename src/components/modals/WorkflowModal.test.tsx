import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});
