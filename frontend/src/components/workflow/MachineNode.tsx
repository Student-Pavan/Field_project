import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import { Box, Chip, Paper, Typography } from "@mui/material";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { MachineNodeData } from "../../types";

const kindColors: Record<string, string> = {
  process: "#1976d2",
  quality_inspection: "#ed6c02",
  scrap: "#d32f2f",
  completion: "#2e7d32",
};

export default function MachineNode({ data, selected }: NodeProps) {
  const nodeData = data as MachineNodeData;
  const borderColor = nodeData.invalid ? "#d32f2f" : selected ? "#1976d2" : "#e0e0e0";

  return (
    <Paper
      elevation={selected ? 4 : 1}
      sx={{
        p: 1.5,
        minWidth: 170,
        border: 2,
        borderColor,
        borderRadius: 2,
        bgcolor: "background.paper",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: "#1976d2" }} />
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        <PrecisionManufacturingIcon fontSize="small" color="primary" />
        <Typography variant="subtitle2" fontWeight={600} noWrap>
          {nodeData.label}
        </Typography>
      </Box>
      {nodeData.code && (
        <Typography variant="caption" color="text.secondary" display="block">
          {nodeData.code}
        </Typography>
      )}
      <Box sx={{ mt: 1, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
        <Chip
          label={nodeData.stepKind.replace(/_/g, " ")}
          size="small"
          sx={{
            height: 20,
            fontSize: "0.65rem",
            bgcolor: kindColors[nodeData.stepKind] ?? "#757575",
            color: "#fff",
          }}
        />
        {nodeData.stepType && (
          <Chip label={nodeData.stepType} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.65rem" }} />
        )}
      </Box>
      <Handle type="source" position={Position.Right} style={{ background: "#1976d2" }} />
    </Paper>
  );
}
