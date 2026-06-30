from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.api.deps import get_current_user
from app.database import get_db
from app.models import CableType, Machine, MachineStatus, MachineType, OrderPriority, OrderStatus, ProductionOrder, User
from app.schemas.auth import PaginatedResponse
from app.schemas.domain import CableTypeResponse, MachineResponse, ProductionOrderResponse
from app.schemas.mappers import cable_type_response, machine_response, production_order_response

router = APIRouter(tags=["resources"])


@router.get("/production-orders", response_model=PaginatedResponse[ProductionOrderResponse])
async def list_production_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[ProductionOrderResponse]:
    query = select(ProductionOrder).options(joinedload(ProductionOrder.cable_type))
    count_query = select(func.count()).select_from(ProductionOrder)

    if search:
        pattern = f"%{search}%"
        filt = or_(ProductionOrder.order_number.ilike(pattern), ProductionOrder.notes.ilike(pattern))
        query = query.where(filt)
        count_query = count_query.where(filt)
    if status:
        order_status = OrderStatus(status)
        query = query.where(ProductionOrder.status == order_status)
        count_query = count_query.where(ProductionOrder.status == order_status)
    if priority:
        order_priority = OrderPriority(priority)
        query = query.where(ProductionOrder.priority == order_priority)
        count_query = count_query.where(ProductionOrder.priority == order_priority)

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.order_by(ProductionOrder.created_at.desc()).offset(skip).limit(limit))
    items = result.scalars().unique().all()
    return PaginatedResponse(
        items=[production_order_response(o) for o in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/machines", response_model=PaginatedResponse[MachineResponse])
async def list_machines(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: str | None = None,
    machine_type: MachineType | None = None,
    status: MachineStatus | None = None,
    is_active: bool | None = None,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[MachineResponse]:
    query = select(Machine)
    count_query = select(func.count()).select_from(Machine)

    if search:
        pattern = f"%{search}%"
        filt = or_(Machine.code.ilike(pattern), Machine.name.ilike(pattern), Machine.location.ilike(pattern))
        query = query.where(filt)
        count_query = count_query.where(filt)
    if machine_type:
        query = query.where(Machine.machine_type == machine_type)
        count_query = count_query.where(Machine.machine_type == machine_type)
    if status:
        query = query.where(Machine.status == status)
        count_query = count_query.where(Machine.status == status)
    if is_active is not None:
        query = query.where(Machine.is_active == is_active)
        count_query = count_query.where(Machine.is_active == is_active)

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.order_by(Machine.code).offset(skip).limit(limit))
    items = result.scalars().all()
    return PaginatedResponse(
        items=[machine_response(m) for m in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/cable-types", response_model=PaginatedResponse[CableTypeResponse])
async def list_cable_types(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: str | None = None,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[CableTypeResponse]:
    query = select(CableType)
    count_query = select(func.count()).select_from(CableType)

    if search:
        pattern = f"%{search}%"
        filt = or_(CableType.code.ilike(pattern), CableType.name.ilike(pattern))
        query = query.where(filt)
        count_query = count_query.where(filt)

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.order_by(CableType.code).offset(skip).limit(limit))
    items = result.scalars().all()
    return PaginatedResponse(
        items=[cable_type_response(c) for c in items],
        total=total,
        skip=skip,
        limit=limit,
    )
