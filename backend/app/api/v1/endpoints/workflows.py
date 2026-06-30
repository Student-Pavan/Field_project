from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.api.deps import get_current_user
from app.database import get_db
from app.models import User, WorkflowExecution, WorkflowStep, WorkflowStepKind, WorkflowStepStatus, WorkflowStepTemplate, WorkflowStepType, WorkflowTemplate
from app.schemas.auth import PaginatedResponse
from app.schemas.domain import (
    WorkflowExecutionResponse,
    WorkflowStepResponse,
    WorkflowTemplateCreate,
    WorkflowTemplateResponse,
)
from app.schemas.mappers import (
    workflow_execution_response,
    workflow_step_response,
    workflow_template_response,
)

router = APIRouter(tags=["workflows"])


@router.get("/workflows", response_model=PaginatedResponse[WorkflowStepResponse])
async def list_workflow_steps(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    production_order_id: str | None = None,
    status: str | None = None,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[WorkflowStepResponse]:
    query = select(WorkflowStep).options(joinedload(WorkflowStep.machine))
    count_query = select(func.count()).select_from(WorkflowStep)

    if production_order_id:
        query = query.where(WorkflowStep.production_order_id == UUID(production_order_id))
        count_query = count_query.where(WorkflowStep.production_order_id == UUID(production_order_id))
    if status:
        step_status = WorkflowStepStatus(status)
        query = query.where(WorkflowStep.status == step_status)
        count_query = count_query.where(WorkflowStep.status == step_status)

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.order_by(WorkflowStep.sequence_order).offset(skip).limit(limit))
    items = result.scalars().unique().all()
    return PaginatedResponse(
        items=[workflow_step_response(s) for s in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/workflows/executions/{order_id}", response_model=WorkflowExecutionResponse)
async def get_workflow_execution(
    order_id: UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkflowExecutionResponse:
    result = await db.execute(
        select(WorkflowExecution)
        .options(joinedload(WorkflowExecution.steps).joinedload(WorkflowStep.machine))
        .where(WorkflowExecution.production_order_id == order_id)
    )
    execution = result.unique().scalar_one_or_none()
    if execution is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow execution not found")
    return workflow_execution_response(execution)


@router.get("/workflow-templates", response_model=PaginatedResponse[WorkflowTemplateResponse])
async def list_workflow_templates(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    cable_type_id: str | None = None,
    is_active: bool | None = None,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[WorkflowTemplateResponse]:
    query = select(WorkflowTemplate).options(
        joinedload(WorkflowTemplate.steps).joinedload(WorkflowStepTemplate.machine)
    )
    count_query = select(func.count()).select_from(WorkflowTemplate)

    if cable_type_id:
        query = query.where(WorkflowTemplate.cable_type_id == UUID(cable_type_id))
        count_query = count_query.where(WorkflowTemplate.cable_type_id == UUID(cable_type_id))
    if is_active is not None:
        query = query.where(WorkflowTemplate.is_active == is_active)
        count_query = count_query.where(WorkflowTemplate.is_active == is_active)

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.order_by(WorkflowTemplate.name).offset(skip).limit(limit))
    items = result.unique().scalars().all()
    return PaginatedResponse(
        items=[workflow_template_response(t) for t in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/workflow-templates/{template_id}", response_model=WorkflowTemplateResponse)
async def get_workflow_template(
    template_id: UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkflowTemplateResponse:
    result = await db.execute(
        select(WorkflowTemplate)
        .options(joinedload(WorkflowTemplate.steps).joinedload(WorkflowStepTemplate.machine))
        .where(WorkflowTemplate.id == template_id)
    )
    template = result.unique().scalar_one_or_none()
    if template is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    return workflow_template_response(template)


@router.post("/workflow-templates", response_model=WorkflowTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow_template(
    payload: WorkflowTemplateCreate,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkflowTemplateResponse:
    template = WorkflowTemplate(
        cable_type_id=UUID(payload.cable_type_id),
        name=payload.name,
        description=payload.description,
        version=payload.version,
        is_active=payload.is_active,
        entry_step_key=payload.entry_step_key,
    )
    db.add(template)
    await db.flush()

    for step in payload.steps:
        db.add(
            WorkflowStepTemplate(
                template_id=template.id,
                step_key=step.step_key,
                name=step.name,
                step_kind=WorkflowStepKind(step.step_kind),
                step_type=WorkflowStepType(step.step_type) if step.step_type else None,
                machine_id=UUID(step.machine_id) if step.machine_id else None,
                sequence_order=step.sequence_order,
                planned_duration_min=step.planned_duration_min,
                parameters=step.parameters,
                routing=step.routing.model_dump(),
            )
        )

    await db.flush()
    result = await db.execute(
        select(WorkflowTemplate)
        .options(joinedload(WorkflowTemplate.steps).joinedload(WorkflowStepTemplate.machine))
        .where(WorkflowTemplate.id == template.id)
    )
    created = result.unique().scalar_one()
    return workflow_template_response(created)
