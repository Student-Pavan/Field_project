"""Serialization helpers for API responses."""

from app.models import (
    CableType,
    Machine,
    ProductionOrder,
    Report,
    WorkflowExecution,
    WorkflowStep,
    WorkflowStepTemplate,
    WorkflowTemplate,
)
from app.schemas.domain import (
    CableTypeBrief,
    CableTypeResponse,
    MachineBrief,
    MachineResponse,
    ProductionOrderResponse,
    ReportResponse,
    WorkflowExecutionResponse,
    WorkflowStepResponse,
    WorkflowStepTemplateResponse,
    WorkflowTemplateResponse,
)


def machine_brief(machine: Machine | None) -> MachineBrief | None:
    if machine is None:
        return None
    return MachineBrief(
        id=str(machine.id),
        code=machine.code,
        name=machine.name,
        machine_type=machine.machine_type.value,
    )


def machine_response(machine: Machine) -> MachineResponse:
    return MachineResponse(
        id=str(machine.id),
        code=machine.code,
        name=machine.name,
        machine_type=machine.machine_type.value,
        status=machine.status.value,
        location=machine.location,
        capacity_m_per_min=str(machine.capacity_m_per_min),
        is_active=machine.is_active,
        description=machine.description,
        created_at=machine.created_at.isoformat(),
        updated_at=machine.updated_at.isoformat(),
    )


def cable_type_brief(cable: CableType | None) -> CableTypeBrief | None:
    if cable is None:
        return None
    return CableTypeBrief(id=str(cable.id), code=cable.code, name=cable.name)


def cable_type_response(cable: CableType) -> CableTypeResponse:
    return CableTypeResponse(
        id=str(cable.id),
        code=cable.code,
        name=cable.name,
        description=cable.description,
    )


def production_order_response(order: ProductionOrder) -> ProductionOrderResponse:
    return ProductionOrderResponse(
        id=str(order.id),
        order_number=order.order_number,
        cable_type_id=str(order.cable_type_id),
        created_by_user_id=str(order.created_by_user_id),
        quantity_m=order.quantity_m,
        status=order.status.value,
        priority=order.priority.value,
        requested_delivery_date=order.requested_delivery_date.isoformat() if order.requested_delivery_date else None,
        started_at=order.started_at.isoformat() if order.started_at else None,
        completed_at=order.completed_at.isoformat() if order.completed_at else None,
        notes=order.notes,
        created_at=order.created_at.isoformat(),
        updated_at=order.updated_at.isoformat(),
        cable_type=cable_type_brief(order.cable_type),
    )


def workflow_step_response(step: WorkflowStep) -> WorkflowStepResponse:
    return WorkflowStepResponse(
        id=str(step.id),
        production_order_id=str(step.production_order_id),
        step_key=step.step_key,
        step_kind=step.step_kind,
        sequence_order=step.sequence_order,
        step_type=step.step_type,
        status=step.status.value,
        outcome=step.outcome,
        planned_duration_min=str(step.planned_duration_min),
        actual_duration_min=str(step.actual_duration_min) if step.actual_duration_min is not None else None,
        inspection_result=step.inspection_result,
        rework_attempt=step.rework_attempt,
        machine=machine_brief(step.machine),
    )


def workflow_execution_response(execution: WorkflowExecution) -> WorkflowExecutionResponse:
    return WorkflowExecutionResponse(
        id=str(execution.id),
        production_order_id=str(execution.production_order_id),
        template_id=str(execution.template_id),
        status=execution.status.value,
        current_step_key=execution.current_step_key,
        context=execution.context or {},
        started_at=execution.started_at.isoformat() if execution.started_at else None,
        completed_at=execution.completed_at.isoformat() if execution.completed_at else None,
        steps=[workflow_step_response(s) for s in execution.steps],
    )


def workflow_step_template_response(step: WorkflowStepTemplate) -> WorkflowStepTemplateResponse:
    return WorkflowStepTemplateResponse(
        id=str(step.id),
        template_id=str(step.template_id),
        step_key=step.step_key,
        name=step.name,
        step_kind=step.step_kind.value,
        step_type=step.step_type.value if step.step_type else None,
        machine_id=str(step.machine_id) if step.machine_id else None,
        sequence_order=step.sequence_order,
        planned_duration_min=str(step.planned_duration_min),
        parameters=step.parameters,
        routing=step.routing or {},
        machine=machine_brief(step.machine),
    )


def workflow_template_response(template: WorkflowTemplate) -> WorkflowTemplateResponse:
    return WorkflowTemplateResponse(
        id=str(template.id),
        cable_type_id=str(template.cable_type_id),
        name=template.name,
        description=template.description,
        version=template.version,
        is_active=template.is_active,
        entry_step_key=template.entry_step_key,
        created_at=template.created_at.isoformat(),
        updated_at=template.updated_at.isoformat(),
        steps=[workflow_step_template_response(s) for s in template.steps],
    )


def report_response(report: Report) -> ReportResponse:
    return ReportResponse(
        id=str(report.id),
        production_order_id=str(report.production_order_id),
        generated_by_user_id=str(report.generated_by_user_id),
        report_type=report.report_type.value,
        title=report.title,
        summary=report.summary,
        content=report.content or {},
        generated_at=report.generated_at.isoformat(),
    )
