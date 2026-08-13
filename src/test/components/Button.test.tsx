import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Button from "../../components/ui/Button";

describe("Button", () => {
  it("renders children and calls onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });
    fireEvent.click(button);

    expect(button).toBeInTheDocument();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when loading is true", () => {
    render(<Button loading loadingText="Saving...">Loading</Button>);

    const button = screen.getByRole("button", { name: "Saving..." });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("data-state", "loading");
    expect(button.querySelector("svg.animate-spin")).toBeTruthy();
    expect(button.querySelector("svg.animate-spin")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders icon on right when iconPosition is right", () => {
    render(
      <Button icon={<span data-testid="icon">I</span>} iconPosition="right">
        Next
      </Button>,
    );

    const button = screen.getByRole("button");
    const content = button.querySelector("span");
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(content?.lastElementChild?.textContent).toBe("I");
  });

  it("forwards its ref and provides the shared restrained focus treatment", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Focus target</Button>);

    ref.current?.focus();
    expect(ref.current).toHaveFocus();
    expect(ref.current).toHaveClass("focus:ring-1", "focus:ring-blue-500", "focus:ring-offset-1");
    expect(ref.current).not.toHaveClass("focus:ring-0");
  });
});
