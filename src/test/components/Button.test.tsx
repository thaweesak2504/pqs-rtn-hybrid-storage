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
    render(<Button loading>Loading</Button>);

    const button = screen.getByRole("button", { name: "Loading" });
    expect(button).toBeDisabled();
    expect(button.querySelector("svg.animate-spin")).toBeTruthy();
  });

  it("renders icon on right when iconPosition is right", () => {
    render(
      <Button icon={<span data-testid="icon">I</span>} iconPosition="right">
        Next
      </Button>,
    );

    const button = screen.getByRole("button");
    const content = button.querySelector("div");
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(content?.lastElementChild?.textContent).toBe("I");
  });
});
