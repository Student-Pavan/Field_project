import { useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
  type OnNodesChange,
  type OnEdgesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import MachineNode from "./MachineNode";
import { DRAG_TYPE } from "./MachinePalette";
import { generateStepKey } from "../../utils/workflowSerializer";
import type { MachineNodeData, MachineType, WorkflowStepKind, WorkflowStepType } from "../../types";

const nodeTypes = { machine: MachineNode };

const MACHINE_TYPE_TO_STEP_TYPE: Partial<Record<MachineType, WorkflowStepType>> = {
  extruder: "extrusion",
  strander: "stranding",
  armoring: "armoring",
  jacketing: "jacketing",
  tester: "testing",
  spooler: "spooling",
  capstan: "stranding",
};

export type WorkflowFlowNode = Node<MachineNodeData, "machine">;

interface WorkflowCanvasInnerProps {
  nodes: WorkflowFlowNode[];
  edges: Edge[];
  onNodesChange: OnNodesChange<WorkflowFlowNode>;
  onEdgesChange: OnEdgesChange;
  setNodes: React.Dispatch<React.SetStateAction<WorkflowFlowNode[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}

function WorkflowCanvasInner({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  setNodes,
  setEdges,
}: WorkflowCanvasInnerProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          { ...connection, type: "smoothstep", animated: true, id: `${connection.source}-${connection.target}` },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData(DRAG_TYPE);
      if (!raw) return;

      const payload = JSON.parse(raw) as Record<string, unknown>;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const existingKeys = new Set(nodes.map((n) => n.id));

      if (payload.paletteType === "machine") {
        const machineType = payload.machineType as MachineType;
        const stepKey = generateStepKey(String(payload.code ?? machineType), existingKeys);
        const newNode: WorkflowFlowNode = {
          id: stepKey,
          type: "machine",
          position,
          data: {
            stepKey,
            label: String(payload.label),
            code: String(payload.code ?? ""),
            machineId: String(payload.machineId),
            machineType,
            stepKind: "process",
            stepType: MACHINE_TYPE_TO_STEP_TYPE[machineType] ?? "extrusion",
            plannedDurationMin: 30,
          },
        };
        setNodes((nds) => nds.concat(newNode));
      } else {
        const stepKind = payload.stepKind as WorkflowStepKind;
        const stepKey = generateStepKey(stepKind, existingKeys);
        const newNode: WorkflowFlowNode = {
          id: stepKey,
          type: "machine",
          position,
          data: {
            stepKey,
            label: String(payload.label),
            stepKind,
            stepType: (payload.stepType as WorkflowStepType | null) ?? null,
            plannedDurationMin: stepKind === "scrap" ? 5 : 15,
          },
        };
        setNodes((nds) => nds.concat(newNode));
      }
    },
    [nodes, screenToFlowPosition, setNodes],
  );

  return (
    <div ref={reactFlowWrapper} style={{ flex: 1, height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode="Delete"
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

interface WorkflowCanvasProps {
  nodes: WorkflowFlowNode[];
  edges: Edge[];
  onNodesChange: OnNodesChange<WorkflowFlowNode>;
  onEdgesChange: OnEdgesChange;
  setNodes: React.Dispatch<React.SetStateAction<WorkflowFlowNode[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}

export default function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export { useNodesState, useEdgesState };
export type { Edge, Node };
