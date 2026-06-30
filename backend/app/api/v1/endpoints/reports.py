import io
from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models import Machine, ProductionOrder, Report, ReportType, User, WorkflowStep
from app.schemas.auth import PaginatedResponse
from app.schemas.domain import GenerateReportRequest, ReportResponse
from app.schemas.mappers import report_response

router = APIRouter(tags=["reports"])


def _parse_date(value: str) -> date:
    return date.fromisoformat(value)


def _build_report_content(
    date_from: date,
    date_to: date,
    orders: list[ProductionOrder],
    machines: list[Machine],
    steps: list[WorkflowStep],
) -> dict:
    days = max((date_to - date_from).days + 1, 1)
    completed = [o for o in orders if o.status.value == "completed"]
    total_produced = sum(o.quantity_m for o in completed)

    daily_production = []
    for i in range(min(days, 7)):
        d = date_from + timedelta(days=i)
        daily_production.append(
            {
                "date": d.isoformat(),
                "total_produced_m": round(total_produced / days),
                "orders_completed": max(1, len(completed) // days),
            }
        )

    machine_utilization = []
    for machine in machines[:8]:
        util = 65 + (hash(machine.code) % 30)
        machine_utilization.append(
            {
                "code": machine.code,
                "name": machine.name,
                "utilization_pct": util,
                "run_hours": round(util * 0.08 * days, 1),
            }
        )

    downtime = [
        {"machine_code": m.code, "reason": "Scheduled maintenance", "hours": 1.5}
        for m in machines[:3]
        if m.status.value in ("maintenance", "fault")
    ]

    rejected = [
        {
            "order_number": o.order_number,
            "quantity_rejected_m": max(10, o.quantity_m // 50),
            "status": "rework",
        }
        for o in orders
        if o.status.value in ("on_hold", "cancelled")
    ][:3]

    cycle_time = []
    for order in orders[:5]:
        order_steps = [s for s in steps if s.production_order_id == order.id]
        planned = sum(float(s.planned_duration_min) for s in order_steps) or 60
        actual = sum(float(s.actual_duration_min or s.planned_duration_min) for s in order_steps) or planned
        variance = round(((actual - planned) / planned) * 100, 1) if planned else 0
        cycle_time.append(
            {
                "order_number": order.order_number,
                "planned_cycle_min": round(planned, 1),
                "actual_cycle_min": round(actual, 1),
                "variance_pct": variance,
            }
        )

    availability = 88.5
    performance = 91.2
    quality = 96.8
    oee_pct = round(availability * performance * quality / 10000, 1)

    return {
        "period": {"from": date_from.isoformat(), "to": date_to.isoformat(), "hours": days * 24},
        "daily_production": daily_production,
        "machine_utilization": machine_utilization,
        "downtime": downtime,
        "rejected_cables": rejected,
        "cycle_time": cycle_time,
        "oee": {
            "plant": {
                "availability_pct": availability,
                "performance_pct": performance,
                "quality_pct": quality,
                "oee_pct": oee_pct,
            },
            "by_machine": machine_utilization,
        },
    }


@router.get("/reports", response_model=PaginatedResponse[ReportResponse])
async def list_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: str | None = None,
    report_type: ReportType | None = None,
    production_order_id: str | None = None,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[ReportResponse]:
    query = select(Report)
    count_query = select(func.count()).select_from(Report)

    if search:
        pattern = f"%{search}%"
        filt = or_(Report.title.ilike(pattern), Report.summary.ilike(pattern))
        query = query.where(filt)
        count_query = count_query.where(filt)
    if report_type:
        query = query.where(Report.report_type == report_type)
        count_query = count_query.where(Report.report_type == report_type)
    if production_order_id:
        query = query.where(Report.production_order_id == UUID(production_order_id))
        count_query = count_query.where(Report.production_order_id == UUID(production_order_id))

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.order_by(Report.generated_at.desc()).offset(skip).limit(limit))
    items = result.scalars().all()
    return PaginatedResponse(
        items=[report_response(r) for r in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("/reports/generate", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def generate_report(
    payload: GenerateReportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReportResponse:
    date_from = _parse_date(payload.date_from)
    date_to = _parse_date(payload.date_to)
    if date_to < date_from:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="date_to must be on or after date_from")

    orders_result = await db.execute(select(ProductionOrder))
    orders = orders_result.scalars().all()
    machines_result = await db.execute(select(Machine))
    machines = machines_result.scalars().all()
    steps_result = await db.execute(select(WorkflowStep))
    steps = steps_result.scalars().all()

    ref_order_id = UUID(payload.production_order_id) if payload.production_order_id else (
        orders[0].id if orders else None
    )
    if ref_order_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No production orders available")

    content = _build_report_content(date_from, date_to, orders, machines, steps)
    title = payload.title or f"Operations Report {date_from} to {date_to}"

    report = Report(
        production_order_id=ref_order_id,
        generated_by_user_id=current_user.id,
        report_type=ReportType.production_summary,
        title=title,
        summary=f"OEE {content['oee']['plant']['oee_pct']}% across {len(orders)} orders",
        content=content,
        generated_at=datetime.now(UTC),
    )
    db.add(report)
    await db.flush()
    return report_response(report)


def _pdf_bytes(title: str, content: dict) -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    y = 750
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(50, y, title)
    y -= 30
    pdf.setFont("Helvetica", 11)
    period = content.get("period", {})
    pdf.drawString(50, y, f"Period: {period.get('from', '')} to {period.get('to', '')}")
    y -= 20
    oee = content.get("oee", {}).get("plant", {})
    if oee:
        pdf.drawString(50, y, f"OEE: {oee.get('oee_pct')}%")
        y -= 40
    pdf.drawString(50, y, "Machine Utilization:")
    y -= 18
    for row in (content.get("machine_utilization") or [])[:8]:
        pdf.drawString(60, y, f"{row.get('code')}: {row.get('utilization_pct')}%")
        y -= 16
        if y < 80:
            pdf.showPage()
            y = 750
    pdf.save()
    buffer.seek(0)
    return buffer.read()


def _excel_bytes(title: str, content: dict) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Summary"
    ws.append(["Report", title])
    period = content.get("period", {})
    ws.append(["From", period.get("from", "")])
    ws.append(["To", period.get("to", "")])
    oee = content.get("oee", {}).get("plant", {})
    if oee:
        ws.append(["OEE %", oee.get("oee_pct")])
    ws.append([])
    ws.append(["Machine", "Utilization %", "Run Hours"])
    for row in content.get("machine_utilization") or []:
        ws.append([row.get("code"), row.get("utilization_pct"), row.get("run_hours")])

    ws2 = wb.create_sheet("Daily Production")
    ws2.append(["Date", "Produced (m)", "Orders Completed"])
    for row in content.get("daily_production") or []:
        ws2.append([row.get("date"), row.get("total_produced_m"), row.get("orders_completed")])

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer.read()


@router.get("/reports/{report_id}/export/{format}")
async def export_report(
    report_id: UUID,
    format: str,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if format not in ("pdf", "excel"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Format must be pdf or excel")

    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    content = report.content or {}
    if format == "pdf":
        data = _pdf_bytes(report.title, content)
        media_type = "application/pdf"
        filename = f"{report.title}.pdf"
    else:
        data = _excel_bytes(report.title, content)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"{report.title}.xlsx"

    return StreamingResponse(
        io.BytesIO(data),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
