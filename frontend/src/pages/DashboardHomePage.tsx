import AssignmentIcon from "@mui/icons-material/Assignment";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AssessmentIcon from "@mui/icons-material/Assessment";
import { Grid2 as Grid, Card, CardContent, Typography, List, ListItem, ListItemText } from "@mui/material";
import {
  fetchMachines,
  fetchProductionOrders,
  fetchReports,
  fetchSimulations,
} from "../api/resources";
import { ProductionBarChart, StatusPieChart, countByField } from "../components/charts/DashboardCharts";
import PageHeader from "../components/common/PageHeader";
import PageState from "../components/common/PageState";
import StatCard from "../components/common/StatCard";
import StatusChip from "../components/common/StatusChip";
import { useAsyncData } from "../hooks/useAsyncData";
import { useAuth } from "../auth/AuthContext";
import { countActiveSimulations } from "../utils/constants";

export default function DashboardHomePage() {
  const { user } = useAuth();

  const { data, loading, error } = useAsyncData(async () => {
    const [orders, machines, reports, simulations] = await Promise.all([
      fetchProductionOrders({ limit: 100 }),
      fetchMachines({ limit: 100 }),
      fetchReports({ limit: 20 }),
      fetchSimulations().catch(() => []),
    ]);
    return { orders, machines, reports, simulations };
  }, []);

  const orders = data?.orders.items ?? [];
  const machines = data?.machines.items ?? [];
  const activeOrders = orders.filter((o) => o.status === "in_progress").length;
  const runningMachines = machines.filter((m) => m.status === "running").length;
  const totalQuantity = orders.reduce((sum, o) => sum + o.quantity_m, 0);

  const productionByCable = orders.slice(0, 6).map((order) => ({
    name: order.cable_type?.code ?? order.order_number.slice(0, 8),
    quantity: order.quantity_m,
  }));

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.full_name?.split(" ")[0] ?? "User"}`}
        subtitle="Production overview and live shop-floor metrics"
      />

      <PageState loading={loading} error={error}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              title="Production Orders"
              value={data?.orders.total ?? 0}
              subtitle={`${activeOrders} in progress`}
              icon={<AssignmentIcon />}
              loading={loading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              title="Running Machines"
              value={runningMachines}
              subtitle={`${machines.length} total`}
              icon={<PrecisionManufacturingIcon />}
              color="success.main"
              loading={loading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              title="Total Output"
              value={`${totalQuantity.toLocaleString()} m`}
              subtitle="Across all orders"
              icon={<TrendingUpIcon />}
              color="secondary.main"
              loading={loading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              title="Reports"
              value={data?.reports.total ?? 0}
              subtitle={`${countActiveSimulations(data?.simulations)} active simulations`}
              icon={<AssessmentIcon />}
              loading={loading}
            />
          </Grid>
        </Grid>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <StatusPieChart title="Orders by Status" data={countByField(orders, "status")} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <StatusPieChart title="Machines by Status" data={countByField(machines, "status")} />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <ProductionBarChart title="Order Quantity by Cable (m)" data={productionByCable} />
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Recent Orders
                </Typography>
                <List dense disablePadding>
                  {orders.slice(0, 5).map((order) => (
                    <ListItem key={order.id} disableGutters divider>
                      <ListItemText
                        primary={order.order_number}
                        secondary={order.cable_type?.name ?? "—"}
                      />
                      <StatusChip status={order.status} />
                    </ListItem>
                  ))}
                  {orders.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No orders yet
                    </Typography>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </PageState>
    </>
  );
}
