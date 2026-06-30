import { Card, CardContent, CardHeader, useTheme } from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  draft: "#9e9e9e",
  scheduled: "#0288d1",
  in_progress: "#1565c0",
  completed: "#2e7d32",
  cancelled: "#d32f2f",
  on_hold: "#ed6c02",
  idle: "#9e9e9e",
  running: "#2e7d32",
  maintenance: "#ed6c02",
  fault: "#d32f2f",
  offline: "#757575",
};

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  height?: number;
}

function ChartCard({ title, children, height = 280 }: ChartCardProps) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardHeader title={title} titleTypographyProps={{ variant: "h6", fontWeight: 600 }} />
      <CardContent sx={{ height, pt: 0 }}>{children}</CardContent>
    </Card>
  );
}

interface StatusPieChartProps {
  title: string;
  data: { name: string; value: number }[];
}

export function StatusPieChart({ title, data }: StatusPieChartProps) {
  const theme = useTheme();
  const filtered = data.filter((item) => item.value > 0);

  if (filtered.length === 0) {
    return (
      <ChartCard title={title}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[{ name: "No data", value: 1 }]}
              dataKey="value"
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill={theme.palette.grey[300]}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={filtered}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="45%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
          >
            {filtered.map((entry) => (
              <Cell
                key={entry.name}
                fill={STATUS_COLORS[entry.name] ?? theme.palette.primary.main}
              />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [value, "Count"]} />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

interface ProductionBarChartProps {
  title: string;
  data: { name: string; quantity: number }[];
}

export function ProductionBarChart({ title, data }: ProductionBarChartProps) {
  const theme = useTheme();

  return (
    <ChartCard title={title} height={300}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="quantity" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function countByField<T>(items: T[], field: keyof T): { name: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = String(item[field]);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
}
