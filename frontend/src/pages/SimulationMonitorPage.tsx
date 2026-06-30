import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid2 as Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useReducer, useState } from "react";
import {
  fetchProductionOrders,
  fetchSimulations,
  setSimulationSpeed,
  startSimulation,
  stopSimulation,
} from "../api/resources";
import AlarmFeed from "../components/monitor/AlarmFeed";
import LiveMachineGrid from "../components/monitor/LiveMachineGrid";
import QueueLengthChart from "../components/monitor/QueueLengthChart";
import RunningOrdersPanel from "../components/monitor/RunningOrdersPanel";
import SpeedControl from "../components/monitor/SpeedControl";
import PageHeader from "../components/common/PageHeader";
import PageState from "../components/common/PageState";
import { useAsyncData } from "../hooks/useAsyncData";
import { useWebSocket } from "../hooks/useWebSocket";
import type {
  AlarmNotification,
  MachineLiveStatus,
  SimulationSession,
  SimulationWsEvent,
} from "../types";

interface MonitorState {
  progressPct: number;
  simTime: number;
  speedMultiplier: number;
  orderNumber: string;
  status: string;
  machines: MachineLiveStatus[];
  alarms: AlarmNotification[];
}

const initialState: MonitorState = {
  progressPct: 0,
  simTime: 0,
  speedMultiplier: 1,
  orderNumber: "",
  status: "",
  machines: [],
  alarms: [],
};

function applySnapshot(state: MonitorState, event: SimulationWsEvent): MonitorState {
  return {
    progressPct: event.progress_pct ?? state.progressPct,
    simTime: event.sim_time ?? state.simTime,
    speedMultiplier: event.speed_multiplier ?? state.speedMultiplier,
    orderNumber: event.order_number ?? state.orderNumber,
    status: event.status ?? state.status,
    machines: event.machines ?? state.machines,
    alarms: state.alarms,
  };
}

function monitorReducer(state: MonitorState, event: SimulationWsEvent): MonitorState {
  switch (event.type) {
    case "snapshot":
    case "started":
      return applySnapshot(state, event);
    case "tick":
      return {
        ...state,
        progressPct: event.progress_pct ?? state.progressPct,
        simTime: event.sim_time ?? state.simTime,
      };
    case "node_state":
      if (!event.machine) return state;
      return {
        ...state,
        machines: upsertMachine(state.machines, event.machine),
        simTime: event.sim_time ?? state.simTime,
      };
    case "metric":
      if (event.name === "order_progress_pct" && event.value !== undefined) {
        return { ...state, progressPct: Number(event.value) };
      }
      return state;
    case "speed_changed":
      return { ...state, speedMultiplier: event.speed_multiplier ?? state.speedMultiplier };
    case "alarm":
    case "error":
      return {
        ...state,
        alarms: [
          {
            id: `${Date.now()}-${Math.random()}`,
            severity: event.severity ?? (event.type === "error" ? "critical" : "warning"),
            message: event.message ?? "Unknown alarm",
            timestamp: event.timestamp ?? new Date().toISOString(),
            payload: event.payload,
          },
          ...state.alarms,
        ].slice(0, 30),
      };
    case "completed":
    case "stopped":
    case "session_finished":
      return {
        ...state,
        status: event.status ?? event.type,
        progressPct: event.progress_pct ?? state.progressPct,
        simTime: event.sim_time ?? state.simTime,
      };
    default:
      return state;
  }
}

function upsertMachine(machines: MachineLiveStatus[], machine: MachineLiveStatus): MachineLiveStatus[] {
  const index = machines.findIndex((m) => m.code === machine.code);
  if (index >= 0) {
    const next = [...machines];
    next[index] = machine;
    return next;
  }
  return [...machines, machine].sort((a, b) => a.sequence_order - b.sequence_order);
}

function sessionToWsEvent(session: SimulationSession): SimulationWsEvent {
  return {
    type: "snapshot",
    session_id: session.session_id,
    production_order_id: session.production_order_id,
    order_number: session.order_number,
    progress_pct: session.progress_pct,
    sim_time: session.sim_time,
    speed_multiplier: session.speed_multiplier,
    status: session.status,
    machines: session.machines,
    quantity_m: session.quantity_m,
  };
}

export default function SimulationMonitorPage() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [startOrderId, setStartOrderId] = useState("");
  const [monitorState, dispatch] = useReducer(monitorReducer, initialState);
  const [starting, setStarting] = useState(false);

  const { data: ordersData, loading: ordersLoading } = useAsyncData(
    () => fetchProductionOrders({ limit: 50 }),
    [],
  );

  const {
    data: sessions,
    loading: sessionsLoading,
    error: sessionsError,
    refetch: refetchSessions,
  } = useAsyncData(() => fetchSimulations(), []);

  const orders = ordersData?.items ?? [];
  const sessionList = sessions ?? [];

  const handleWsMessage = useCallback((data: unknown) => {
    dispatch(data as SimulationWsEvent);
  }, []);

  const { isConnected, send } = useWebSocket(
    selectedSessionId ? `/ws/simulations/${selectedSessionId}` : null,
    { onMessage: handleWsMessage },
  );

  useEffect(() => {
    if (!selectedSessionId) return;
    const session = sessionList.find((s) => s.session_id === selectedSessionId);
    if (session) {
      dispatch(sessionToWsEvent(session));
    }
  }, [selectedSessionId, sessionList]);

  useEffect(() => {
    const running = sessionList.find((s) => s.status === "running" || s.status === "pending");
    if (!selectedSessionId && running) {
      setSelectedSessionId(running.session_id);
    }
  }, [sessionList, selectedSessionId]);

  const handleStart = async () => {
    if (!startOrderId) return;
    setStarting(true);
    try {
      const session = await startSimulation({
        production_order_id: startOrderId,
        speed_multiplier: monitorState.speedMultiplier,
      });
      setSelectedSessionId(session.session_id);
      dispatch(sessionToWsEvent(session));
      refetchSessions();
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    if (!selectedSessionId) return;
    await stopSimulation(selectedSessionId);
    refetchSessions();
  };

  const handleSpeedChange = async (speed: number) => {
    dispatch({ type: "speed_changed", speed_multiplier: speed });
    send({ type: "set_speed", speed_multiplier: speed });
    if (selectedSessionId) {
      try {
        await setSimulationSpeed(selectedSessionId, speed);
      } catch {
        // WS command is primary; REST is fallback
      }
    }
  };

  const isRunning = monitorState.status === "running" || monitorState.status === "pending";

  return (
    <>
      <PageHeader
        title="Live Monitor"
        subtitle="Real-time machine status, production progress, and simulation control"
        action={
          <Chip
            icon={<FiberManualRecordIcon sx={{ fontSize: 12 }} />}
            label={isConnected ? "Connected" : "Disconnected"}
            color={isConnected ? "success" : "default"}
            size="small"
            variant={isConnected ? "filled" : "outlined"}
          />
        }
      />

      <PageState loading={ordersLoading || sessionsLoading} error={sessionsError}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Start Order</InputLabel>
              <Select
                label="Start Order"
                value={startOrderId}
                onChange={(e) => setStartOrderId(e.target.value)}
              >
                {orders.map((order) => (
                  <MenuItem key={order.id} value={order.id}>
                    {order.order_number}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={handleStart}
              disabled={!startOrderId || starting}
            >
              Start Simulation
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<StopIcon />}
              onClick={handleStop}
              disabled={!selectedSessionId || !isRunning}
            >
              Stop
            </Button>
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel>Active Session</InputLabel>
              <Select
                label="Active Session"
                value={selectedSessionId ?? ""}
                onChange={(e) => setSelectedSessionId(e.target.value || null)}
              >
                <MenuItem value="">None</MenuItem>
                {sessionList.map((s) => (
                  <MenuItem key={s.session_id} value={s.session_id}>
                    {s.order_number} ({s.status})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {monitorState.orderNumber && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Production Progress — {monitorState.orderNumber}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {monitorState.progressPct.toFixed(1)}% complete · sim time {monitorState.simTime.toFixed(1)}s ·{" "}
                {monitorState.status}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={monitorState.progressPct}
                sx={{ height: 10, borderRadius: 5 }}
              />
            </CardContent>
          </Card>
        )}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Running Orders
                </Typography>
                <RunningOrdersPanel
                  sessions={sessionList}
                  selectedSessionId={selectedSessionId}
                  onSelect={(id) => {
                    setSelectedSessionId(id);
                    const session = sessionList.find((s) => s.session_id === id);
                    if (session) dispatch(sessionToWsEvent(session));
                  }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <SpeedControl
                  speedMultiplier={monitorState.speedMultiplier}
                  onChange={handleSpeedChange}
                  disabled={!selectedSessionId || !isRunning}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Alarm Notifications
                </Typography>
                <AlarmFeed alarms={monitorState.alarms} />
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 8 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Live Machine Status
                </Typography>
                <LiveMachineGrid machines={monitorState.machines} />
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Queue Lengths
                </Typography>
                <QueueLengthChart machines={monitorState.machines} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </PageState>
    </>
  );
}
