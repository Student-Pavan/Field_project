from pydantic import BaseModel, ConfigDict, Field


class CableTypeBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    name: str


class CableTypeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    name: str
    description: str | None


class MachineBrief(BaseModel):
    id: str
    code: str
    name: str
    machine_type: str


class MachineResponse(BaseModel):
    id: str
    code: str
    name: str
    machine_type: str
    status: str
    location: str
    capacity_m_per_min: str
    is_active: bool
    description: str | None
    created_at: str
    updated_at: str


class ProductionOrderResponse(BaseModel):
    id: str
    order_number: str
    cable_type_id: str
    created_by_user_id: str
    quantity_m: int
    status: str
    priority: str
    requested_delivery_date: str | None
    started_at: str | None
    completed_at: str | None
    notes: str | None
    created_at: str
    updated_at: str
    cable_type: CableTypeBrief | None = None


class WorkflowStepResponse(BaseModel):
    id: str
    production_order_id: str
    step_key: str | None
    step_kind: str | None
    sequence_order: int
    step_type: str | None
    status: str
    outcome: str | None
    planned_duration_min: str
    actual_duration_min: str | None
    inspection_result: dict | None
    rework_attempt: int
    machine: MachineBrief | None = None


class WorkflowExecutionResponse(BaseModel):
    id: str
    production_order_id: str
    template_id: str
    status: str
    current_step_key: str | None
    context: dict
    started_at: str | None
    completed_at: str | None
    steps: list[WorkflowStepResponse]


class RoutingCondition(BaseModel):
    field: str
    op: str
    value: object | None = None


class RoutingRule(BaseModel):
    condition: RoutingCondition
    next: str


class StepRouting(BaseModel):
    default_next: str | None = None
    routes: list[RoutingRule] = Field(default_factory=list)


class WorkflowStepTemplateCreate(BaseModel):
    step_key: str
    name: str
    step_kind: str
    step_type: str | None = None
    machine_id: str | None = None
    sequence_order: int
    planned_duration_min: float
    parameters: dict | None = None
    routing: StepRouting = Field(default_factory=StepRouting)


class WorkflowStepTemplateResponse(BaseModel):
    id: str
    template_id: str
    step_key: str
    name: str
    step_kind: str
    step_type: str | None
    machine_id: str | None
    sequence_order: int
    planned_duration_min: str
    parameters: dict | None
    routing: dict
    machine: MachineBrief | None = None


class WorkflowTemplateCreate(BaseModel):
    cable_type_id: str
    name: str
    description: str | None = None
    version: int = 1
    is_active: bool = True
    entry_step_key: str
    steps: list[WorkflowStepTemplateCreate]


class WorkflowTemplateResponse(BaseModel):
    id: str
    cable_type_id: str
    name: str
    description: str | None
    version: int
    is_active: bool
    entry_step_key: str
    created_at: str
    updated_at: str
    steps: list[WorkflowStepTemplateResponse]


class ReportContent(BaseModel):
    period: dict | None = None
    daily_production: list[dict] | None = None
    machine_utilization: list[dict] | None = None
    downtime: list[dict] | None = None
    rejected_cables: list[dict] | None = None
    cycle_time: list[dict] | None = None
    oee: dict | None = None


class ReportResponse(BaseModel):
    id: str
    production_order_id: str
    generated_by_user_id: str
    report_type: str
    title: str
    summary: str | None
    content: dict
    generated_at: str


class GenerateReportRequest(BaseModel):
    date_from: str
    date_to: str
    production_order_id: str | None = None
    title: str | None = None


class MachineLiveStatus(BaseModel):
    machine_kind: str
    code: str
    name: str
    status: str
    maintenance_mode: bool = False
    queue_length: int = 0
    queue_capacity: int = 10
    failure_probability: float | None = None
    jobs_processed: int = 0
    failure_count: int = 0
    sequence_order: int = 0
    sim_time: float | None = None


class SimulationSessionResponse(BaseModel):
    session_id: str
    production_order_id: str
    order_number: str
    quantity_m: int | None = None
    speed_multiplier: float = 1.0
    status: str
    progress_pct: float
    sim_time: float
    error_message: str | None = None
    machines: list[MachineLiveStatus] = Field(default_factory=list)


class SimulationStartRequest(BaseModel):
    production_order_id: str
    speed_multiplier: float = 1.0
    random_seed: int | None = None


class SimulationSpeedRequest(BaseModel):
    speed_multiplier: float = Field(ge=0.1, le=10.0)
