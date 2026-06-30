import { Chip, type ChipProps } from "@mui/material";

const orderStatusColors: Record<string, ChipProps["color"]> = {
  draft: "default",
  scheduled: "info",
  in_progress: "primary",
  completed: "success",
  cancelled: "error",
  on_hold: "warning",
};

const machineStatusColors: Record<string, ChipProps["color"]> = {
  idle: "default",
  running: "success",
  maintenance: "warning",
  fault: "error",
  offline: "default",
  queued: "info",
  pending: "default",
  stopped: "default",
  completed: "success",
  failed: "error",
};

const workflowStatusColors: Record<string, ChipProps["color"]> = {
  pending: "default",
  running: "primary",
  in_progress: "primary",
  completed: "success",
  scrapped: "error",
  failed: "error",
  rework: "warning",
  skipped: "default",
  on_hold: "warning",
};

const reportTypeColors: Record<string, ChipProps["color"]> = {
  production_summary: "primary",
  quality: "success",
  simulation: "info",
  efficiency: "secondary",
  daily: "default",
};

function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface StatusChipProps {
  status: string;
  variant?: "order" | "machine" | "workflow" | "report";
  size?: ChipProps["size"];
}

export default function StatusChip({ status, variant = "order", size = "small" }: StatusChipProps) {
  const colorMap =
    variant === "machine"
      ? machineStatusColors
      : variant === "workflow"
        ? workflowStatusColors
        : variant === "report"
          ? reportTypeColors
          : orderStatusColors;

  return (
    <Chip
      label={formatLabel(status)}
      color={colorMap[status] ?? "default"}
      size={size}
      variant="outlined"
    />
  );
}
