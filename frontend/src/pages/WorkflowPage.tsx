import RefreshIcon from "@mui/icons-material/Refresh";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { fetchProductionOrders, fetchWorkflowSteps } from "../api/resources";
import PageHeader from "../components/common/PageHeader";
import PageState from "../components/common/PageState";
import StatusChip from "../components/common/StatusChip";
import { useAsyncData } from "../hooks/useAsyncData";
import type { WorkflowStepStatus } from "../types";

const STEP_STATUSES: (WorkflowStepStatus | "")[] = [
  "",
  "pending",
  "in_progress",
  "completed",
  "rework",
  "scrapped",
  "failed",
];

export default function WorkflowPage() {
  const [orderFilter, setOrderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<WorkflowStepStatus | "">("");

  const { data: ordersData } = useAsyncData(
    () => fetchProductionOrders({ limit: 50 }),
    [],
  );

  const queryKey = useMemo(() => [orderFilter, statusFilter], [orderFilter, statusFilter]);

  const { data, loading, error, refetch } = useAsyncData(
    () =>
      fetchWorkflowSteps({
        limit: 100,
        production_order_id: orderFilter || undefined,
        status: statusFilter || undefined,
      }),
    queryKey,
  );

  const steps = data?.items ?? [];
  const orders = ordersData?.items ?? [];

  const groupedByOrder = useMemo(() => {
    const map = new Map<string, typeof steps>();
    for (const step of steps) {
      const list = map.get(step.production_order_id) ?? [];
      list.push(step);
      map.set(step.production_order_id, list);
    }
    return map;
  }, [steps]);

  const selectedOrderSteps = orderFilter
    ? (groupedByOrder.get(orderFilter) ?? []).sort((a, b) => a.sequence_order - b.sequence_order)
    : [];

  const activeStepIndex = selectedOrderSteps.findIndex((s) => s.status === "in_progress");

  return (
    <>
      <PageHeader
        title="Workflow"
        subtitle="Track production workflow steps, inspections, and rework"
        action={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              component={RouterLink}
              to="/workflow/designer"
              variant="outlined"
              size="small"
              startIcon={<AccountTreeIcon />}
            >
              Designer
            </Button>
            <Tooltip title="Refresh">
              <IconButton onClick={refetch}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        }
      />

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
          }}
        >
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel>Production Order</InputLabel>
            <Select
              label="Production Order"
              value={orderFilter}
              onChange={(e) => setOrderFilter(e.target.value)}
            >
              <MenuItem value="">All orders</MenuItem>
              {orders.map((order) => (
                <MenuItem key={order.id} value={order.id}>
                  {order.order_number}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Step Status</InputLabel>
            <Select
              label="Step Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as WorkflowStepStatus | "")}
            >
              <MenuItem value="">All</MenuItem>
              {STEP_STATUSES.filter(Boolean).map((status) => (
                <MenuItem key={status} value={status}>
                  {String(status).replace(/_/g, " ")}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {orderFilter && selectedOrderSteps.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Order Pipeline
            </Typography>
            <Stepper
              activeStep={activeStepIndex >= 0 ? activeStepIndex : selectedOrderSteps.length}
              alternativeLabel
              sx={{ display: { xs: "none", md: "flex" }, mb: 2 }}
            >
              {selectedOrderSteps.map((step) => (
                <Step key={step.id} completed={step.status === "completed"}>
                  <StepLabel>{step.step_key ?? `Step ${step.sequence_order}`}</StepLabel>
                </Step>
              ))}
            </Stepper>
            <LinearProgress
              variant="determinate"
              value={
                (selectedOrderSteps.filter((s) => s.status === "completed").length /
                  selectedOrderSteps.length) *
                100
              }
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              {selectedOrderSteps.filter((s) => s.status === "completed").length} of{" "}
              {selectedOrderSteps.length} steps completed
            </Typography>
          </CardContent>
        </Card>
      )}

      <PageState loading={loading} error={error} empty={!loading && steps.length === 0}>
        <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Seq</TableCell>
                <TableCell>Step</TableCell>
                <TableCell>Kind</TableCell>
                <TableCell>Machine</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Outcome</TableCell>
                <TableCell align="right">Rework #</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {steps.map((step) => (
                <TableRow key={step.id} hover>
                  <TableCell>{step.sequence_order}</TableCell>
                  <TableCell>{step.step_key ?? "—"}</TableCell>
                  <TableCell>{step.step_kind ?? step.step_type ?? "—"}</TableCell>
                  <TableCell>{step.machine?.code ?? "—"}</TableCell>
                  <TableCell>
                    <StatusChip status={step.status} variant="workflow" />
                  </TableCell>
                  <TableCell>{step.outcome ?? "—"}</TableCell>
                  <TableCell align="right">{step.rework_attempt ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </PageState>
    </>
  );
}
