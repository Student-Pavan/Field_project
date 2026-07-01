import { describe, expect, it } from "vitest";
import { generateStepKey, graphToTemplatePayload, templateToGraph } from "./workflowSerializer";
import type { WorkflowTemplate } from "../types";

describe("workflowSerializer", () => {
  it("generates unique step keys", () => {
    const existing = new Set(["extrusion", "extrusion_1"]);
    expect(generateStepKey("extrusion", existing)).toBe("extrusion_2");
  });

  it("converts graph to template payload", () => {
    const nodes = [
      {
        id: "extrusion",
        type: "machine" as const,
        position: { x: 0, y: 0 },
        data: {
          stepKey: "extrusion",
          label: "Extrusion",
          stepKind: "process" as const,
          stepType: "extrusion" as const,
          machineId: "m1",
          plannedDurationMin: 45,
        },
      },
    ];
    const edges = [{ id: "e1", source: "extrusion", target: "testing" }];
    const payload = graphToTemplatePayload(nodes, edges, {
      name: "Test",
      cableTypeId: "cable-1",
      entryStepKey: "extrusion",
    });
    expect(payload.steps).toHaveLength(1);
    const [step] = payload.steps;
    expect(step?.routing.default_next).toBe("testing");
    expect(payload.entry_step_key).toBe("extrusion");
  });

  it("converts template back to graph", () => {
    const template: WorkflowTemplate = {
      id: "t1",
      cable_type_id: "c1",
      name: "Line",
      description: null,
      version: 1,
      is_active: true,
      entry_step_key: "extrusion",
      created_at: "",
      updated_at: "",
      steps: [
        {
          id: "s1",
          template_id: "t1",
          step_key: "extrusion",
          name: "Extrusion",
          step_kind: "process",
          step_type: "extrusion",
          machine_id: "m1",
          sequence_order: 1,
          planned_duration_min: "45.00",
          parameters: { layout: { x: 10, y: 20 } },
          routing: { default_next: "testing", routes: [] },
          machine: { id: "m1", code: "EXT-01", name: "Extruder", machine_type: "extruder" },
        },
      ],
    };
    const graph = templateToGraph(template);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0]?.position).toEqual({ x: 10, y: 20 });
  });
});
