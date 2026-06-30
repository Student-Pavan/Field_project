import AddIcon from "@mui/icons-material/Add";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import TableChartIcon from "@mui/icons-material/TableChart";
import VisibilityIcon from "@mui/icons-material/Visibility";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid2 as Grid,
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
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import {
  downloadBlob,
  exportReport,
  fetchProductionOrders,
  fetchReports,
  generateReport,
} from "../api/resources";
import PageHeader from "../components/common/PageHeader";
import PageState from "../components/common/PageState";
import StatusChip from "../components/common/StatusChip";
import { useAsyncData } from "../hooks/useAsyncData";
import type { Report, ReportContent, ReportType } from "../types";
import { getAuthErrorMessage } from "../auth/authApi";
import { todayIso, weekAgoIso } from "../utils/constants";

const REPORT_TYPES: ReportType[] = [
  "production_summary",
  "quality",
  "simulation",
  "efficiency",
  "daily",
];

function ReportPreview({ content }: { content: ReportContent }) {
  const oee = content.oee?.plant;
  return (
    <Grid container spacing={2}>
      {oee && (
        <Grid size={{ xs: 12 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                OEE Summary
              </Typography>
              <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                <Typography variant="body2">Availability: {oee.availability_pct}%</Typography>
                <Typography variant="body2">Performance: {oee.performance_pct}%</Typography>
                <Typography variant="body2">Quality: {oee.quality_pct}%</Typography>
                <Typography variant="body2" fontWeight={700}>
                  OEE: {oee.oee_pct}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}
      <Grid size={{ xs: 12, md: 6 }}>
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          Daily Production
        </Typography>
        {(content.daily_production ?? []).slice(-5).map((row) => (
          <Typography key={String(row.date)} variant="body2" color="text.secondary">
            {String(row.date)}: {String(row.total_produced_m)}m produced, {String(row.orders_completed)} completed
          </Typography>
        ))}
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          Machine Utilization
        </Typography>
        {(content.machine_utilization ?? []).slice(0, 5).map((row) => (
          <Typography key={String(row.code)} variant="body2" color="text.secondary">
            {String(row.code)}: {String(row.utilization_pct)}% ({String(row.run_hours)}h)
          </Typography>
        ))}
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          Downtime Events
        </Typography>
        {(content.downtime ?? []).slice(0, 4).map((row, i) => (
          <Typography key={i} variant="body2" color="text.secondary">
            {String(row.machine_code)}: {String(row.reason)} ({String(row.hours)}h)
          </Typography>
        ))}
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          Rejected Cables
        </Typography>
        {(content.rejected_cables ?? []).map((row, i) => (
          <Typography key={i} variant="body2" color="text.secondary">
            {String(row.order_number)}: {String(row.quantity_rejected_m)}m — {String(row.status)}
          </Typography>
        ))}
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          Cycle Time
        </Typography>
        {(content.cycle_time ?? []).map((row) => (
          <Typography key={String(row.order_number)} variant="body2" color="text.secondary">
            {String(row.order_number)}: {String(row.actual_cycle_min)} min actual vs {String(row.planned_cycle_min)} min
            planned ({String(row.variance_pct)}% variance)
          </Typography>
        ))}
      </Grid>
    </Grid>
  );
}

export default function ReportsPage() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ReportType | "">("");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [dateFrom, setDateFrom] = useState(weekAgoIso());
  const [dateTo, setDateTo] = useState(todayIso());
  const [orderId, setOrderId] = useState("");
  const [reportTitle, setReportTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const queryKey = useMemo(
    () => [page, rowsPerPage, search, typeFilter],
    [page, rowsPerPage, search, typeFilter],
  );

  const { data, loading, error, refetch } = useAsyncData(
    () =>
      fetchReports({
        skip: page * rowsPerPage,
        limit: rowsPerPage,
        search: search || undefined,
        report_type: typeFilter || undefined,
      }),
    queryKey,
  );

  const { data: ordersData } = useAsyncData(() => fetchProductionOrders({ limit: 50 }), []);

  const reports = data?.items ?? [];
  const orders = ordersData?.items ?? [];

  const handleGenerate = async () => {
    setGenerating(true);
    setActionError(null);
    try {
      await generateReport({
        date_from: dateFrom,
        date_to: dateTo,
        production_order_id: orderId || null,
        title: reportTitle || null,
      });
      setGenerateOpen(false);
      setReportTitle("");
      refetch();
    } catch (err) {
      setActionError(getAuthErrorMessage(err, "Failed to generate report"));
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async (report: Report, format: "pdf" | "excel") => {
    setExportingId(`${report.id}-${format}`);
    setActionError(null);
    try {
      const blob = await exportReport(report.id, format);
      const ext = format === "pdf" ? "pdf" : "xlsx";
      downloadBlob(blob, `${report.title.replace(/\//g, "-")}.${ext}`);
    } catch (err) {
      setActionError(getAuthErrorMessage(err, `Failed to export ${format.toUpperCase()}`));
    } finally {
      setExportingId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Generate operations reports with OEE, utilization, downtime, and export to PDF or Excel"
        action={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setGenerateOpen(true)}>
              Generate Report
            </Button>
            <Tooltip title="Refresh">
              <IconButton onClick={refetch}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        }
      />

      {actionError && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {actionError}
        </Typography>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2 }}>
          <TextField
            label="Search title"
            size="small"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: { sm: 220 } }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Report Type</InputLabel>
            <Select
              label="Report Type"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as ReportType | "");
                setPage(0);
              }}
            >
              <MenuItem value="">All</MenuItem>
              {REPORT_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <PageState loading={loading} error={error} empty={!loading && reports.length === 0}>
        <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Summary</TableCell>
                <TableCell>Generated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id} hover>
                  <TableCell>{report.title}</TableCell>
                  <TableCell>
                    <StatusChip status={report.report_type} variant="report" />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>{report.summary ?? "—"}</TableCell>
                  <TableCell>{new Date(report.generated_at).toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Preview">
                      <IconButton size="small" onClick={() => setPreviewReport(report)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Export PDF">
                      <IconButton
                        size="small"
                        disabled={exportingId === `${report.id}-pdf`}
                        onClick={() => handleExport(report, "pdf")}
                      >
                        <PictureAsPdfIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Export Excel">
                      <IconButton
                        size="small"
                        disabled={exportingId === `${report.id}-excel`}
                        onClick={() => handleExport(report, "excel")}
                      >
                        <TableChartIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
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

      <Dialog open={generateOpen} onClose={() => setGenerateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate Operations Report</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              label="From Date"
              type="date"
              size="small"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="To Date"
              type="date"
              size="small"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <FormControl size="small">
              <InputLabel>Reference Order (optional)</InputLabel>
              <Select
                label="Reference Order (optional)"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              >
                <MenuItem value="">Auto-select</MenuItem>
                {orders.map((order) => (
                  <MenuItem key={order.id} value={order.id}>
                    {order.order_number}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Custom Title (optional)"
              size="small"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
            />
            <Typography variant="caption" color="text.secondary">
              Includes: daily production, machine utilization, downtime, rejected cables, cycle time, and OEE.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleGenerate} disabled={generating}>
            Generate
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={previewReport !== null}
        onClose={() => setPreviewReport(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{previewReport?.title}</DialogTitle>
        <DialogContent>
          {previewReport && <ReportPreview content={previewReport.content} />}
        </DialogContent>
        <DialogActions>
          {previewReport && (
            <>
              <Button
                startIcon={<PictureAsPdfIcon />}
                onClick={() => handleExport(previewReport, "pdf")}
              >
                PDF
              </Button>
              <Button
                startIcon={<TableChartIcon />}
                onClick={() => handleExport(previewReport, "excel")}
              >
                Excel
              </Button>
            </>
          )}
          <Button onClick={() => setPreviewReport(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
