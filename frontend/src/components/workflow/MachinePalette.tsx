import BuildIcon from "@mui/icons-material/Build";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Box, Divider, List, ListItemButton, ListItemIcon, ListItemText, Typography } from "@mui/material";
import type { Machine } from "../../types";

const DRAG_TYPE = "application/reactflow";

interface MachinePaletteProps {
  machines: Machine[];
}

const STEP_ITEMS = [
  { stepKind: "quality_inspection" as const, label: "Quality Inspection", icon: <FactCheckIcon /> },
  { stepKind: "scrap" as const, label: "Scrap", icon: <DeleteForeverIcon /> },
  { stepKind: "completion" as const, label: "Completion", icon: <CheckCircleIcon />, stepType: "spooling" as const },
];

function onDragStart(e: React.DragEvent, payload: Record<string, unknown>) {
  e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "move";
}

export default function MachinePalette({ machines }: MachinePaletteProps) {
  return (
    <Box sx={{ width: 220, flexShrink: 0, borderRight: 1, borderColor: "divider", p: 2, overflowY: "auto" }}>
      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
        Machines
      </Typography>
      <List dense disablePadding>
        {machines.map((machine) => (
          <ListItemButton
            key={machine.id}
            draggable
            onDragStart={(e) =>
              onDragStart(e, {
                paletteType: "machine",
                machineId: machine.id,
                machineType: machine.machine_type,
                label: machine.name,
                code: machine.code,
              })
            }
            sx={{ borderRadius: 1, mb: 0.5, cursor: "grab" }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <BuildIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={machine.name}
              secondary={machine.code}
              primaryTypographyProps={{ variant: "body2", noWrap: true }}
              secondaryTypographyProps={{ variant: "caption" }}
            />
          </ListItemButton>
        ))}
      </List>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
        Step Types
      </Typography>
      <List dense disablePadding>
        {STEP_ITEMS.map((item) => (
          <ListItemButton
            key={item.stepKind}
            draggable
            onDragStart={(e) =>
              onDragStart(e, {
                paletteType: "step",
                stepKind: item.stepKind,
                stepType: item.stepType ?? null,
                label: item.label,
              })
            }
            sx={{ borderRadius: 1, mb: 0.5, cursor: "grab" }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} primaryTypographyProps={{ variant: "body2" }} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}

export { DRAG_TYPE };
