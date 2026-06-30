import { Box, Typography } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { MachineLiveStatus } from "../../types";

interface QueueLengthChartProps {
  machines: MachineLiveStatus[];
}

const barColors = ["#1976d2", "#2e7d32", "#ed6c02", "#9c27b0", "#d32f2f", "#0288d1"];

export default function QueueLengthChart({ machines }: QueueLengthChartProps) {
  const data = machines.map((m) => ({
    name: m.code,
    queue: m.queue_length,
    capacity: m.queue_capacity,
  }));

  if (data.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No queue data available
      </Typography>
    );
  }

  return (
    <Box sx={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value: number, name: string) => [value, name === "queue" ? "Queue" : "Capacity"]} />
          <Bar dataKey="queue" name="queue" radius={[4, 4, 0, 0]}>
            {data.map((_, index) => (
              <Cell key={index} fill={barColors[index % barColors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
