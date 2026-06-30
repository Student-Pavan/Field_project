import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { Alert, Box, Typography } from "@mui/material";
import type { AlarmNotification } from "../../types";

const severityColor: Record<string, "error" | "warning" | "info"> = {
  critical: "error",
  emergency: "error",
  warning: "warning",
  info: "info",
};

interface AlarmFeedProps {
  alarms: AlarmNotification[];
}

export default function AlarmFeed({ alarms }: AlarmFeedProps) {
  if (alarms.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No alarms
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 240, overflowY: "auto" }}>
      {alarms.map((alarm) => (
        <Alert
          key={alarm.id}
          severity={severityColor[alarm.severity] ?? "warning"}
          icon={<WarningAmberIcon fontSize="inherit" />}
          sx={{ py: 0.25 }}
        >
          <Typography variant="body2">{alarm.message}</Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(alarm.timestamp).toLocaleTimeString()}
          </Typography>
        </Alert>
      ))}
    </Box>
  );
}
