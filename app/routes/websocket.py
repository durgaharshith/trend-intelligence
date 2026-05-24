"""
WebSocket endpoint for real-time trend push.
Secured with JWT authentication query token check.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.cache import cache
import logging
import asyncio

logger = logging.getLogger(__name__)
router = APIRouter()


class ConnectionManager:
    def __init__(self) -> None:
        # Mapping from WebSocket connection to user_id
        self.active_connections: dict[WebSocket, int] = {}

    async def connect(self, websocket: WebSocket, user_id: int) -> None:
        await websocket.accept()
        self.active_connections[websocket] = user_id
        logger.info(f"WS client connected (User {user_id}) — total: {len(self.active_connections)}")
        if len(self.active_connections) == 1:
            try:
                from app.scheduler import resume_polling, trigger_immediate_poll
                resume_polling()
                trigger_immediate_poll()
            except Exception as e:
                logger.error(f"Failed to resume/trigger polling on WS connect: {e}")

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            del self.active_connections[websocket]
        logger.info(f"WS client disconnected — total: {len(self.active_connections)}")
        if len(self.active_connections) == 0:
            try:
                from app.scheduler import pause_polling
                pause_polling()
            except Exception as e:
                logger.error(f"Failed to pause polling on WS disconnect: {e}")

    async def broadcast(self, message: dict) -> None:
        """Broadcast to all connected clients; prune stale connections."""
        stale = []
        for connection in list(self.active_connections.keys()):
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send WS message — marking stale: {e}")
                stale.append(connection)

        for conn in stale:
            self.disconnect(conn)


manager = ConnectionManager()


@router.websocket("/ws/trends")
async def websocket_endpoint(websocket: WebSocket, token: str = None) -> None:
    if not token:
        logger.warning("WS connection rejected: missing token query param")
        await websocket.close(code=1008)  # Policy Violation
        return

    try:
        from app.services.auth_service import decode_token
        user_info = decode_token(token)
        user_id = user_info["user_id"]
    except Exception as e:
        logger.warning(f"WS connection rejected: invalid token: {e}")
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, user_id)
    try:
        # Send current trends immediately on connect
        trends = await cache.get("current_trends")
        if trends:
            await websocket.send_json({"type": "initial", "trends": trends})

        # Subscribe to Redis pub/sub for live updates
        pubsub = await cache.subscribe("trend_updates")

        if pubsub:
            # Redis available — push updates in real-time
            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True)
                if message and message.get("type") == "message":
                    try:
                        data = message["data"]
                        await websocket.send_json({"type": "update", "trend": data})
                    except Exception as e:
                        logger.info(f"WS send failed (client disconnected) — closing connection: {e}")
                        raise WebSocketDisconnect()

                await asyncio.sleep(1)
        else:
            # Fallback: Redis unavailable — poll cache every 30s and push snapshot
            while True:
                await asyncio.sleep(30)
                trends = await cache.get("current_trends")
                if trends:
                    await websocket.send_json({"type": "snapshot", "trends": trends[:10]})

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        manager.disconnect(websocket)
