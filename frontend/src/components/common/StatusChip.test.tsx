import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StatusChip from "./StatusChip";

describe("StatusChip", () => {
  it("renders formatted machine status", () => {
    render(<StatusChip status="running" variant="machine" />);
    expect(screen.getByText("Running")).toBeInTheDocument();
  });

  it("renders order status variant", () => {
    render(<StatusChip status="in_progress" variant="order" />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });
});
