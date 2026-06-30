export const ROLE_LABELS = {
  admin: "Admin",
  supervisor: "Supervisor",
  operator: "Operator",
} as const;

export const TOKEN_KEYS = {
  access: "cable_sim_access_token",
  refresh: "cable_sim_refresh_token",
} as const;

export const REPORT_TYPE_LABELS: Record<string, string> = {
  production_summary: "Production Summary",
  quality: "Quality",
  simulation: "Simulation",
  efficiency: "Efficiency",
  daily: "Daily",
};

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function weekAgoIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

export function countActiveSimulations(
  sessions: Array<{ status: string }> | undefined,
): number {
  return (sessions ?? []).filter((s) => s.status === "running" || s.status === "pending").length;
}
