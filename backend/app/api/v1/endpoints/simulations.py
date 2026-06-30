from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.api.deps import get_current_user
from app.database import get_db
from app.models import Machine, ProductionOrder, User, WorkflowStep
from app.schemas.domain import (
    SimulationSessionResponse,
    SimulationSpeedRequest,
    SimulationStartRequest,
)
from app.services.simulation.manager import simulation_manager
from app.websockets.manager import ws_manager

router = APIRouter(prefix="/simulations", tags=["simulations"])


async def _broadcast(payload: dict) -> None:
    session_id = payload.get("session_id")
    if not session_id:
        return
    if payload.get("type") == "started":
        payload = {**payload, "type": "snapshot"}
    await ws_manager.broadcast(session_id, payload)


@router.get("", response_model=list[SimulationSessionResponse])
async def list_simulations(_: User = Depends(get_current_user)) -> list[SimulationSessionResponse]:
    return simulation_manager.list_sessions()


@router.get("/{session_id}", response_model=SimulationSessionResponse)
async def get_simulation(
    session_id: str,
    _: User = Depends(get_current_user),
) -> SimulationSessionResponse:
    session = simulation_manager.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return simulation_manager._to_response(session)


@router.post("/start", response_model=SimulationSessionResponse, status_code=status.HTTP_201_CREATED)
async def start_simulation(
    payload: SimulationStartRequest,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SimulationSessionResponse:
    result = await db.execute(
        select(ProductionOrder).where(ProductionOrder.id == UUID(payload.production_order_id))
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Production order not found")

    steps_result = await db.execute(
        select(WorkflowStep)
        .options(joinedload(WorkflowStep.machine))
        .where(WorkflowStep.production_order_id == order.id)
        .order_by(WorkflowStep.sequence_order)
    )
    steps = steps_result.scalars().unique().all()

    machines_data: list[dict] = []
    seen: set[str] = set()
    for step in steps:
        if step.machine and step.machine.code not in seen:
            seen.add(step.machine.code)
            machines_data.append(
                {
                    "code": step.machine.code,
                    "name": step.machine.name,
                    "machine_type": step.machine.machine_type.value,
                }
            )

    if not machines_data:
        all_machines = (await db.execute(select(Machine).where(Machine.is_active.is_(True)))).scalars().all()
        machines_data = [
            {"code": m.code, "name": m.name, "machine_type": m.machine_type.value}
            for m in all_machines[:5]
        ]

    try:
        session = await simulation_manager.start(
            production_order_id=str(order.id),
            order_number=order.order_number,
            quantity_m=order.quantity_m,
            machines=machines_data,
            speed_multiplier=payload.speed_multiplier,
            random_seed=payload.random_seed,
            broadcast=_broadcast,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc)) from exc

    return session


@router.post("/{session_id}/stop", response_model=SimulationSessionResponse)
async def stop_simulation(
    session_id: str,
    _: User = Depends(get_current_user),
) -> SimulationSessionResponse:
    try:
        return await simulation_manager.stop(session_id)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found") from exc


@router.patch("/{session_id}/speed", response_model=SimulationSessionResponse)
async def update_simulation_speed(
    session_id: str,
    payload: SimulationSpeedRequest,
    _: User = Depends(get_current_user),
) -> SimulationSessionResponse:
    try:
        return await simulation_manager.set_speed(session_id, payload.speed_multiplier)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found") from exc
