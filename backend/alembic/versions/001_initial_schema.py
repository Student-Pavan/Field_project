"""Initial schema

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-06-30
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    user_role = postgresql.ENUM("admin", "supervisor", "operator", name="user_role", create_type=False)
    order_status = postgresql.ENUM(
        "draft", "scheduled", "in_progress", "completed", "cancelled", "on_hold",
        name="order_status", create_type=False,
    )
    order_priority = postgresql.ENUM("low", "normal", "high", "urgent", name="order_priority", create_type=False)
    machine_type = postgresql.ENUM(
        "extruder", "strander", "armoring", "jacketing", "capstan", "tester", "spooler",
        name="machine_type", create_type=False,
    )
    machine_status = postgresql.ENUM(
        "idle", "running", "maintenance", "fault", "offline",
        name="machine_status", create_type=False,
    )
    workflow_step_kind = postgresql.ENUM(
        "process", "quality_inspection", "conditional", "rework", "scrap", "completion",
        name="workflow_step_kind", create_type=False,
    )
    workflow_step_type = postgresql.ENUM(
        "extrusion", "stranding", "armoring", "jacketing", "testing", "spooling",
        name="workflow_step_type", create_type=False,
    )
    workflow_step_status = postgresql.ENUM(
        "pending", "in_progress", "completed", "skipped", "failed", "rework", "scrapped",
        name="workflow_step_status", create_type=False,
    )
    workflow_execution_status = postgresql.ENUM(
        "pending", "running", "completed", "scrapped", "failed", "on_hold",
        name="workflow_execution_status", create_type=False,
    )
    report_type = postgresql.ENUM(
        "production_summary", "quality", "simulation", "efficiency", "daily",
        name="report_type", create_type=False,
    )
    alarm_severity = postgresql.ENUM("info", "warning", "critical", "emergency", name="alarm_severity", create_type=False)

    for enum_type in (
        user_role, order_status, order_priority, machine_type, machine_status,
        workflow_step_kind, workflow_step_type, workflow_step_status,
        workflow_execution_status, report_type, alarm_severity,
    ):
        enum_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("username", sa.String(64), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    op.create_table(
        "cable_types",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(32), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("conductor_count", sa.Integer(), nullable=True),
        sa.Column("diameter_mm", sa.Numeric(8, 2), nullable=True),
        sa.Column("insulation_type", sa.String(64), nullable=True),
        sa.Column("voltage_rating_kv", sa.Numeric(6, 2), nullable=True),
        sa.Column("max_length_m", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_cable_types_code", "cable_types", ["code"], unique=True)

    op.create_table(
        "machines",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(32), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("machine_type", machine_type, nullable=False),
        sa.Column("status", machine_status, nullable=False),
        sa.Column("location", sa.String(128), nullable=False),
        sa.Column("capacity_m_per_min", sa.Numeric(10, 2), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_machines_code", "machines", ["code"], unique=True)

    op.create_table(
        "production_orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_number", sa.String(64), nullable=False),
        sa.Column("cable_type_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cable_types.id"), nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("quantity_m", sa.Integer(), nullable=False),
        sa.Column("status", order_status, nullable=False),
        sa.Column("priority", order_priority, nullable=False),
        sa.Column("requested_delivery_date", sa.Date(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_production_orders_order_number", "production_orders", ["order_number"], unique=True)

    op.create_table(
        "workflow_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("cable_type_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cable_types.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("entry_step_key", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "workflow_step_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workflow_templates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("step_key", sa.String(64), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("step_kind", workflow_step_kind, nullable=False),
        sa.Column("step_type", workflow_step_type, nullable=True),
        sa.Column("machine_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("machines.id"), nullable=True),
        sa.Column("sequence_order", sa.Integer(), nullable=False),
        sa.Column("planned_duration_min", sa.Numeric(10, 2), nullable=False),
        sa.Column("parameters", postgresql.JSONB(), nullable=True),
        sa.Column("routing", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
    )

    op.create_table(
        "workflow_executions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("production_order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("production_orders.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workflow_templates.id"), nullable=False),
        sa.Column("status", workflow_execution_status, nullable=False),
        sa.Column("current_step_key", sa.String(64), nullable=True),
        sa.Column("context", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "workflow_steps",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("production_order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("production_orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("execution_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workflow_executions.id", ondelete="CASCADE"), nullable=True),
        sa.Column("machine_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("machines.id"), nullable=True),
        sa.Column("step_key", sa.String(64), nullable=True),
        sa.Column("step_kind", sa.String(64), nullable=True),
        sa.Column("sequence_order", sa.Integer(), nullable=False),
        sa.Column("step_type", sa.String(64), nullable=True),
        sa.Column("status", workflow_step_status, nullable=False),
        sa.Column("outcome", sa.String(64), nullable=True),
        sa.Column("planned_duration_min", sa.Numeric(10, 2), nullable=False),
        sa.Column("actual_duration_min", sa.Numeric(10, 2), nullable=True),
        sa.Column("inspection_result", postgresql.JSONB(), nullable=True),
        sa.Column("rework_attempt", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )
    op.create_index("ix_workflow_steps_production_order_id", "workflow_steps", ["production_order_id"])

    op.create_table(
        "reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("production_order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("production_orders.id"), nullable=False),
        sa.Column("generated_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("report_type", report_type, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("content", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "alarms",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("machine_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("machines.id"), nullable=True),
        sa.Column("production_order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("production_orders.id"), nullable=True),
        sa.Column("severity", alarm_severity, nullable=False),
        sa.Column("code", sa.String(64), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_acknowledged", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("acknowledged_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("triggered_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("alarms")
    op.drop_table("reports")
    op.drop_index("ix_workflow_steps_production_order_id", table_name="workflow_steps")
    op.drop_table("workflow_steps")
    op.drop_table("workflow_executions")
    op.drop_table("workflow_step_templates")
    op.drop_table("workflow_templates")
    op.drop_index("ix_production_orders_order_number", table_name="production_orders")
    op.drop_table("production_orders")
    op.drop_index("ix_machines_code", table_name="machines")
    op.drop_table("machines")
    op.drop_index("ix_cable_types_code", table_name="cable_types")
    op.drop_table("cable_types")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    for name in (
        "alarm_severity", "report_type", "workflow_execution_status", "workflow_step_status",
        "workflow_step_type", "workflow_step_kind", "machine_status", "machine_type",
        "order_priority", "order_status", "user_role",
    ):
        sa.Enum(name=name).drop(op.get_bind(), checkfirst=True)
