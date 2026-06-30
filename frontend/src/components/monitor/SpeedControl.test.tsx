import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SpeedControl from "./SpeedControl";

describe("SpeedControl", () => {
  it("renders preset speed buttons", () => {
    render(<SpeedControl speedMultiplier={1} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "1x" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "5x" })).toBeInTheDocument();
  });

  it("calls onChange when preset clicked", () => {
    const onChange = vi.fn();
    render(<SpeedControl speedMultiplier={1} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "2x" }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("disables controls when disabled", () => {
    render(<SpeedControl speedMultiplier={1} onChange={vi.fn()} disabled />);
    expect(screen.getByRole("button", { name: "1x" })).toBeDisabled();
    expect(screen.getByRole("slider")).toBeDisabled();
  });
});
