import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PqsHeader from "../../components/editor_v2/PqsHeader";

describe("PqsHeader integration", () => {
  it("hides title pencil and prevents title edit when onTitleChange is undefined", () => {
    render(
      <PqsHeader
        section="101"
        title="ข้อควรระมัดระวังอันตรายพื้นฐาน Safety Fundamentals"
        subTitle="Safety Precautions"
        readOnly={false}
      />,
    );

    const titleText = screen.getByText(/ข้อควรระมัดระวังอันตรายพื้นฐาน Safety Fundamentals/i);
    const titleWrapper = titleText.parentElement as HTMLElement;
    expect(titleWrapper.className).not.toContain("cursor-pointer");

    fireEvent.click(titleText);

    expect(screen.queryByPlaceholderText("Enter title...")).not.toBeInTheDocument();
  });

  it("shows title pencil and allows title edit when onTitleChange is provided", () => {
    const onTitleChange = vi.fn();
    render(
      <PqsHeader
        section="105"
        title="หัวข้อปกติ"
        subTitle="Normal Section"
        readOnly={false}
        onTitleChange={onTitleChange}
      />,
    );

    const titleText = screen.getByText("หัวข้อปกติ");
    const titleWrapper = titleText.parentElement as HTMLElement;
    expect(titleWrapper.className).toContain("cursor-pointer");

    fireEvent.click(titleText);

    expect(screen.getByPlaceholderText("Enter title...")).toBeInTheDocument();
  });
});
