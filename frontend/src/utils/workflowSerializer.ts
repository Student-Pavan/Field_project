import type { Edge, Node } from "@xyflow/react";
import type {
  MachineNodeData,
  StepRouting,
  WorkflowStepTemplateCreate,
  WorkflowTemplate,
  WorkflowTemplateCreate,
} from "../types";

type WorkflowFlowNode = Node<MachineNodeData, "machine">;

function autoLayout(sequenceOrder: number): { x: number; y: number } {
  return { x: (sequenceOrder - 1) * 220, y: 120 };
}

export function graphToTemplatePayload(
  nodes: WorkflowFlowNode[],
  edges: Edge[],
  meta: { name: string; cableTypeId: string; entryStepKey: string; description?: string },
): WorkflowTemplateCreate {
  const sortedNodes = [...nodes].sort((a, b) => a.position.x - b.position.x);

  const steps: WorkflowStepTemplateCreate[] = sortedNodes.map((node, index) => {
    const outgoing = edges.filter((e) => e.source === node.id);
    const defaultEdge = outgoing.find((e) => !e.data?.condition);
    const conditionalEdges = outgoing.filter((e) => e.data?.condition);

    const routing: StepRouting = {
      default_next: defaultEdge?.target ?? null,
      routes: conditionalEdges.map((e) => ({
        condition: e.data!.condition as { field: string; op: string; value?: unknown },
        next: e.target,
      })),
    };

    return {
      step_key: node.id,
      name: node.data.label,
      step_kind: node.data.stepKind,
      step_type: node.data.stepType ?? null,
      machine_id: node.data.machineId ?? null,
      sequence_order: index + 1,
      planned_duration_min: node.data.plannedDurationMin,
      parameters: { layout: node.position },
      routing,
    };
  });

  return {
    cable_type_id: meta.cableTypeId,
    name: meta.name,
    description: meta.description ?? null,
    version: 1,
    is_active: true,
    entry_step_key: meta.entryStepKey,
    steps,
  };
}

export function templateToGraph(template: WorkflowTemplate): {
  nodes: WorkflowFlowNode[];
  edges: Edge[];
} {
  const nodes: WorkflowFlowNode[] = template.steps.map((step) => {
    const layout = step.parameters?.layout as { x: number; y: number } | undefined;
    return {
      id: step.step_key,
      type: "machine",
      position: layout ?? autoLayout(step.sequence_order),
      data: {
        stepKey: step.step_key,
        label: step.name,
        machineId: step.machine_id ?? undefined,
        machineType: step.machine?.machine_type,
        code: step.machine?.code,
        stepKind: step.step_kind,
        stepType: step.step_type,
        plannedDurationMin: Number(step.planned_duration_min),
      },
    };
  });

  const edges: Edge[] = [];
  for (const step of template.steps) {
    const routing = step.routing as StepRouting;
    if (routing.default_next) {
      edges.push({
        id: `${step.step_key}->${routing.default_next}`,
        source: step.step_key,
        target: routing.default_next,
        type: "smoothstep",
        animated: true,
      });
    }
    for (const route of routing.routes ?? []) {
      edges.push({
        id: `${step.step_key}->${route.next}`,
        source: step.step_key,
        target: route.next,
        type: "smoothstep",
        animated: true,
        label: route.condition.field,
        data: { condition: route.condition },
      });
    }
  }

  return { nodes, edges };
}

export function generateStepKey(base: string, existingKeys: Set<string>): string {
  const sanitized = base.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  let key = sanitized || "step";
  let i = 1;
  while (existingKeys.has(key)) {
    key = `${sanitized || "step"}_${i++}`;
  }
  return key;
}
