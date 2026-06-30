import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Box,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
} from "@mui/material";
import { useMemo, useState } from "react";
import { fetchProductionOrders } from "../api/resources";
import PageHeader from "../components/common/PageHeader";
import PageState from "../components/common/PageState";
import StatusChip from "../components/common/StatusChip";
import { useAsyncData } from "../hooks/useAsyncData";
import type { OrderStatus } from "../types";

const STATUS_OPTIONS: (OrderStatus | "")[] = [
  "",
  "draft",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "on_hold",
];

export default function OrdersPage() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");

  const queryKey = useMemo(
    () => [page, rowsPerPage, search, statusFilter],
    [page, rowsPerPage, search, statusFilter],
  );

  const { data, loading, error, refetch } = useAsyncData(
    () =>
      fetchProductionOrders({
        skip: page * rowsPerPage,
        limit: rowsPerPage,
        search: search || undefined,
        status: statusFilter || undefined,
      }),
    queryKey,
  );

  const orders = data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Production Orders"
        subtitle="Manage and monitor cable production orders"
        action={
          <Tooltip title="Refresh">
            <IconButton onClick={refetch}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
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
          <TextField
            label="Search order number"
            size="small"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: { sm: 220 } }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as OrderStatus | "");
                setPage(0);
              }}
            >
              <MenuItem value="">All</MenuItem>
              {STATUS_OPTIONS.filter(Boolean).map((status) => (
                <MenuItem key={status} value={status}>
                  {String(status).replace(/_/g, " ")}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <PageState loading={loading} error={error} empty={!loading && orders.length === 0}>
        <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Order #</TableCell>
                <TableCell>Cable Type</TableCell>
                <TableCell align="right">Qty (m)</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Delivery</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} hover>
                  <TableCell>{order.order_number}</TableCell>
                  <TableCell>{order.cable_type?.name ?? "—"}</TableCell>
                  <TableCell align="right">{order.quantity_m.toLocaleString()}</TableCell>
                  <TableCell>
                    <StatusChip status={order.priority} variant="order" />
                  </TableCell>
                  <TableCell>
                    <StatusChip status={order.status} />
                  </TableCell>
                  <TableCell>{order.requested_delivery_date ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={data?.total ?? 0}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </TableContainer>
      </PageState>
    </>
  );
}
