"""Seed database with sample data if empty."""

import asyncio
import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import select

from app.core.security import hash_password
from app.database import async_session_factory
from app.models import (
    Alarm,
    AlarmSeverity,
    CableType,
    Machine,
    MachineStatus,
    MachineType,
    OrderPriority,
    OrderStatus,
    ProductionOrder,
    Report,
    ReportType,
    User,
    UserRole,
    WorkflowExecution,
    WorkflowExecutionStatus,
    WorkflowStep,
    WorkflowStepKind,
    WorkflowStepStatus,
    WorkflowStepTemplate,
    WorkflowStepType,
    WorkflowTemplate,
)

DEFAULT_PASSWORD = "CableSim123!"


async def seed() -> None:
    async with async_session_factory() as session:
        existing = await session.execute(select(User).limit(1))
        if existing.scalar_one_or_none():
            print("Database already seeded — skipping.")
            return

        admin = User(
            id=uuid.uuid4(),
            email="admin@cablesim.local",
            username="admin",
            hashed_password=hash_password(DEFAULT_PASSWORD),
            full_name="System Administrator",
            role=UserRole.admin,
        )
        supervisor = User(
            id=uuid.uuid4(),
            email="supervisor@cablesim.local",
            username="supervisor",
            hashed_password=hash_password(DEFAULT_PASSWORD),
            full_name="Line Supervisor",
            role=UserRole.supervisor,
        )
        operator = User(
            id=uuid.uuid4(),
            email="operator@cablesim.local",
            username="operator",
            hashed_password=hash_password(DEFAULT_PASSWORD),
            full_name="Floor Operator",
            role=UserRole.operator,
        )
        viewer = User(
            id=uuid.uuid4(),
            email="viewer@cablesim.local",
            username="viewer",
            hashed_password=hash_password(DEFAULT_PASSWORD),
            full_name="Read-only Viewer",
            role=UserRole.operator,
        )
        session.add_all([admin, supervisor, operator, viewer])

        cable_types = [
            CableType(code="XLPE-11KV", name="11kV XLPE Power Cable", description="Medium voltage XLPE insulated cable"),
            CableType(code="PVC-1KV", name="1kV PVC Control Cable", description="Low voltage control cable"),
            CableType(code="FIBER-24C", name="24-Core Fiber Optic", description="Single-mode fiber bundle"),
            CableType(code="COAX-RG6", name="RG6 Coaxial", description="Broadband coaxial cable"),
            CableType(code="FIRE-LSZH", name="LSZH Fire-Resistant", description="Low smoke zero halogen"),
            CableType(code="SUBSEA-33KV", name="33kV Subsea Cable", description="Subsea power transmission"),
        ]
        session.add_all(cable_types)
        await session.flush()

        machines = [
            Machine(code="EXT-01", name="Extruder Line 1", machine_type=MachineType.extruder, status=MachineStatus.running, location="Hall A", capacity_m_per_min=12.5),
            Machine(code="STR-01", name="Stranding Unit 1", machine_type=MachineType.strander, status=MachineStatus.idle, location="Hall A", capacity_m_per_min=18.0),
            Machine(code="ARM-01", name="Armoring Line", machine_type=MachineType.armoring, status=MachineStatus.idle, location="Hall B", capacity_m_per_min=10.0),
            Machine(code="JKT-01", name="Jacketing Line 1", machine_type=MachineType.jacketing, status=MachineStatus.running, location="Hall B", capacity_m_per_min=15.0),
            Machine(code="CAP-01", name="Capstan Puller", machine_type=MachineType.capstan, status=MachineStatus.idle, location="Hall C", capacity_m_per_min=25.0),
            Machine(code="TST-01", name="High Voltage Tester", machine_type=MachineType.tester, status=MachineStatus.idle, location="QC Lab", capacity_m_per_min=8.0),
            Machine(code="SPL-01", name="Spooler 1", machine_type=MachineType.spooler, status=MachineStatus.running, location="Hall C", capacity_m_per_min=20.0),
            Machine(code="EXT-02", name="Extruder Line 2", machine_type=MachineType.extruder, status=MachineStatus.maintenance, location="Hall A", capacity_m_per_min=11.0),
        ]
        session.add_all(machines)
        await session.flush()

        machine_by_code = {m.code: m for m in machines}

        template = WorkflowTemplate(
            cable_type_id=cable_types[0].id,
            name="Standard XLPE Production",
            description="Default workflow for 11kV XLPE cables",
            version=1,
            is_active=True,
            entry_step_key="extrusion",
        )
        session.add(template)
        await session.flush()

        template_steps = [
            WorkflowStepTemplate(template_id=template.id, step_key="extrusion", name="Extrusion", step_kind=WorkflowStepKind.process, step_type=WorkflowStepType.extrusion, machine_id=machine_by_code["EXT-01"].id, sequence_order=1, planned_duration_min=45, routing={"default_next": "stranding"}),
            WorkflowStepTemplate(template_id=template.id, step_key="stranding", name="Stranding", step_kind=WorkflowStepKind.process, step_type=WorkflowStepType.stranding, machine_id=machine_by_code["STR-01"].id, sequence_order=2, planned_duration_min=30, routing={"default_next": "jacketing"}),
            WorkflowStepTemplate(template_id=template.id, step_key="jacketing", name="Jacketing", step_kind=WorkflowStepKind.process, step_type=WorkflowStepType.jacketing, machine_id=machine_by_code["JKT-01"].id, sequence_order=3, planned_duration_min=35, routing={"default_next": "testing"}),
            WorkflowStepTemplate(template_id=template.id, step_key="testing", name="HV Testing", step_kind=WorkflowStepKind.quality_inspection, step_type=WorkflowStepType.testing, machine_id=machine_by_code["TST-01"].id, sequence_order=4, planned_duration_min=20, routing={"default_next": "spooling"}),
            WorkflowStepTemplate(template_id=template.id, step_key="spooling", name="Spooling", step_kind=WorkflowStepKind.completion, step_type=WorkflowStepType.spooling, machine_id=machine_by_code["SPL-01"].id, sequence_order=5, planned_duration_min=15, routing={}),
        ]
        session.add_all(template_steps)

        orders_data = [
            ("PO-2026-001", cable_types[0], 5000, OrderStatus.in_progress, OrderPriority.high),
            ("PO-2026-002", cable_types[1], 2500, OrderStatus.scheduled, OrderPriority.normal),
            ("PO-2026-003", cable_types[2], 1200, OrderStatus.completed, OrderPriority.normal),
            ("PO-2026-004", cable_types[4], 800, OrderStatus.draft, OrderPriority.low),
            ("PO-2026-005", cable_types[5], 10000, OrderStatus.in_progress, OrderPriority.urgent),
        ]

        for order_number, cable, qty, status, priority in orders_data:
            order = ProductionOrder(
                order_number=order_number,
                cable_type_id=cable.id,
                created_by_user_id=admin.id,
                quantity_m=qty,
                status=status,
                priority=priority,
                requested_delivery_date=date.today() + timedelta(days=14),
                started_at=datetime.now(UTC) if status == OrderStatus.in_progress else None,
                completed_at=datetime.now(UTC) if status == OrderStatus.completed else None,
            )
            session.add(order)
            await session.flush()

            execution = WorkflowExecution(
                production_order_id=order.id,
                template_id=template.id,
                status=WorkflowExecutionStatus.running if status == OrderStatus.in_progress else WorkflowExecutionStatus.pending,
                current_step_key="extrusion" if status == OrderStatus.in_progress else None,
                context={},
            )
            session.add(execution)
            await session.flush()

            step_defs = [
                ("extrusion", "process", "extrusion", "EXT-01", 45, WorkflowStepStatus.in_progress if status == OrderStatus.in_progress else WorkflowStepStatus.pending),
                ("stranding", "process", "stranding", "STR-01", 30, WorkflowStepStatus.pending),
                ("jacketing", "process", "jacketing", "JKT-01", 35, WorkflowStepStatus.pending),
                ("testing", "quality_inspection", "testing", "TST-01", 20, WorkflowStepStatus.pending),
                ("spooling", "completion", "spooling", "SPL-01", 15, WorkflowStepStatus.pending),
            ]
            for seq, (key, kind, stype, mcode, duration, step_status) in enumerate(step_defs, start=1):
                session.add(
                    WorkflowStep(
                        production_order_id=order.id,
                        execution_id=execution.id,
                        machine_id=machine_by_code[mcode].id,
                        step_key=key,
                        step_kind=kind,
                        sequence_order=seq,
                        step_type=stype,
                        status=step_status if status != OrderStatus.completed else WorkflowStepStatus.completed,
                        planned_duration_min=duration,
                        actual_duration_min=duration * 0.95 if status == OrderStatus.completed else None,
                    )
                )

        report = Report(
            production_order_id=order.id,
            generated_by_user_id=supervisor.id,
            report_type=ReportType.production_summary,
            title="Weekly Production Summary",
            summary="Plant OEE 78.4% with 2 active lines",
            content={
                "oee": {"plant": {"availability_pct": 88.5, "performance_pct": 91.2, "quality_pct": 96.8, "oee_pct": 78.4}},
                "daily_production": [{"date": date.today().isoformat(), "total_produced_m": 3200, "orders_completed": 1}],
                "machine_utilization": [{"code": "EXT-01", "utilization_pct": 82, "run_hours": 6.5}],
            },
            generated_at=datetime.now(UTC),
        )
        session.add(report)

        alarms = [
            Alarm(machine_id=machine_by_code["EXT-02"].id, severity=AlarmSeverity.warning, code="MAINT-001", message="Scheduled maintenance in progress"),
            Alarm(machine_id=machine_by_code["EXT-01"].id, severity=AlarmSeverity.info, code="TEMP-001", message="Barrel temperature nominal"),
            Alarm(severity=AlarmSeverity.critical, code="SYS-001", message="Backup power test required"),
        ]
        session.add_all(alarms)

        await session.commit()
        print("Database seeded successfully.")
        print(f"Default login: admin@cablesim.local / {DEFAULT_PASSWORD}")


def main() -> None:
    asyncio.run(seed())


if __name__ == "__main__":
    main()
