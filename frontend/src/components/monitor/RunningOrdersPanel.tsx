import { Box, LinearProgress, List, ListItem, ListItemText, Typography } from "@mui/material";
import StatusChip from "../common/StatusChip";
import type { SimulationSession } from "../../types";

interface RunningOrdersPanelProps {
  sessions: SimulationSession[];
  selectedSessionId: string | null;
  onSelect: (sessionId: string) => void;
}

export default function RunningOrdersPanel({
  sessions,
  selectedSessionId,
  onSelect,
}: RunningOrdersPanelProps) {
  const active = sessions.filter((s) => s.status === "running" || s.status === "pending");

  if (active.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No running simulations
      </Typography>
    );
  }

  return (
    <List dense disablePadding>
      {active.map((session) => (
        <ListItem
          key={session.session_id}
          disableGutters
          onClick={() => onSelect(session.session_id)}
          sx={{
            cursor: "pointer",
            borderRadius: 1,
            px: 1,
            mb: 1,
            bgcolor: selectedSessionId === session.session_id ? "action.selected" : "transparent",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <ListItemText
            primary={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  {session.order_number}
                </Typography>
                <StatusChip status={session.status} />
              </Box>
            }
            secondary={
              <Box sx={{ mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {session.progress_pct.toFixed(1)}% · sim {session.sim_time.toFixed(1)}s
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={session.progress_pct}
                  sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                />
              </Box>
            }
          />
        </ListItem>
      ))}
    </List>
  );
}
