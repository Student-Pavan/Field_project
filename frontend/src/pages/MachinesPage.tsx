import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Box,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { fetchMachines } from "../api/resources";
import PageHeader from "../components/common/PageHeader";
import PageState from "../components/common/PageState";
import StatusChip from "../components/common/StatusChip";
import { useAsyncData } from "../hooks/useAsyncData";
import type { MachineStatus, MachineType } from "../types";

const MACHINE_TYPES: MachineType[] = [
  "extruder",
  "strander",
  "armoring",
  "jacketing",
  "capstan",
  "tester",
  "spooler",
];

const MACHINE_STATUSES: MachineStatus[] = [
  "idle",
  "running",
  "maintenance",
  "fault",
  "offline",
];

export default function MachinesPage() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MachineType | "">("");
  const [statusFilter, setStatusFilter] = useState<MachineStatus | "">("");
  const [activeOnly, setActiveOnly] = useState(true);

  const queryKey = useMemo(
    () => [page, rowsPerPage, search, typeFilter, statusFilter, activeOnly],
    [page, rowsPerPage, search, typeFilter, statusFilter, activeOnly],
  );

  const { data, loading, error, refetch } = useAsyncData(
    () =>
      fetchMachines({
        skip: page * rowsPerPage,
        limit: rowsPerPage,
        search: search || undefined,
        machine_type: typeFilter || undefined,
        status: statusFilter || undefined,
        is_active: activeOnly ? true : undefined,
      }),
    queryKey,
  );

  const machines = data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Machines"
        subtitle="Shop-floor equipment status and capacity"
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
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" },
            gap: 2,
            alignItems: "center",
          }}
        >
          <TextField
            label="Search code or name"
            size="small"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
          <FormControl size="small">
            <InputLabel>Type</InputLabel>
            <Select
              label="Type"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as MachineType | "");
                setPage(0);
              }}
            >
              <MenuItem value="">All</MenuItem>
              {MACHINE_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as MachineStatus | "");
                setPage(0);
              }}
            >
              <MenuItem value="">All</MenuItem>
              {MACHINE_STATUSES.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Switch
              checked={activeOnly}
              onChange={(e) => {
                setActiveOnly(e.target.checked);
                setPage(0);
              }}
            />
            <Typography variant="body2">Active only</Typography>
          </Box>
        </Box>
      </Paper>

      <PageState loading={loading} error={error} empty={!loading && machines.length === 0}>
        <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Location</TableCell>
                <TableCell align="right">Capacity (m/min)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {machines.map((machine) => (
                <TableRow key={machine.id} hover>
                  <TableCell>{machine.code}</TableCell>
                  <TableCell>{machine.name}</TableCell>
                  <TableCell>{machine.machine_type}</TableCell>
                  <TableCell>
                    <StatusChip status={machine.status} variant="machine" />
                  </TableCell>
                  <TableCell>{machine.location}</TableCell>
                  <TableCell align="right">{machine.capacity_m_per_min}</TableCell>
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
            rowsPerPageOptions={[5, 10, 25]}
          />
        </TableContainer>
      </PageState>
    </>
  );
}
