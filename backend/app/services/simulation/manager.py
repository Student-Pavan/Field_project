import asyncio
import random
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Callable

from app.config import settings
from app.schemas.domain import MachineLiveStatus, SimulationSessionResponse


@dataclass
class SimulationSession:
    session_id: str
    production_order_id: str
    order_number: str
    quantity_m: int
    speed_multiplier: float = 1.0
    status: str = "pending"
    progress_pct: float = 0.0
    sim_time: float = 0.0
    error_message: str | None = None
    machines: list[MachineLiveStatus] = field(default_factory=list)
    _task: asyncio.Task | None = field(default=None, repr=False)
    _stop_requested: bool = field(default=False, repr=False)
    _broadcast: Callable[[dict[str, Any]], Any] | None = field(default=None, repr=False)


class SimulationManager:
    def __init__(self) -> None:
        self._sessions: dict[str, SimulationSession] = {}
        self._lock = asyncio.Lock()

    def list_sessions(self) -> list[SimulationSessionResponse]:
        return [self._to_response(s) for s in self._sessions.values()]

    def get_session(self, session_id: str) -> SimulationSession | None:
        return self._sessions.get(session_id)

    async def start(
        self,
        production_order_id: str,
        order_number: str,
        quantity_m: int,
        machines: list[dict[str, Any]],
        speed_multiplier: float = 1.0,
        random_seed: int | None = None,
        broadcast: Callable[[dict[str, Any]], Any] | None = None,
    ) -> SimulationSessionResponse:
        async with self._lock:
            running = sum(1 for s in self._sessions.values() if s.status in ("running", "pending"))
            if running >= settings.simulation_max_concurrent:
                raise RuntimeError("Maximum concurrent simulations reached")

            session_id = str(uuid.uuid4())
            live_machines = [
                MachineLiveStatus(
                    machine_kind=m["machine_type"],
                    code=m["code"],
                    name=m["name"],
                    status="idle",
                    queue_length=0,
                    queue_capacity=10,
                    failure_probability=0.02,
                    jobs_processed=0,
                    failure_count=0,
                    sequence_order=i,
                )
                for i, m in enumerate(machines)
            ]

            session = SimulationSession(
                session_id=session_id,
                production_order_id=production_order_id,
                order_number=order_number,
                quantity_m=quantity_m,
                speed_multiplier=speed_multiplier,
                status="pending",
                machines=live_machines,
                _broadcast=broadcast,
            )
            self._sessions[session_id] = session
            session._task = asyncio.create_task(
                self._run_simulation(session, random_seed),
                name=f"sim-{session_id}",
            )
            return self._to_response(session)

    async def stop(self, session_id: str) -> SimulationSessionResponse:
        session = self._sessions.get(session_id)
        if session is None:
            raise KeyError(session_id)
        session._stop_requested = True
        if session._task and not session._task.done():
            session._task.cancel()
        session.status = "stopped"
        await self._emit(session, {"type": "stopped", "status": "stopped"})
        return self._to_response(session)

    async def set_speed(self, session_id: str, speed_multiplier: float) -> SimulationSessionResponse:
        session = self._sessions.get(session_id)
        if session is None:
            raise KeyError(session_id)
        session.speed_multiplier = speed_multiplier
        await self._emit(session, {"type": "speed_changed", "speed_multiplier": speed_multiplier})
        return self._to_response(session)

    async def handle_ws_command(self, session_id: str, message: dict[str, Any]) -> None:
        msg_type = message.get("type")
        if msg_type == "stop":
            await self.stop(session_id)
        elif msg_type == "set_speed":
            speed = float(message.get("speed_multiplier", 1.0))
            await self.set_speed(session_id, speed)
        elif msg_type == "ping":
            session = self._sessions.get(session_id)
            if session:
                await self._emit(session, {"type": "pong"})

    async def _emit(self, session: SimulationSession, event: dict[str, Any]) -> None:
        payload = {
            "session_id": session.session_id,
            "production_order_id": session.production_order_id,
            "order_number": session.order_number,
            "progress_pct": session.progress_pct,
            "sim_time": session.sim_time,
            "speed_multiplier": session.speed_multiplier,
            "status": session.status,
            "quantity_m": session.quantity_m,
            **event,
        }
        if session._broadcast:
            await session._broadcast(payload)

    async def _run_simulation(self, session: SimulationSession, random_seed: int | None) -> None:
        rng = random.Random(random_seed)
        tick_seconds = settings.simulation_default_tick_ms / 1000.0
        session.status = "running"

        await self._emit(
            session,
            {
                "type": "started",
                "machines": [m.model_dump() for m in session.machines],
            },
        )

        try:
            total_steps = max(len(session.machines), 1)
            produced_per_tick = session.quantity_m / (total_steps * 20)

            for step_idx, machine in enumerate(session.machines):
                if session._stop_requested:
                    break

                machine.status = "running"
                machine.queue_length = min(machine.queue_length + 2, machine.queue_capacity)
                await self._emit(
                    session,
                    {
                        "type": "node_state",
                        "machine": machine.model_dump(),
                        "sim_time": session.sim_time,
                    },
                )

                ticks = max(3, int(8 / session.speed_multiplier))
                for _ in range(ticks):
                    if session._stop_requested:
                        break
                    await asyncio.sleep(tick_seconds / session.speed_multiplier)
                    session.sim_time += tick_seconds * session.speed_multiplier
                    session.progress_pct = min(
                        100.0,
                        session.progress_pct + (100.0 / (total_steps * ticks)),
                    )
                    machine.queue_length = max(0, machine.queue_length - 1)
                    machine.jobs_processed += 1
                    machine.sim_time = session.sim_time

                    if rng.random() < (machine.failure_probability or 0.02):
                        machine.failure_count += 1
                        machine.status = "fault"
                        await self._emit(
                            session,
                            {
                                "type": "alarm",
                                "severity": "warning",
                                "message": f"Fault detected on {machine.name}",
                                "timestamp": datetime.now(UTC).isoformat(),
                                "machine": machine.model_dump(),
                            },
                        )
                        await asyncio.sleep(0.5 / session.speed_multiplier)
                        machine.status = "running"

                    await self._emit(
                        session,
                        {
                            "type": "tick",
                            "progress_pct": session.progress_pct,
                            "sim_time": session.sim_time,
                        },
                    )
                    await self._emit(
                        session,
                        {
                            "type": "metric",
                            "name": "order_progress_pct",
                            "value": session.progress_pct,
                        },
                    )

                machine.status = "idle"
                machine.queue_length = 0
                await self._emit(
                    session,
                    {
                        "type": "node_state",
                        "machine": machine.model_dump(),
                        "sim_time": session.sim_time,
                    },
                )

            if session._stop_requested:
                session.status = "stopped"
                await self._emit(session, {"type": "session_finished", "status": "stopped"})
            else:
                session.progress_pct = 100.0
                session.status = "completed"
                await self._emit(
                    session,
                    {
                        "type": "completed",
                        "status": "completed",
                        "summary": {
                            "duration_s": session.sim_time,
                            "units_produced": session.quantity_m,
                        },
                    },
                )
                await self._emit(session, {"type": "session_finished", "status": "completed"})
        except asyncio.CancelledError:
            session.status = "stopped"
            await self._emit(session, {"type": "stopped", "status": "stopped"})
        except Exception as exc:
            session.status = "failed"
            session.error_message = str(exc)
            await self._emit(
                session,
                {"type": "error", "message": str(exc), "severity": "critical"},
            )

    def _to_response(self, session: SimulationSession) -> SimulationSessionResponse:
        return SimulationSessionResponse(
            session_id=session.session_id,
            production_order_id=session.production_order_id,
            order_number=session.order_number,
            quantity_m=session.quantity_m,
            speed_multiplier=session.speed_multiplier,
            status=session.status,
            progress_pct=round(session.progress_pct, 2),
            sim_time=round(session.sim_time, 2),
            error_message=session.error_message,
            machines=session.machines,
        )


simulation_manager = SimulationManager()
