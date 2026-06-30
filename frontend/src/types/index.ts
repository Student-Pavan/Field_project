/** Shared TypeScript types — domain models. */

export type UserRole = "admin" | "supervisor" | "operator";

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface HealthResponse {
  status: string;
  version: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  full_name: string;
}

export type OrderStatus =
  | "draft"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "on_hold";

export type OrderPriority = "low" | "normal" | "high" | "urgent";

export type MachineStatus = "idle" | "running" | "maintenance" | "fault" | "offline";

export type MachineType =
  | "extruder"
  | "strander"
  | "armoring"
  | "jacketing"
  | "capstan"
  | "tester"
  | "spooler";

export type ReportType =
  | "production_summary"
  | "quality"
  | "simulation"
  | "efficiency"
  | "daily";

export interface GenerateReportRequest {
  date_from: string;
  date_to: string;
  production_order_id?: string | null;
  title?: string | null;
}

export interface ReportContent {
  period?: { from: string; to: string; hours?: number };
  daily_production?: Array<Record<string, unknown>>;
  machine_utilization?: Array<Record<string, unknown>>;
  downtime?: Array<Record<string, unknown>>;
  rejected_cables?: Array<Record<string, unknown>>;
  cycle_time?: Array<Record<string, unknown>>;
  oee?: {
    plant?: Record<string, number>;
    by_machine?: Array<Record<string, unknown>>;
  };
  [key: string]: unknown;
}

export type WorkflowStepStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped"
  | "failed"
  | "rework"
  | "scrapped";

export type WorkflowExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "scrapped"
  | "failed"
  | "on_hold";

export interface CableTypeBrief {
  id: string;
  code: string;
  name: string;
}

export interface MachineBrief {
  id: string;
  code: string;
  name: string;
  machine_type: MachineType;
}

export interface ProductionOrder {
  id: string;
  order_number: string;
  cable_type_id: string;
  created_by_user_id: string;
  quantity_m: number;
  status: OrderStatus;
  priority: OrderPriority;
  requested_delivery_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  cable_type?: CableTypeBrief | null;
}

export interface Machine {
  id: string;
  code: string;
  name: string;
  machine_type: MachineType;
  status: MachineStatus;
  location: string;
  capacity_m_per_min: string;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  production_order_id: string;
  generated_by_user_id: string;
  report_type: ReportType;
  title: string;
  summary: string | null;
  content: ReportContent;
  generated_at: string;
}

export interface WorkflowStep {
  id: string;
  production_order_id: string;
  step_key: string | null;
  step_kind: string | null;
  sequence_order: number;
  step_type: string | null;
  status: WorkflowStepStatus;
  outcome: string | null;
  planned_duration_min: string;
  actual_duration_min: string | null;
  inspection_result: Record<string, unknown> | null;
  rework_attempt: number;
  machine?: MachineBrief | null;
}

export interface WorkflowExecution {
  id: string;
  production_order_id: string;
  template_id: string;
  status: WorkflowExecutionStatus;
  current_step_key: string | null;
  context: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  steps: WorkflowStep[];
}

export interface SimulationSession {
  session_id: string;
  production_order_id: string;
  order_number: string;
  quantity_m?: number;
  speed_multiplier?: number;
  status: string;
  progress_pct: number;
  sim_time: number;
  error_message?: string | null;
  machines?: MachineLiveStatus[];
}

export interface MachineLiveStatus {
  machine_kind: string;
  code: string;
  name: string;
  status: string;
  maintenance_mode: boolean;
  queue_length: number;
  queue_capacity: number;
  failure_probability?: number;
  jobs_processed: number;
  failure_count: number;
  sequence_order: number;
  sim_time?: number | null;
}

export type SimulationEventType =
  | "started"
  | "tick"
  | "node_state"
  | "metric"
  | "completed"
  | "error"
  | "stopped"
  | "session_finished"
  | "speed_changed"
  | "alarm"
  | "snapshot"
  | "pong";

export interface SimulationWsEvent {
  type: SimulationEventType;
  session_id?: string;
  production_order_id?: string;
  order_number?: string;
  progress_pct?: number;
  sim_time?: number;
  speed_multiplier?: number;
  machine?: MachineLiveStatus;
  state?: string;
  name?: string;
  value?: number;
  message?: string;
  severity?: string;
  payload?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  status?: string;
  machines?: MachineLiveStatus[];
  quantity_m?: number;
  timestamp?: string;
}

export interface SimulationStartRequest {
  production_order_id: string;
  speed_multiplier?: number;
  random_seed?: number | null;
}

export interface AlarmNotification {
  id: string;
  severity: string;
  message: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

export type WorkflowStepKind =
  | "process"
  | "quality_inspection"
  | "conditional"
  | "rework"
  | "scrap"
  | "completion";

export type WorkflowStepType =
  | "extrusion"
  | "stranding"
  | "armoring"
  | "jacketing"
  | "testing"
  | "spooling";

export interface RoutingCondition {
  field: string;
  op: string;
  value?: unknown;
}

export interface RoutingRule {
  condition: RoutingCondition;
  next: string;
}

export interface StepRouting {
  default_next?: string | null;
  routes?: RoutingRule[];
}

export interface WorkflowStepTemplate {
  id: string;
  template_id: string;
  step_key: string;
  name: string;
  step_kind: WorkflowStepKind;
  step_type: WorkflowStepType | null;
  machine_id: string | null;
  sequence_order: number;
  planned_duration_min: string;
  parameters: Record<string, unknown> | null;
  routing: StepRouting;
  machine?: MachineBrief | null;
}

export interface WorkflowTemplate {
  id: string;
  cable_type_id: string;
  name: string;
  description: string | null;
  version: number;
  is_active: boolean;
  entry_step_key: string;
  created_at: string;
  updated_at: string;
  steps: WorkflowStepTemplate[];
}

export interface WorkflowStepTemplateCreate {
  step_key: string;
  name: string;
  step_kind: WorkflowStepKind;
  step_type?: WorkflowStepType | null;
  machine_id?: string | null;
  sequence_order: number;
  planned_duration_min: number;
  parameters?: Record<string, unknown> | null;
  routing?: StepRouting;
}

export interface WorkflowTemplateCreate {
  cable_type_id: string;
  name: string;
  description?: string | null;
  version?: number;
  is_active?: boolean;
  entry_step_key: string;
  steps: WorkflowStepTemplateCreate[];
}

export interface CableType {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

export interface MachineNodeData {
  stepKey: string;
  label: string;
  code?: string;
  machineId?: string;
  machineType?: MachineType;
  stepKind: WorkflowStepKind;
  stepType?: WorkflowStepType | null;
  plannedDurationMin: number;
  invalid?: boolean;
  [key: string]: unknown;
}

export interface ValidationIssue {
  level: "error" | "warning";
  message: string;
  nodeId?: string;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}
