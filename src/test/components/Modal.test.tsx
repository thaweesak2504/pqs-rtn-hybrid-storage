import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Modal from "../../components/ui/Modal";

describe("Modal", () => {
  it("does not render when closed", () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Hidden modal">
        Content
      </Modal>,
    );

    expect(screen.queryByText("Hidden modal")).not.toBeInTheDocument();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Keyboard modal">
        Content
      </Modal>,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when clicking close button", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Closable modal">
        Content
      </Modal>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on backdrop click when closeOnBackdrop is true", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal isOpen onClose={onClose} title="Backdrop modal">
        Content
      </Modal>,
    );

    const backdrop = container.querySelector(".bg-black\\/50");
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop as Element);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close on backdrop click when closeOnBackdrop is false", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal isOpen onClose={onClose} closeOnBackdrop={false} title="Strict modal">
        Content
      </Modal>,
    );

    const backdrop = container.querySelector(".bg-black\\/50");
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop as Element);

    expect(onClose).not.toHaveBeenCalled();
  });
});
