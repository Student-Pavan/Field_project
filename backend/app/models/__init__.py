import enum
import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class UserRole(str, enum.Enum):
    admin = "admin"
    supervisor = "supervisor"
    operator = "operator"


class OrderStatus(str, enum.Enum):
    draft = "draft"
    scheduled = "scheduled"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"
    on_hold = "on_hold"


class OrderPriority(str, enum.Enum):
    low = "low"
    normal = "normal"
    high = "high"
    urgent = "urgent"


class MachineType(str, enum.Enum):
    extruder = "extruder"
    strander = "strander"
    armoring = "armoring"
    jacketing = "jacketing"
    capstan = "capstan"
    tester = "tester"
    spooler = "spooler"


class MachineStatus(str, enum.Enum):
    idle = "idle"
    running = "running"
    maintenance = "maintenance"
    fault = "fault"
    offline = "offline"


class WorkflowStepKind(str, enum.Enum):
    process = "process"
    quality_inspection = "quality_inspection"
    conditional = "conditional"
    rework = "rework"
    scrap = "scrap"
    completion = "completion"


class WorkflowStepType(str, enum.Enum):
    extrusion = "extrusion"
    stranding = "stranding"
    armoring = "armoring"
    jacketing = "jacketing"
    testing = "testing"
    spooling = "spooling"


class WorkflowStepStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    skipped = "skipped"
    failed = "failed"
    rework = "rework"
    scrapped = "scrapped"


class WorkflowExecutionStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    scrapped = "scrapped"
    failed = "failed"
    on_hold = "on_hold"


class ReportType(str, enum.Enum):
    production_summary = "production_summary"
    quality = "quality"
    simulation = "simulation"
    efficiency = "efficiency"
    daily = "daily"


class AlarmSeverity(str, enum.Enum):
    info = "info"
    warning = "warning"
    critical = "critical"
    emergency = "emergency"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), default=UserRole.operator)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class CableType(Base, TimestampMixin):
    __tablename__ = "cable_types"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    conductor_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    diameter_mm: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    insulation_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    voltage_rating_kv: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    max_length_m: Mapped[int | None] = mapped_column(Integer, nullable=True)


class Machine(Base, TimestampMixin):
    __tablename__ = "machines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    machine_type: Mapped[MachineType] = mapped_column(Enum(MachineType, name="machine_type"))
    status: Mapped[MachineStatus] = mapped_column(
        Enum(MachineStatus, name="machine_status"), default=MachineStatus.idle
    )
    location: Mapped[str] = mapped_column(String(128), default="")
    capacity_m_per_min: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)


class ProductionOrder(Base, TimestampMixin):
    __tablename__ = "production_orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_number: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    cable_type_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cable_types.id"))
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    quantity_m: Mapped[int] = mapped_column(Integer)
    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus, name="order_status"))
    priority: Mapped[OrderPriority] = mapped_column(Enum(OrderPriority, name="order_priority"))
    requested_delivery_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    cable_type: Mapped[CableType] = relationship(lazy="joined")
    workflow_steps: Mapped[list["WorkflowStep"]] = relationship(
        back_populates="production_order", order_by="WorkflowStep.sequence_order"
    )
    execution: Mapped["WorkflowExecution | None"] = relationship(back_populates="production_order", uselist=False)


class WorkflowTemplate(Base, TimestampMixin):
    __tablename__ = "workflow_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cable_type_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cable_types.id"))
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    entry_step_key: Mapped[str] = mapped_column(String(64))

    steps: Mapped[list["WorkflowStepTemplate"]] = relationship(
        back_populates="template", order_by="WorkflowStepTemplate.sequence_order"
    )


class WorkflowStepTemplate(Base):
    __tablename__ = "workflow_step_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workflow_templates.id", ondelete="CASCADE"))
    step_key: Mapped[str] = mapped_column(String(64))
    name: Mapped[str] = mapped_column(String(255))
    step_kind: Mapped[WorkflowStepKind] = mapped_column(Enum(WorkflowStepKind, name="workflow_step_kind"))
    step_type: Mapped[WorkflowStepType | None] = mapped_column(
        Enum(WorkflowStepType, name="workflow_step_type"), nullable=True
    )
    machine_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("machines.id"), nullable=True)
    sequence_order: Mapped[int] = mapped_column(Integer)
    planned_duration_min: Mapped[float] = mapped_column(Numeric(10, 2))
    parameters: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    routing: Mapped[dict] = mapped_column(JSONB, default=dict)

    template: Mapped[WorkflowTemplate] = relationship(back_populates="steps")
    machine: Mapped[Machine | None] = relationship(lazy="joined")


class WorkflowExecution(Base, TimestampMixin):
    __tablename__ = "workflow_executions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    production_order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("production_orders.id", ondelete="CASCADE"), unique=True
    )
    template_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workflow_templates.id"))
    status: Mapped[WorkflowExecutionStatus] = mapped_column(
        Enum(WorkflowExecutionStatus, name="workflow_execution_status"), default=WorkflowExecutionStatus.pending
    )
    current_step_key: Mapped[str | None] = mapped_column(String(64), nullable=True)
    context: Mapped[dict] = mapped_column(JSONB, default=dict)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    production_order: Mapped[ProductionOrder] = relationship(back_populates="execution")
    steps: Mapped[list["WorkflowStep"]] = relationship(
        back_populates="execution", order_by="WorkflowStep.sequence_order"
    )


class WorkflowStep(Base):
    __tablename__ = "workflow_steps"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    production_order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("production_orders.id", ondelete="CASCADE"), index=True
    )
    execution_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("workflow_executions.id", ondelete="CASCADE"), nullable=True
    )
    machine_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("machines.id"), nullable=True)
    step_key: Mapped[str | None] = mapped_column(String(64), nullable=True)
    step_kind: Mapped[str | None] = mapped_column(String(64), nullable=True)
    sequence_order: Mapped[int] = mapped_column(Integer)
    step_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[WorkflowStepStatus] = mapped_column(
        Enum(WorkflowStepStatus, name="workflow_step_status"), default=WorkflowStepStatus.pending
    )
    outcome: Mapped[str | None] = mapped_column(String(64), nullable=True)
    planned_duration_min: Mapped[float] = mapped_column(Numeric(10, 2))
    actual_duration_min: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    inspection_result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    rework_attempt: Mapped[int] = mapped_column(Integer, default=0)

    production_order: Mapped[ProductionOrder] = relationship(back_populates="workflow_steps")
    execution: Mapped[WorkflowExecution | None] = relationship(back_populates="steps")
    machine: Mapped[Machine | None] = relationship(lazy="joined")


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    production_order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("production_orders.id"))
    generated_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    report_type: Mapped[ReportType] = mapped_column(Enum(ReportType, name="report_type"))
    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[dict] = mapped_column(JSONB, default=dict)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Alarm(Base):
    __tablename__ = "alarms"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    machine_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("machines.id"), nullable=True)
    production_order_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("production_orders.id"), nullable=True
    )
    severity: Mapped[AlarmSeverity] = mapped_column(Enum(AlarmSeverity, name="alarm_severity"))
    code: Mapped[str] = mapped_column(String(64))
    message: Mapped[str] = mapped_column(Text)
    is_acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    acknowledged_by_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
