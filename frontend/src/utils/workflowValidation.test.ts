import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import { hasValidationErrors, validateWorkflow } from "./workflowValidation";
import type { MachineNodeData } from "../types";

type FlowNode = Node<MachineNodeData, "machine">;

function node(id: string, overrides: Partial<MachineNodeData> = {}): FlowNode {
  return {
    id,
    type: "machine",
    position: { x: 0, y: 0 },
    data: {
      stepKey: id,
      label: id,
      stepKind: "process",
      stepType: "extrusion",
      machineId: "machine-1",
      plannedDurationMin: 30,
      ...overrides,
    },
  };
}

describe("validateWorkflow", () => {
  it("returns error for empty workflow", () => {
    const issues = validateWorkflow([], [], "extrusion");
    expect(issues.some((i) => i.level === "error")).toBe(true);
    expect(hasValidationErrors(issues)).toBe(true);
  });

  it("detects missing machine on process step", () => {
    const nodes = [node("extrusion", { machineId: undefined })];
    const issues = validateWorkflow(nodes, [], "extrusion");
    expect(issues.some((i) => i.message.includes("requires a machine"))).toBe(true);
  });

  it("warns about unreachable nodes", () => {
    const nodes = [node("extrusion"), node("orphan", { stepKind: "completion", stepType: "spooling", machineId: undefined })];
    const edges: Edge[] = [];
    const issues = validateWorkflow(nodes, edges, "extrusion");
    expect(issues.some((i) => i.level === "warning" && i.message.includes("unreachable"))).toBe(true);
    expect(hasValidationErrors(issues)).toBe(false);
  });

  it("passes valid connected workflow", () => {
    const nodes = [node("extrusion"), node("testing", { stepKind: "quality_inspection", stepType: null, machineId: undefined })];
    const edges: Edge[] = [{ id: "e1", source: "extrusion", target: "testing" }];
    const issues = validateWorkflow(nodes, edges, "extrusion");
    expect(hasValidationErrors(issues)).toBe(false);
  });
});
