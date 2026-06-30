import type {
  CableType,
  GenerateReportRequest,
  Machine,
  MachineStatus,
  MachineType,
  PaginatedResponse,
  ProductionOrder,
  Report,
  ReportType,
  OrderStatus,
  WorkflowExecution,
  WorkflowStep,
  WorkflowTemplate,
  WorkflowTemplateCreate,
  SimulationSession,
  SimulationStartRequest,
} from "../types";
import { apiClient } from "./client";

export interface ListParams {
  skip?: number;
  limit?: number;
  search?: string;
}

export async function fetchProductionOrders(
  params: ListParams & { status?: OrderStatus; priority?: string } = {},
): Promise<PaginatedResponse<ProductionOrder>> {
  const { data } = await apiClient.get<PaginatedResponse<ProductionOrder>>("/production-orders", {
    params,
  });
  return data;
}

export async function fetchMachines(
  params: ListParams & {
    machine_type?: MachineType;
    status?: MachineStatus;
    is_active?: boolean;
  } = {},
): Promise<PaginatedResponse<Machine>> {
  const { data } = await apiClient.get<PaginatedResponse<Machine>>("/machines", { params });
  return data;
}

export async function fetchReports(
  params: ListParams & { report_type?: ReportType; production_order_id?: string } = {},
): Promise<PaginatedResponse<Report>> {
  const { data } = await apiClient.get<PaginatedResponse<Report>>("/reports", { params });
  return data;
}

export async function fetchWorkflowSteps(
  params: ListParams & { production_order_id?: string; status?: string } = {},
): Promise<PaginatedResponse<WorkflowStep>> {
  const { data } = await apiClient.get<PaginatedResponse<WorkflowStep>>("/workflows", { params });
  return data;
}

export async function fetchWorkflowExecution(
  orderId: string,
): Promise<WorkflowExecution> {
  const { data } = await apiClient.get<WorkflowExecution>(`/workflows/executions/${orderId}`);
  return data;
}

export async function fetchSimulations(): Promise<SimulationSession[]> {
  const { data } = await apiClient.get<SimulationSession[]>("/simulations");
  return data;
}

export async function fetchSimulation(sessionId: string): Promise<SimulationSession> {
  const { data } = await apiClient.get<SimulationSession>(`/simulations/${sessionId}`);
  return data;
}

export async function startSimulation(
  payload: SimulationStartRequest,
): Promise<SimulationSession> {
  const { data } = await apiClient.post<SimulationSession>("/simulations/start", payload);
  return data;
}

export async function stopSimulation(sessionId: string): Promise<SimulationSession> {
  const { data } = await apiClient.post<SimulationSession>(`/simulations/${sessionId}/stop`);
  return data;
}

export async function setSimulationSpeed(
  sessionId: string,
  speed_multiplier: number,
): Promise<SimulationSession> {
  const { data } = await apiClient.patch<SimulationSession>(`/simulations/${sessionId}/speed`, {
    speed_multiplier,
  });
  return data;
}

export async function fetchCableTypes(
  params: ListParams = {},
): Promise<PaginatedResponse<CableType>> {
  const { data } = await apiClient.get<PaginatedResponse<CableType>>("/cable-types", { params });
  return data;
}

export async function fetchWorkflowTemplates(
  params: ListParams & { cable_type_id?: string; is_active?: boolean } = {},
): Promise<PaginatedResponse<WorkflowTemplate>> {
  const { data } = await apiClient.get<PaginatedResponse<WorkflowTemplate>>("/workflow-templates", {
    params,
  });
  return data;
}

export async function fetchWorkflowTemplate(id: string): Promise<WorkflowTemplate> {
  const { data } = await apiClient.get<WorkflowTemplate>(`/workflow-templates/${id}`);
  return data;
}

export async function createWorkflowTemplate(
  payload: WorkflowTemplateCreate,
): Promise<WorkflowTemplate> {
  const { data } = await apiClient.post<WorkflowTemplate>("/workflow-templates", payload);
  return data;
}

export async function generateReport(payload: GenerateReportRequest): Promise<Report> {
  const { data } = await apiClient.post<Report>("/reports/generate", payload);
  return data;
}

export async function exportReport(reportId: string, format: "pdf" | "excel"): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/reports/${reportId}/export/${format}`, {
    responseType: "blob",
  });
  return data;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
