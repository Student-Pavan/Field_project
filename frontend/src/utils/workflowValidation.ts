import type { Edge, Node } from "@xyflow/react";
import type { MachineNodeData, ValidationIssue } from "../types";

type WorkflowFlowNode = Node<MachineNodeData, "machine">;

function bfsReachable(entryKey: string, edges: Edge[]): Set<string> {
  const reachable = new Set<string>([entryKey]);
  const queue = [entryKey];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      if (edge.source === current && !reachable.has(edge.target)) {
        reachable.add(edge.target);
        queue.push(edge.target);
      }
    }
  }
  return reachable;
}

export function validateWorkflow(
  nodes: WorkflowFlowNode[],
  edges: Edge[],
  entryStepKey: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const keys = nodes.map((n) => n.id);

  if (nodes.length === 0) {
    issues.push({ level: "error", message: "Workflow is empty — add at least one step" });
    return issues;
  }

  if (new Set(keys).size !== keys.length) {
    issues.push({ level: "error", message: "Duplicate step keys detected" });
  }

  if (!keys.includes(entryStepKey)) {
    issues.push({ level: "error", message: "Entry step must exist on the canvas" });
  }

  for (const node of nodes) {
    if (node.data.stepKind === "process" && !node.data.machineId) {
      issues.push({
        level: "error",
        message: `Process step "${node.data.label}" requires a machine`,
        nodeId: node.id,
      });
    }
    if (node.data.stepKind === "process" && !node.data.stepType) {
      issues.push({
        level: "error",
        message: `Process step "${node.data.label}" requires a step type`,
        nodeId: node.id,
      });
    }
    if (!/^[a-z0-9_]+$/.test(node.id)) {
      issues.push({
        level: "error",
        message: `Step key "${node.id}" must be lowercase letters, numbers, and underscores only`,
        nodeId: node.id,
      });
    }
  }

  for (const edge of edges) {
    if (!keys.includes(edge.target)) {
      issues.push({
        level: "error",
        message: `Edge targets missing step "${edge.target}"`,
        nodeId: edge.source,
      });
    }
    if (!keys.includes(edge.source)) {
      issues.push({
        level: "error",
        message: `Edge from missing step "${edge.source}"`,
        nodeId: edge.source,
      });
    }
  }

  if (entryStepKey && keys.includes(entryStepKey)) {
    const reachable = bfsReachable(entryStepKey, edges);
    for (const node of nodes) {
      if (!reachable.has(node.id)) {
        issues.push({
          level: "warning",
          message: `"${node.data.label}" is unreachable from entry step`,
          nodeId: node.id,
        });
      }
    }
  }

  return issues;
}

export function hasValidationErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.level === "error");
}
