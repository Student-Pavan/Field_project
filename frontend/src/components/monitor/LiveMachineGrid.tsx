import { Box, LinearProgress, Paper, Typography } from "@mui/material";
import StatusChip from "../common/StatusChip";
import type { MachineLiveStatus } from "../../types";

interface LiveMachineGridProps {
  machines: MachineLiveStatus[];
}

export default function LiveMachineGrid({ machines }: LiveMachineGridProps) {
  if (machines.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No machine data — start or select a simulation session
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" }, gap: 1.5 }}>
      {machines.map((machine) => {
        const queuePct = machine.queue_capacity > 0
          ? Math.min(100, (machine.queue_length / machine.queue_capacity) * 100)
          : 0;
        return (
          <Paper key={machine.code} variant="outlined" sx={{ p: 1.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {machine.name}
              </Typography>
              <StatusChip status={machine.status} variant="machine" />
            </Box>
            <Typography variant="caption" color="text.secondary" display="block">
              {machine.code} · {machine.jobs_processed} jobs · {machine.failure_count} failures
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Queue: {machine.queue_length}/{machine.queue_capacity}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={queuePct}
                color={queuePct > 80 ? "error" : queuePct > 50 ? "warning" : "primary"}
                sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
              />
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
}
