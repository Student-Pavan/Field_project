import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.simulation.manager import simulation_manager
from app.websockets.manager import ws_manager

router = APIRouter()


@router.websocket("/ws/simulations/{session_id}")
async def simulation_websocket(websocket: WebSocket, session_id: str) -> None:
    await ws_manager.connect(session_id, websocket)

    session = simulation_manager.get_session(session_id)
    if session:
        snapshot = simulation_manager._to_response(session)
        await websocket.send_json(
            {
                "type": "snapshot",
                "session_id": snapshot.session_id,
                "production_order_id": snapshot.production_order_id,
                "order_number": snapshot.order_number,
                "progress_pct": snapshot.progress_pct,
                "sim_time": snapshot.sim_time,
                "speed_multiplier": snapshot.speed_multiplier,
                "status": snapshot.status,
                "quantity_m": snapshot.quantity_m,
                "machines": [m.model_dump() for m in snapshot.machines],
            }
        )

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                continue
            await simulation_manager.handle_ws_command(session_id, message)
    except WebSocketDisconnect:
        await ws_manager.disconnect(session_id, websocket)
